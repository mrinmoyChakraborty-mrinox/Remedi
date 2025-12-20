import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
import os,json
from flask import jsonify
from datetime import datetime, timedelta
import pytz
firebase_creds = os.environ.get("FIREBASE_CONFIG")

if firebase_creds:
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
else:
    # fallback for local dev
    raise Exception("FIREBASE_SERVICE_ACCOUNT environment variable not set")

# Avoid 'app already exists' error if this file is imported more than once
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()


# --- User Functions ---
def add_user(email, username,photo_url):
    user_ref = db.collection("users").document(email)
    user_ref.set({
        "username": username,
        "email": email,
        "created_at": firestore.SERVER_TIMESTAMP,
        "hydration_enabled": False,
        "photo_url":photo_url
    })

def get_user(email):
    return db.collection("users").document(email).get().to_dict()

# --- Medicine Functions ---
def add_medicine(email, medicine_data):
    med_ref = db.collection("users").document(email).collection("medicines").document()
    med_ref.set(medicine_data)
    return med_ref.id

def get_medicines(email):
    meds = db.collection("users").document(email).collection("medicines").stream()
    results = []
    for doc in meds_stream:
        # doc.to_dict() gets the data: {'med_name': 'X', 'qty': 10}
        data = doc.to_dict()
        
        # doc.id gets the document name: '7tEp9...'
        # We inject it into the dictionary so the frontend knows this ID
        data['medicine_id'] = doc.id 
        
        results.append(data)
        
    return results

def update_medicine(email, med_id, data):
    db.collection("users").document(email).collection("medicines").document(med_id).update(data)

def update_user(email, data):
    """
    Updates an existing user document.
    :param email: The user's email (Document ID)
    :param data: A dictionary of fields to update (e.g., {'age': '20', 'gender': 'male'})
    """
    try:
        user_ref = db.collection("users").document(email)
        user_ref.update(data)
        return True
    except Exception as e:
        print(f"Error updating user {email}: {e}")
        return False
def save_token(email, token):
    user_ref = db.collection("users").document(email)
    user_ref.update({
        "fcm_tokens": firestore.ArrayUnion([token])
    })
def remove_fcm_token(token):
    users_ref = db.collection("users")
    query = users_ref.where("fcm_tokens", "array_contains", token).stream()

    for user_doc in query:
        user_ref = users_ref.document(user_doc.id)
        user_ref.update({
            "fcm_tokens": firestore.ArrayRemove([token])
        })


_user_token_cache = {}

def get_user_tokens(user_id):
    """
    Returns list of FCM tokens for a user.
    Uses in-memory cache to avoid repeated reads.
    """
    if user_id in _user_token_cache:
        return _user_token_cache[user_id]

    user_doc = db.collection("users").document(user_id).get()
    if not user_doc.exists:
        _user_token_cache[user_id] = []
        return []

    tokens = user_doc.to_dict().get("fcm_tokens", [])
    _user_token_cache[user_id] = tokens
    return tokens


def get_token(email):
    user_doc = db.collection("users").document(email).get()
    if user_doc.exists:
        user_data = user_doc.to_dict()
        return user_data.get("fcm_token")
    return None
# ---------------------------
# SAVING DRAFT
# ---------------------------
def save_draft(user_id, draft_data):
    doc_ref = db.collection("drafts").document(user_id)
    doc_ref.set({
        "data": draft_data,
        "updated_at": firestore.SERVER_TIMESTAMP
    })
    return True
#-----------------------------
# FETCH DRAFT
#-----------------------------
def get_draft(user_id):
    doc = db.collection("drafts").document(user_id).get()
    if doc.exists:
        return doc
    return {}

#---------------------------
# DELETE DRAFT
#---------------------------
def delete_draft(user_id):
    db.collection("drafts").document(user_id).delete()
    return True
# ---------------------------
# SAVE MEDICINE
# ---------------------------
def save_medicine(user_id, medicine):
    ref = db.collection("users").document(user_id).collection("medicines").document()
    ref.set({
        **medicine,
        "created_at": firestore.SERVER_TIMESTAMP
    })
    return ref.id



# ---------------------------
# SAVE SCHEDULE
# ---------------------------
def save_schedule(user_id, medicine_id, food, med_name,schedule_data):
    db.collection("users").document(user_id).collection("schedules").add({
        "medicine_id": medicine_id,
        "med_name": med_name,
        "food": food,
        "user_id": user_id,
        **schedule_data,
        "is_active": True,
        "created_at": firestore.SERVER_TIMESTAMP
    })


# ---------------------------
# FETCH CONFIRMATION DATA
# ---------------------------
def get_confirmation_data(user_id):
    meds = db.collection("users").document(user_id).collection("medicines").stream()
    schedules = db.collection("users").document(user_id).collection("schedules").stream()

    return {
        "medicines": [{**m.to_dict(), "id": m.id} for m in meds],
        "schedules": [{**s.to_dict(), "id": s.id} for s in schedules],
    }

def decrement_inventory_and_log(user_id, schedule_id):
    if not user_id or not schedule_id:
        return jsonify({"error": "Missing data"}), 400

    # 1. Reference the Schedule to get Medicine Details
    # (Assuming schedule doc is at: users/{uid}/schedules/{schedule_id})
    sched_ref = db.collection('users').document(user_id).collection('schedules').document(schedule_id)
    med_id=sched_ref.get().to_dict().get('medicine_id')
    decrement_quantity=sched_ref.get().to_dict().get('quantity_per_dose',1)
    med_ref=db.collection('users').document(user_id).collection('medicines').document(med_id)
    try:
        # Use a Transaction to safely decrement inventory
        new_quantity = run_inventory_transaction(db.transaction(),med_ref, user_id,decrement_quantity,sched_ref)
        return jsonify({"status": "success", "remaining_quantity": new_quantity})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@firestore.transactional
def run_inventory_transaction(transaction, med_ref, user_id,decrement_quantity,sched_ref):
    # 1. Read the Schedule to find the Medicine Name or Inventory Link
    med_snap = med_ref.get(transaction=transaction)
    if not med_snap.exists:
        raise Exception("schedule not found")
        
    med_data = med_snap.to_dict()
    
    current_qty = med_data.get('quantity', 0)
    med_name = med_data.get('name')

    # 3. Decrement
    if current_qty > 0:
        new_qty = current_qty - decrement_quantity
        if new_qty < 0:
            new_qty = 0
        # AFTER decrement
        if new_qty == 0:
            queue_refill_notification(
                user_id=user_id,
                quantity=new_qty,
                sche_id=sched_ref.id,
                medicine_id=med_ref.id,
                med_name=med_name,
                delay_minutes=10
            )
    
        transaction.update(med_ref, {'quantity': new_qty})
        
        # 4. LOG IT (Create a new document in 'logs')
        try:
            log_ref = db.collection('users').document(user_id).collection('logs').document()
            transaction.get(log_ref)  # Ensure log_ref is included in the transaction
            transaction.set(log_ref, {
                'med_name': med_name,
                'action': 'taken',
                'timestamp': firestore.SERVER_TIMESTAMP,
                'schedule_id': sched_ref.id,
                'quantity_taken': decrement_quantity

            })
        except Exception as e:
            print(f"Error logging medicine action: {e}")    
        
        return new_qty
    else:
        # Stock is 0, just log it anyway but don't decrement
        return 0

def get_schedules(user_id):
    try:
        # Get all schedules
        schedules_ref = db.collection('users').document(user_id).collection('schedules')
        schedules = schedules_ref.stream()
        
        # Get all medicines
        medicines_ref = db.collection('users').document(user_id).collection('medicines')
        medicines = {doc.id: doc.to_dict() for doc in medicines_ref.stream()}
        
        result = []
        for schedule_doc in schedules:
            schedule_data = schedule_doc.to_dict()
            schedule_data['id'] = schedule_doc.id
            
            # Merge medicine details
            medicine_id = schedule_data.get('medicine_id')
            if medicine_id and (medicine_id in medicines):
                medicine = medicines[medicine_id]
                schedule_data['dosage'] = medicine.get('dosage')
                schedule_data['medium'] = medicine.get('medium')
                schedule_data['food'] = medicine.get('food')
                schedule_data['notes'] = medicine.get('notes')
                schedule_data['quantity'] = medicine.get('quantity', 0)
            
            result.append(schedule_data)
        
        return result
    except Exception as e:
        print(f"Error getting schedules: {e}")
        return []

#ADD PRESCRIPTION TO PROFILE
def upload_prescription(user_id,image_url):
    ref=db.collection('users').document(user_id).collection('prescriptions').document()
    ref.set({
        'image_url':image_url,
        'uploaded_at':firestore.SERVER_TIMESTAMP
    })
def list_prescriptions(user_id):
    try:
        prescriptions_ref = db.collection('users').document(user_id).collection('prescriptions')
        prescriptions = prescriptions_ref.stream()
        result = []
        for doc in prescriptions:
            data = doc.to_dict()
            data['id'] = doc.id
            result.append(data)
        return result
    except Exception as e:
        print(f"Error listing prescriptions for user {user_id}: {e}")
        return []            
def delete_prescription(user_id, pres_id):
    try:
        prescription_ref=db.collection('users').document(user_id).collection('prescriptions').document(pres_id)
        prescription_ref.delete()
    except Exception as e:
        print(f"Error deleting prescriptions for user {user_id}: {e}")

def delete_schedule(user_id, schedule_id):
    
    try:
        schedule_ref = db.collection('users').document(user_id).collection('schedules').document(schedule_id)
        med_id= schedule_ref.get().to_dict().get('medicine_id')
        med_ref = db.collection('users').document(user_id).collection('medicines').document(med_id)
        schedule_ref.delete()
        med_ref.delete()
        return True
    except Exception as e:
        print(f"Error deleting schedule {schedule_id}: {e}")
        return False
def get_schedules_by_time(time_str,day):
    docs = db.collection_group('schedules').where('times', 'array_contains', time_str).stream()
    valid_docs = []
    
    # 2. Filter by DAY in Python
    for doc in docs:
        data = doc.to_dict()
        scheduled_days = data.get('days', []) # e.g. ['mon', 'wed', 'fri']
        
        # Ensure case-insensitive comparison (API might send 'Mon', DB might have 'mon')
        # We convert the DB list to lowercase and the input day to lowercase
        normalized_days = [d.lower() for d in scheduled_days]
        
        if day.lower() in normalized_days:
            valid_docs.append(doc)
            
    return valid_docs
def queue_refill_notification(user_id,quantity, medicine_id, med_name,sche_id, delay_minutes=10):
    ist = pytz.timezone("Asia/Kolkata")

    # 1️⃣ Get IST now
    ist_now = datetime.now(ist)

    # 2️⃣ Add delay in IST
    ist_send_time = ist_now + timedelta(minutes=delay_minutes)

    # 3️⃣ Convert to UTC before storing
    utc_send_time = ist_send_time.astimezone(pytz.utc)

    queued_ref = (
        db.collection("users")
        .document(user_id)
        .collection("queued_notifications")
    )

    # 🚫 Prevent duplicates
    existing = (
        queued_ref
        .where("medicine_id", "==", medicine_id)
        .where("type", "==", "refill")
        .where("sent", "==", False)
        .limit(1)
        .stream()
    )

    if any(existing):
        return

    queued_ref.add({
        "type": "refill",
        "medicine_id": medicine_id,
        "schedule_id":sche_id,
        "med_name": med_name,
        "quantity": quantity,
        "scheduled_at": utc_send_time,  # ✅ UTC STORED
        "sent": False,
        "created_at": firestore.SERVER_TIMESTAMP
    })
def get_due_refill_notifications():
    now = datetime.utcnow()

    return (
        db.collection_group("queued_notifications")
        .where("type", "==", "refill")
        .where("sent", "==", False)
        .where("scheduled_at", "<=", now)
        .stream()
    )
def refill_medicine(user_id, data):
    med_ref = (
        db.collection("users").document(user_id).collection("medicines").document(data["medicine_id"])
    )

    med_ref.update({
        "quantity": firestore.Increment(data["quantity"])
    })
def get_schedule_for_edit(user_id,schedule_id):

    sched_ref = (
        db.collection("users")
        .document(user_id)
        .collection("schedules")
        .document(schedule_id)
    )

    doc = sched_ref.get()
    if not doc.exists:
        return jsonify({"error": "Schedule not found"}), 404

    data = doc.to_dict()

    # Return ONLY what edit page needs
    return jsonify({
        "quantity_per_dose": data.get("quantity_per_dose", 1),
        "food": data.get("food", ""),
        "days": data.get("days", []),
        "start_date": data.get("start_date"),
        "duration_days": data.get("duration_days"),
        "times": data.get("times", []),
        "tod_selection": data.get("tod_selection", {})
    })
def update_schedule(user_id, schedule_id, data):
    sched_ref = (
        db.collection("users")
        .document(user_id)
        .collection("schedules")
        .document(schedule_id)
    )
    if not sched_ref.get().exists:
        return jsonify({"error": "Schedule not found"}), 404

    # Clean & validate
    times = sorted(list(set(data.get("times", []))))
    tod_selection = data.get("tod_selection", {})

    update_data = {
        "quantity_per_dose": int(data.get("quantity_per_dose", 1)),
        "food": data.get("food", ""),
        "days": data.get("days", []),
        "start_date": data.get("start_date"),
        "duration_days": int(data.get("duration_days", 0)),
        "times": times,
        "tod_selection": tod_selection,
        "updated_at": firestore.SERVER_TIMESTAMP
    }

    sched_ref.update(update_data)

    return jsonify({"status": "updated"})        