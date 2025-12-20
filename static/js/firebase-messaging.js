import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

let messaging = null;
const notificationSound = new Audio("/static/sounds/notify.mp3");

async function initFirebaseMessaging() {
  const res = await fetch("/api/get_firebase_config");
  const config = await res.json();

  const app = initializeApp(config);
  messaging = getMessaging(app);

  // 🔔 FOREGROUND HANDLER
 onMessage(messaging, (payload) => {
  console.log("🔔 MESSAGE:", payload);

  notificationSound.currentTime = 0;
  notificationSound.play().catch(() => {});

  const type = payload.data.notification_type || "reminder";

  if (type === "refill") {
    showToast(
      `🧾 Refill needed for ${payload.data.med_name}`,
      payload.data,
      "refill"
    );
  } else {
    showToast(
      `💊 Time to take ${payload.data.med_name}`,
      payload.data,
      "reminder"
    );
  }
});
}


initFirebaseMessaging();
function showToast(message, payload, type) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;

  toast.onclick = () => {
    if (type === "refill") {
      const params = new URLSearchParams({
        medicine_id: payload.medicine_id,
        schedule_id: payload.schedule_id,
        med_name: payload.med_name,
        remaining: payload.quantity || "0"
      });
      window.open(`/refill-alert?${params.toString()}`);
    } else {
      const params = new URLSearchParams({
        schedule_id: payload.schedule_id,
        user_id: payload.user_id,
        med_name: payload.med_name,
        food: payload.food || ""
      });
      window.open(`/notification-action?${params.toString()}`);
    }

    // ❌ DO NOT auto-remove other toasts
    toast.remove(); // remove only the clicked one
  };

  container.appendChild(toast);
}



document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("enableNotif");

  if (!btn) {
    console.error("❌ enableNotif button not found");
    return;
  }

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
     // If already enabled, do nothing
    if (btn.classList.contains("enabled")) {
        return;
    }

    try {
      const permission = await Notification.requestPermission();
      console.log("Permission:", permission);

      if (permission !== "granted") {
        alert("Notification permission denied. Please enable it in your browser settings.");
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.style.opacity = "0.6";

      // Fetch Firebase config
      const res = await fetch("/api/get_firebase_config");
      const firebaseConfig = await res.json();

      // Initialize Firebase
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Register service worker
      if ("serviceWorker" in navigator) {
        await navigator.serviceWorker.register("/static/firebase-messaging-sw.js");
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: firebaseConfig.vapidKey
      });

      // Save token to backend
      const saveRes = await fetch("/save-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (saveRes.ok) {
        console.log("✅ FCM Token saved:", token);
        localStorage.setItem("fcm_token", token);
        alert("✅ Notifications enabled successfully!");
        window.location.reload();
      } else {
        throw new Error("Failed to save token");
      }

    } catch (error) {
      console.error("❌ Notification setup failed:", error);
      alert("Failed to enable notifications. Please try again.");
      window.location.reload();
    }
  });
});
