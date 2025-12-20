from flask import Flask, request, jsonify, session, render_template, redirect, url_for, flash, Response , send_from_directory
from services import firebase_service, upload
from firebase_admin import auth, messaging
import ocr_test
import os
from werkzeug.utils import secure_filename
from datetime import datetime,timedelta
import pytz
import threading
import json
cron_running = False

# Initialize Flask
app = Flask(__name__)
app.secret_key = "supersecretkey"  # change this before deployment
app.config.update(
    SESSION_COOKIE_SECURE=True,        # REQUIRED on HTTPS (Vercel)
    SESSION_COOKIE_HTTPONLY=True,      # Security
    SESSION_COOKIE_SAMESITE="None",    # REQUIRED for mobile Chrome
    PERMANENT_SESSION_LIFETIME=timedelta(days=7)
)

# Routes
@app.route('/')

def home():
    if 'user' in session:
       
        return render_template("home.html", user=session['user'])

    return render_template("home.html")
@app.route('/hydration',methods=["GET","POST"])
def hydration():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    return render_template("HYDRATION.html", user=session['user'])  


@app.route('/about')
def about():
    return render_template("aboutus.html", user=session['user'] if 'user' in session else None)
@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    
    return render_template("dashboard.html", user=session['user'])
@app.route('/profile')
def profile():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    
    email = session['user']['email']
    user_data = firebase_service.get_user(email)
    
    # Update session while we are here to keep it fresh
    if user_data:
        session['user'] = user_data
    return render_template("profilepage_copy.html", user=user_data)    
@app.route('/update_profile', methods=['POST'])
def update_profile():
    if 'user' not in session:
        return redirect('/')

    print("--- UPDATE PROFILE STARTED ---") # Debug 1

    email = session['user']['email']
    
    # 1. Collect Text Data
    updates = {
        "username": request.form.get('username'),
        "age": request.form.get('age'),
        "gender": request.form.get('gender'),
        "emergency_contact": request.form.get('emergency_contact')
    }

    # 2. Check for File
    print(f"Files in request: {request.files}") # Debug 2
    
    if 'profile_pic' in request.files:
        
        profile_pic = request.files.get("profile_pic")

        if profile_pic and profile_pic.filename:
            filename = secure_filename(profile_pic.filename)

            # UPLOAD TO IMAGEKIT
            try:
                image_url = upload.upload_document(profile_pic, filename)
                updates["photo_url"] = image_url
            except Exception as e:
                print("ImageKit upload failed:", e)
                flash("Profile picture could not be uploaded.")
                return redirect("/profile")
    
    # 3. Update Firestore
    firebase_service.update_user(email, updates)

    # 4. Refresh Session
    updated_user = firebase_service.get_user(email)
    session['user'] = updated_user
    session.modified = True
    
    print("--- UPDATE FINISHED ---")
    return redirect('/profile')
@app.route('/getstarted')
def getstarted():
    return render_template("getstarted.html")
# ---------- EMAIL LOGIN (PYTHON ONLY) ----------

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"success": False, "error": "Missing token"}), 400

    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as e:
        print("Token verification error:", e)
        return jsonify({"success": False, "error": "Invalid token"}), 401

    email = decoded.get("email")
    name = decoded.get("name") or email.split("@")[0]
    uid = decoded.get("uid")

    # Check / create user document in Firestore (no password)
    user = firebase_service.get_user(email)
    if not user:
        firebase_service.add_user(email=email, username=name)
        user_data = {"email": email, "username": name, "photo_url": decoded.get("picture", "https://ik.imagekit.io/RemediRX/pngwing.com.png?updatedAt=1764494288724"),"fcm_enabled": False}

    session.permanent = True
    session["user"] = user_data
    return jsonify({"success": True})


# ---------- GOOGLE LOGIN (CALLED BY JS) ----------

@app.route("/google-login", methods=["POST"])
def google_login():
    data = request.get_json()
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"success": False, "error": "Missing token"}), 400

    try:
        decoded = auth.verify_id_token(id_token)
    except Exception as e:
        print("Token verification error:", e)
        return jsonify({"success": False, "error": "Invalid token"}), 401

    email = decoded.get("email")
    name = decoded.get("name") or email.split("@")[0]

    # Check if user exists in Firestore; if not, create
    user_data = firebase_service.get_user(email)
    if not user_data:
        photo=decoded.get("picture", "https://ik.imagekit.io/RemediRX/pngwing.com.png?updatedAt=1764494288724")
        firebase_service.add_user(email=email, username=name,photo_url=photo)
        user_data = {"email": email, "username": name, "photo_url": photo,"fcm_enabled": False}

    session.permanent = True
    session["user"] = user_data    

    return jsonify({"success": True})

@app.route("/firebase-config.js")
def firebase_config_js():
    config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY"),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.environ.get("FIREBASE_APP_ID")
    }

    js = f"self.FIREBASE_CONFIG = {json.dumps(config)};"
    return Response(js, mimetype="application/javascript")

@app.route('/api/get_firebase_config', methods=['GET'])
def get_firebase_config():
    firebase_config = {
        "apiKey": os.environ.get("FIREBASE_API_KEY"),
        "authDomain": os.environ.get("FIREBASE_AUTH_DOMAIN"),
        "projectId": os.environ.get("FIREBASE_PROJECT_ID"),
        "storageBucket": os.environ.get("FIREBASE_STORAGE_BUCKET"),
        "messagingSenderId": os.environ.get("FIREBASE_MESSAGING_SENDER_ID"),
        "appId": os.environ.get("FIREBASE_APP_ID"),
        "vapidKey": os.environ.get("FIREBASE_VAPID_KEY")
    }
    return jsonify(firebase_config)
@app.route('/api/upload_image', methods=['POST'])
def upload_image():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    if 'image' not in request.files:
        return jsonify({"success": False, "error": "No image provided"}), 400

    image = request.files['image']

    # Use the same helper as profile upload:
    from werkzeug.utils import secure_filename
    filename = secure_filename(image.filename)

    image_url = upload.upload_document(image, filename)  # ✅ pass file object + name

    if not image_url:
        return jsonify({"success": False, "error": "Upload to ImageKit failed"}), 500

    return jsonify({"success": True, "image_url": image_url})

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

# ==========================================
# 1. THE CRON TRIGGER (Fire and Forget)
# ==========================================
@app.route('/check_reminders', methods=['GET'])
def check_reminders_route():
    global cron_running
    # 1. Get India Time
    ist = pytz.timezone('Asia/Kolkata')
    day=datetime.now(ist).strftime('%A')[:3].lower() # e.g., "Monday" --> "mon"
    now_str = datetime.now(ist).strftime('%H:%M') # e.g., "14:30"
    print("CRON HIT:", now_str, day)

    process_background_notifications(now_str,day)  # DIRECT CALL

    print("CRON FINISHED:", now_str)
    return "done", 200
# ==========================================
# 2. BACKGROUND WORKER FUNCTION 
# ==========================================
def process_background_notifications(time_str,day):
    print(f"🧵 Thread working at: {time_str} on {day}")
    
    try:
        # Query Firestore
        firebase_service._user_token_cache.clear()
        docs=firebase_service.get_schedules_by_time(time_str,day)
        messages = []
       
            # Optimization: Use Batch Sending!
            # Sending 1 by 1 is slow. Sending 500 at a time is fast.
            

        for doc in docs:
                data = doc.to_dict()
                user_id = data["user_id"]

                tokens = firebase_service.get_user_tokens(user_id)
                if not tokens:
                    continue

                for token in tokens:
                    messages.append(
                        messaging.Message(
                            data={
                            "notification_type": "reminder",
                            "schedule_id": doc.id,
                            "user_id": user_id,
                            "food": data.get("food",""),
                            "med_name": data["med_name"],
                            "med_id": data["medicine_id"],
                            },
                            token=token
                        )
                    )
                    # Firebase limit is 500 messages per batch
                    if len(messages) >= 500:
                        send_batch(messages)
                        messages = [] # Reset list

        
        refill_docs=firebase_service.get_due_refill_notifications()
        for doc in refill_docs:
                data = doc.to_dict()
                user_id = doc.reference.parent.parent.id

                tokens = firebase_service.get_user_tokens(user_id)
                if not tokens:
                    continue

                for token in tokens:
                    messages.append(
                        messaging.Message(
                            data={
                            "notification_type": "refill",
                            "medicine_id": data["medicine_id"],
                            "med_name": data["med_name"],
                            "quantity": str(data.get("quantity","0")),
                            },
                            token=token
                        )
                    )
                             

                    # Firebase limit is 500 messages per batch
                    if len(messages) >= 500:
                        send_batch(messages)
                        messages = [] # Reset list
                doc.reference.update({"sent": True})         

        # Send remaining messages
        if messages:
            send_batch(messages)
            

        print(f"✅ Thread finished processing for {time_str}")
        
    except Exception as e:
        print(f"❌ Error in background thread: {e}")

def send_batch(messages):
    try:
        batch_response = messaging.send_each(messages)
        print(f"Sent batch of {batch_response.success_count} messages.")
    except Exception as e:
        print(f"Batch send failed: {e}")
#==============================

@app.route("/save-fcm-token", methods=["POST"])
def save_fcm_token():
    if 'user' not in session:
        return jsonify({"success": False, "error": "Unauthorized"}), 401

    data = request.get_json()
    token = data.get("token")
    email = session['user']['email']

    if not token:
        return jsonify({"success": False, "error": "No token provided"}), 400

    firebase_service.save_token(email, token)
    if 'user' in session:
        # Create a copy, update it, and re-save it
        updated_user = session['user']
        updated_user['fcm_enabled'] = True
        session['user'] = updated_user
        session.modified = True # Tells Flask to save the cookie
        
    return jsonify({"success": True})
#  API for "Take Medicine"
@app.route('/api/mark_taken', methods=['POST'])
def mark_taken_api():
    data = request.json
    # CALL YOUR SERVICE
    result = firebase_service.decrement_inventory_and_log(
        user_id=data['user_id'],
        schedule_id=data['schedule_id']
    )
    return result
@app.route('/notification-action')
def notification_action_page():
    # The HTML will read the URL parameters using JavaScript.
    return render_template('notification_action.html')

@app.route("/firebase-messaging-sw.js")
def sw():
    return send_from_directory("static", "firebase-messaging-sw.js")


# ---------------- PAGES ----------------
@app.route("/view-prescription",methods=["GET","POST"])
def view_prescription():
    return render_template('view_prescription.html',user=session['user'])
@app.route("/addmedicine",methods=["GET","POST"])
def add_medicine_page():
    return render_template("add_medicine.html",user=session['user'])

@app.route("/schedule",methods=["GET","POST"])
def schedule_page():
    return render_template("schedule.html",user=session['user'])

@app.route("/confirmation",methods=["GET","POST"])
def confirmation_page():
    return render_template("confirmation.html",user=session['user'])

# ---------------- API ----------------
@app.route("/api/draft/save", methods=["POST"])
def save_draft():
    user_id = session['user']['email']

    data = request.json
    if not data:
        return {"error": "No data"}, 400

    firebase_service.save_draft(user_id, data)

    return {"status": "draft_saved"}

@app.route("/schedule/edit/<schedule_id>")
def edit_schedule_page(schedule_id):
    if "user" not in session:
        return redirect("/getstarted")

    return render_template(
        "edit_schedule.html",
        schedule_id=schedule_id,user=session['user']
    )
@app.route("/api/schedules/get/<schedule_id>",methods=["GET"])
def get_schedule_for_edit(schedule_id):
    user_id=session['user']['email']
    result=firebase_service.get_schedule_for_edit(user_id,schedule_id)
    return result
@app.route("/api/schedules/update/<schedule_id>", methods=["POST"])
def update_schedule(schedule_id):
    user_id = session['user']['email']
    data = request.json

    if not data:
        return {"error": "No data provided"}, 400

    firebase_service.update_schedule(user_id, schedule_id, data)

    return {"status": "schedule_updated"}


@app.route("/api/draft/load", methods=["GET"])
def load_draft():
    user_id = session['user']['email']
    if not user_id:
        return {"draft": None}

    doc = firebase_service.get_draft(user_id)
    if not doc.exists:
        return {"draft": None}

    return {"draft": doc.to_dict()["data"]}
@app.route('/api/schedules/list', methods=['GET']) 
def list_schedules(): 
    if 'user' not in session: 
        return jsonify({"error": "Unauthorized"}), 401 
    user_id = session['user']['email'] 
    try:  
        schedules = firebase_service.get_schedules(user_id) 
        return jsonify({"schedules": schedules}) 
    except Exception as e: 
        print(f"Error fetching schedules: {e}") 
        return jsonify({"error": "Failed to fetch schedules"}), 500   

@app.route('/schedules')
def view_schedules():
    if 'user' not in session:
        return redirect(url_for('getstarted'))
    return render_template("view_schedules.html", user=session['user'])

@app.route('/api/schedules/delete/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user']['email']
    firebase_service.delete_schedule(user_id, schedule_id)
    return jsonify({"status": "success"})
@app.route('/api/prescriptions/delete/<pres_id>', methods=['DELETE'])
def delete_prescription(pres_id):
    if 'user' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    user_id = session['user']['email']
    firebase_service.delete_prescription(user_id, pres_id)
    return jsonify({"status": "success"}),200

@app.route("/refill-alert")
def refill_alert_page():
    if 'user' not in session:
        return redirect('/getstarted')
    return render_template("refill_alert.html", user=session['user'])
@app.route("/api/refill_medicine", methods=["POST"])
def refill_medicine():
    user_id = session['user']['email']
    data = request.json
    firebase_service.refill_medicine(user_id,data)
    

    return jsonify({"status": "success"}),200


@app.route("/api/activate", methods=["POST"])
def activate():
    user_id = session['user']['email']

    draft_doc = firebase_service.get_draft(user_id)
    if not draft_doc.exists:
        return {"error": "No draft found"}, 400

    data = draft_doc.to_dict()["data"]
    items=data['medicines']
    for item in items:
        # 1️⃣ Save medicine
        med_id = firebase_service.save_medicine(user_id, item["medicine"])

        # 2️⃣ Save schedule (linked)
        firebase_service.save_schedule(
            user_id=user_id,
            food=item["medicine"]["food"],
            med_name=item["medicine"]["name"],
            medicine_id=med_id,
            schedule_data=item["schedule"]
        )

    # 3️⃣ Clear draft
    firebase_service.delete_draft(user_id)

    return {"status": "activated"}

@app.route("/api/confirmation/data")
def confirmation_data():
    user_id = session['user']['email']
    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    return jsonify(firebase_service.get_confirmation_data(user_id))


@app.route('/api/fill_from_prescription', methods=['POST'])
def fill_from_prescription():
    # 1. Get URL from the frontend request
    data = request.json
    image_url = data.get('image_url')

    if not image_url:
        return jsonify({"error": "No URL provided"}), 400

    # 2. Run the functional OCR script
    extracted_data = ocr_test.extract_medicines(image_url)

    if not extracted_data:
        return jsonify({"error": "Could not read prescription"}), 500

    # 3. TRANSFORM Data to match 'add_medicine_copy.js' structure
    # This aligns the AI output with your Frontend logic (renderMedicineCard)
    
    formatted_draft = []
    
    # Map AI "Time Strings" to "Time Values" for your checkboxes
    time_mapping = {
        "Morning": "08:00",
        "Afternoon": "13:00",
        "Evening": "18:00",
        "Night": "22:00"
    }

    for item in extracted_data:
        # Build the 'tod_selection' map that JS uses to check boxes
        tod_selection = {}
        ai_times = item.get('times', []) # e.g., ["Morning", "Night"]
        
        for t in ai_times:
            clean_t = t.capitalize()
            if clean_t in time_mapping:
                tod_selection[clean_t] = time_mapping[clean_t]

        # Construct the exact object JS expects
        med_entry = {
            "medicine": {
                "name": item.get('name', ''),
                "dosage": item.get('dosage', ''),
                "quantity": item.get('quantity', 10),
                "medium": item.get('medium', 'Tablet'),
                "food": item.get('food', 'No preference'),
                "notes": item.get('notes', '')
            },
            "schedule": {
                "start_date": "", # Leave empty for user to pick
                "duration_days": item.get('duration_days', 7),
                "days": ["sun", "mon", "tue", "wed", "thu", "fri", "sat"], # Default to daily
                "times": list(tod_selection.values()), # ["08:00", "22:00"]
                "tod_selection": tod_selection,        # {"Morning": "08:00", "Night": "22:00"}
                "quantity_per_dose": item.get('quantity_per_dose', 1),
                "reminder_enabled": True
            }
        }
        formatted_draft.append(med_entry)

    user_id = session['user']['email']
    draft_payload = {"medicines": formatted_draft}
    firebase_service.save_draft(user_id, draft_payload)

    # 5. Tell Frontend to redirect
    return jsonify({
        "success": True, 
        "redirect_url": "/addmedicine" # URL to your add_medicine page
    }),200

@app.route('/upload-prescription')
def test_ocr_page():
    return render_template("upload_prescription.html",user=session['user'])

@app.route('/api/upload_prescription', methods=['POST'])
def upload_prescription():
    file = request.files['file']
    filename = secure_filename(file.filename)
    
    image_url = None

    # 1. HANDLE PDF
    if filename.lower().endswith('.pdf'):
        # Convert PDF -> PIL
        pil_image = upload.convert_pdf_to_pil(file)
        
        if pil_image:
            # Change filename extension to .jpg
            new_filename = filename.rsplit('.', 1)[0] + ".jpg"
            # Upload using the new PIL function
            image_url = upload.upload_pil_image(pil_image, new_filename)
    
    # 2. HANDLE STANDARD IMAGE
    else:
        # Standard upload
        image_url = upload.upload_document(file, filename)

    if not image_url:
        return jsonify({"error": "Upload failed"}), 500

    user_id = session['user']['email']
    firebase_service.upload_prescription(user_id,image_url)
    return jsonify({"success":True}), 200
@app.route('/api/prescriptions/list',methods=['GET'])
def list_prescriptions():
    user_id = session['user']['email']
    prescriptions = firebase_service.list_prescriptions(user_id)
    return jsonify({"prescriptions": prescriptions})

@app.route('/remove-fcm-token',methods=['GET','POST'])
def removefcm():
    # silent=True prevents crashing if header is missing
    data = request.get_json(silent=True) or {} 
    token = data.get("token")
    user_id=session['user']['email']
    if token:
        firebase_service.remove_fcm_token(token)
        return jsonify({"status": "removed"}),200
    else:
        return jsonify({"error": "No token provided"}),400

if __name__ == '__main__':
    app.run(debug=True)
