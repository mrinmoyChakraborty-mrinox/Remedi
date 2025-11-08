<p align="center">
  <img src="remedi_logo.png" alt="ReMedi Logo" width="120"/>
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
- 📄 **Schedule Exporter:** Download your full medicine schedule as a clean PDF.
- 🔔 **Daily Alerts:** Stay on track with timely notifications or on-screen reminders.

### 💧 Optional Add-On
- **Hydration Tracker:** Track daily water intake and stay hydrated (user can enable/disable this feature).

### 🧠 Future Enhancements
- 🧾 Prescription Scanner (OCR-based auto-fill for medicines)
- 🤖 Smart Suggestions (AI-based health insights)
- ☁️ Push Notifications using Firebase Cloud Messaging

---

## 🧩 Tech Stack

| Layer | Technology |
|--------|-------------|
| **Frontend** | HTML, CSS, Bootstrap, Chart.js |
| **Backend** | Flask (Python) |
| **Database** | Firebase Firestore |
| **Authentication** | Firebase Auth |
| **Storage** | Firebase Storage (for prescription uploads) |
| **Scheduler** | APScheduler |
| **PDF Export** | FPDF / ReportLab |
| **OCR (optional)** | pytesseract |

---

## ⚙️ Project Structure

```

HealthEase/
│
├── app.py                    # Main Flask application
├── firebase_config.json       # Firebase credentials file
├── requirements.txt           # Project dependencies
│
├── templates/                 # HTML templates
│   ├── base.html
│   ├── dashboard.html
│   ├── add_medicine.html
│   ├── login.html
│   ├── register.html
│   └── hydration.html (optional)
│
├── static/                    # CSS, JS, and images
│   ├── css/
│   ├── js/
│   └── images/
│
└── services/
├── firebase_service.py    # Firestore CRUD helpers
├── scheduler_service.py   # Reminder + notification handling
└── pdf_exporter.py        # PDF generation logic

````

---

## 🧠 How It Works

1. 🩺 **User registers** with email + password via Firebase Auth.  
2. 💊 **Medicines are added** with name, time, dosage, and optional notes.  
3. 🔔 **Reminders are triggered** by Flask’s scheduler or local notifications.  
4. 📦 **Refill alerts** show when medicine count is low.  
5. 🧾 **User can export** their medicine list as a printable PDF.
6. 💧 *(Optional)* User can enable **hydration tracking** in settings.

---

## 🪜 Installation & Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/HealthEase.git
   cd HealthEase
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

---

## 🏆 Why ReMedi?

* 🕐 Never miss a dose again
* 📦 Get timely refill alerts
* 💧 Stay hydrated (if you want to)
* 🧾 Shareable printable schedules
* ☁️ Cloud-based — your data is safe and accessible anywhere

---

## 🤝 Contributing

Pull requests are welcome!
If you’d like to add features (like voice reminders or mobile PWA support), open an issue first to discuss the idea.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

> “Good health is a habit, not a task — Remedi helps you build it.”

