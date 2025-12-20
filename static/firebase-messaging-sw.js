/* firebase-messaging-sw.js */

importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js");
importScripts("/firebase-config.js");

/* Initialize Firebase */
firebase.initializeApp(self.FIREBASE_CONFIG);
const messaging = firebase.messaging();

/* ================================
   1️⃣ BACKGROUND MESSAGE HANDLER
   ================================ */
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 BG payload:", payload);

  // 🚨 IMPORTANT: data-only messages
  const data = payload.data || {};
  const type = data.notification_type; // MUST exist

  let title;
  let body;
  let actions = [];

  if (type === "refill") {
    title = "Refill Alert";
    body = `You are running low on ${data.med_name}`;
    actions = [
      { action: "open_refill", title: "🧾 Refill Now" }
    ];
  } else {
    // DEFAULT → medicine reminder
    title = "Medicine Reminder";
    body = `Time to take ${data.med_name} ${data.food || ""}`;
    actions = [
      { action: "mark_taken", title: "✅ Take Now" },
      { action: "open_page", title: "👀 View Details" }
    ];
  }

  self.registration.showNotification(title, {
    body,
    icon: "/static/images/titleicon.png",
    data,          // 🔥 REQUIRED for click handling
    actions
  });
});

/* ================================
   2️⃣ NOTIFICATION CLICK HANDLER
   ================================ */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const type = data.notification_type;

  /* 🔁 REFILL FLOW */
  if (type === "refill") {
    const refillUrl =
      `/refill-alert?medicine_id=${data.medicine_id}` +
      `&med_name=${encodeURIComponent(data.med_name)}` +
      `&remaining=${data.quantity || "0"}`;

    event.waitUntil(clients.openWindow(refillUrl));
    return;
  }

  /* 💊 MEDICINE REMINDER FLOW */
  const scheduleId = data.schedule_id;
  const userId = data.user_id;
  const medName = data.med_name;
  const medId = data.med_id;

  // Action button: Take Now
  if (event.action === "mark_taken") {
    event.waitUntil(
      fetch("/api/mark_taken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedule_id: scheduleId,
          user_id: userId,
          med_id: medId
        })
      }).then(() =>
        self.registration.showNotification("Done!", {
          body: `${medName} marked as taken.`,
          icon: "/static/images/tick.png"
        })
      )
    );
  }
  // Click on body / View Details
  else {
    const actionUrl =
      `/notification-action?schedule_id=${scheduleId}` +
      `&user_id=${userId}` +
      `&med_name=${encodeURIComponent(medName)}` +
      `&food=${data.food || ""}`;

    event.waitUntil(clients.openWindow(actionUrl));
  }
});
