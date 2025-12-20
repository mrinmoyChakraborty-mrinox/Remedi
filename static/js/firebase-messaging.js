import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js";

let messaging = null;
const notificationSound = new Audio("/static/sounds/notify.mp3");

async function initFirebaseMessaging() {
  try {
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
  } catch (error) {
    console.error("Failed to initialize Firebase Messaging:", error);
  }
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

    toast.remove();
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
      // Step 1: Request permission
      console.log("Requesting notification permission...");
      const permission = await Notification.requestPermission();
      console.log("Permission result:", permission);

      if (permission !== "granted") {
        alert("Notification permission denied. Please enable it in your browser settings.");
        return;
      }

      // Show loading state
      btn.disabled = true;
      btn.style.opacity = "0.6";

      // Step 2: Fetch Firebase config
      console.log("Fetching Firebase config...");
      const res = await fetch("/api/get_firebase_config");
      if (!res.ok) {
        throw new Error("Failed to fetch Firebase config");
      }
      const firebaseConfig = await res.json();
      console.log("Firebase config loaded");

      // Step 3: Initialize Firebase (if not already done)
      console.log("Initializing Firebase...");
      const app = initializeApp(firebaseConfig);
      const messagingInstance = getMessaging(app);

      // Step 4: Register service worker (or use existing one)
      console.log("Setting up service worker...");
      if ("serviceWorker" in navigator) {
        // Check if SW is already registered
        let registration = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
        
        if (!registration) {
          console.log("Registering new service worker...");
          registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        } else {
          console.log("Service worker already registered, reusing it");
        }
        
        console.log("Service worker registration:", registration);
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
        console.log("Service worker is ready");
      }

      // Step 5: Get FCM token
      console.log("Getting FCM token...");
      const token = await getToken(messagingInstance, {
        vapidKey: firebaseConfig.vapidKey,
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      
      if (!token) {
        throw new Error("Failed to get FCM token");
      }
      console.log("FCM token obtained:", token.substring(0, 20) + "...");

      // Step 6: Save token to backend
      console.log("Saving token to backend...");
      const saveRes = await fetch("/save-fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!saveRes.ok) {
        const errorText = await saveRes.text();
        throw new Error(`Failed to save token: ${errorText}`);
      }

      console.log("✅ Token saved successfully");
      localStorage.setItem("fcm_token", token);
      
      // Update UI immediately
      btn.classList.add("enabled");
      btn.disabled = true;
      btn.title = "Notifications Enabled";
      btn.style.opacity = "1";
      
      const svg = btn.querySelector("svg");
      if (svg) {
        svg.style.fill = "#42b983";
      }
      
      alert("✅ Notifications enabled successfully!");

    } catch (error) {
      console.error("❌ Notification setup failed:", error);
      console.error("Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      alert(`Failed to enable notifications: ${error.message}\n\nPlease check the console for details.`);
      
      // Reset button state on error
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  });
});