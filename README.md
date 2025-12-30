<p align="center">
  <img src="static/images/titleicon.png" alt="ReMedi Logo" width="200"/>
</p>

---

# 🩺 ReMedi — Never miss a dose again.

**ReMedi** is a Flask + Firebase-powered web app that helps users manage their medicines smartly — with timely reminders, refill alerts, and an optional hydration tracker to promote better daily health.

---

## 🚀 Features

### 🧠 Core Features
- 💊 **Medicine Reminder:** Add medicines with dosage, time, and duration.
- 📦 **Refill Tracker:** Get alerts when medicine stock runs low.
- 🧾 **Notes & Instructions:** Save doctor’s advice or medicine interactions.
- 🧾 **Prescription Scanner** (OCR-based auto-fill for medicines)
- 🔔 **Daily Alerts:** Stay on track with timely notifications or on-screen reminders.
- ☁️ Push Notifications using Firebase Cloud Messaging


### 🧠 Future Enhancements
- 📄 **Schedule Exporter:** Download your full medicine schedule as a clean PDF.
- 📲 Phone Number based sign in/sign up
- 🚫🌐Offline Support
- 🤖 Smart Suggestions (AI-based health insights)
- 💧 **Hydration Tracker:** Track daily water intake and stay hydrated (user can enable/disable this feature).

---

## 🧩 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | HTML, CSS, JS |
| **Backend** | Flask (Python) |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth |
| **Storage** | ImagekitIo (for prescription uploads) |
| **Scheduler** | cron with cron-job.org |
| **PDF to image** | pymupdf |
| **AI-OCR** | Gemini 2.5 flash API |

---

## ⚙️ Project Structure

```

Remedi/
│
├── app.py                    # Main Flask application
├── firebase_config.json       # Firebase credentials file
├── requirements.txt           # Project dependencies
│
├── templates/                 # HTML templates
│   ├── base.html
│   ├── home.html
│   ├── dashboard.html
│   ├── add_medicine.html
│   ├── getstarted.html
│   └── and many more templates
│
├── static/                    # CSS, JS, and images
│   ├── css/
│   ├── js/
│   └── images/
│
└── services/
├── firebase_service.py    # Firestore CRUD helpers
|── upload.py    # handles all the uploads to Imagekit
└── ocr_test.py                 # api calls and ocr output

````

---

## 🧠 How It Works

1. 🩺 **User registers** with email + password/Google via Firebase Auth.  
2. 💊 **Medicines are added** with name, time, dosage, and optional notes.  
3. 🔔 **Reminders are triggered** by Flask’s scheduler or local notifications.  
4. 📦 **Refill alerts**show when medicine count is low.  
6. 📄 **Prescription Upload**
   Secure storage of medical prescriptions within the app.

8. 🧠 **Smart Schedule Creation from Prescriptions**
   Create medicine schedules directly from uploaded prescriptions, minimizing manual effort.


---

## 🪜 Installation & Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/mrinmoyChakraborty-mrinox/Remedi.git
   cd Remedi
   ```

2. **Create a virtual environment**

   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   source venv/bin/activate  # Mac/Linux
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Firebase**

   * Create a Firebase project → Enable Firestore & Authentication.
   * Download the service account key → rename to `firebase_config.json` and place in project root.

5. **Run the app**

   ```bash
   python app.py
   ```

6. **Open in browser**

   ```
   http://127.0.0.1:5000/
   ```
   or use directly from - https://remedi-final-rx.vercel.app/

---

## 🏆 Why ReMedi?

* ⏰ Never miss a dose with intelligent medicine reminders
* 🔔 Receive timely refill alerts to avoid interruptions
* 📄 Securely upload and manage medical prescriptions
* 🧠 Generate medicine schedules directly from prescriptions
* ☁️ Cloud-based access ensures data safety and availability

---

## 🤝 Contributing

Pull requests are welcome!
If you’d like to add features (like voice reminders or mobile PWA support), open an issue first to discuss the idea.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

> “Good health is a habit, not a task — Remedi helps you build it.”

