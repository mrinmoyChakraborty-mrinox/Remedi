const FINAL_SAVE_API = "/api/draft/save";

/**
 * Collects FINAL schedule data for backend save
 */
function collectFinalSchedulePayload() {
  const selectedPillPack = document.querySelector(
    ".pill-pack-options .option.selected"
  );

  const weeklySchedule = Array.from(
    document.querySelectorAll(".days-of-week .day.selected")
  ).map(el => el.dataset.day.toLowerCase()); // mon, tue...

  let notificationType = "push";
  const notifyBrowser = document.getElementById("notify-browser-checkbox").checked;
  const notifyEmail = document.getElementById("notify-email-checkbox").checked;

  if (notifyBrowser && notifyEmail) notificationType = "both";
  else if (notifyEmail) notificationType = "email";

  return {
    schedule: {
      // Pill pack
      preset_days: selectedPillPack ? selectedPillPack.dataset.days : null,
      custom_days: document.getElementById("customDaysInput").value || null,
      total_quantity: document.getElementById("totalQuantityInput").value || null,
      start_date: document.getElementById("startDate").value || null,

      // Weekly + timing
      days: weeklySchedule, // [] = daily
      time: document.getElementById("time-input").value, // IST
      frequency: document.getElementById("frequency-select").value,
      every_x_hours: document.getElementById("every-x-hours-input").value || null,

      // Reminder prefs
      reminder_enabled: document.getElementById("enable-reminder-checkbox").checked,
      snooze_minutes: document.getElementById("snooze-select").value,
      notification_type: notificationType
    }
  };
}

/**
 * Final submit handler
 */
document.getElementById("save-schedule-btn").addEventListener("click", async (e) => {
  e.preventDefault();

  const payload = collectFinalSchedulePayload();

  try {
    const res = await fetch(FINAL_SAVE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Failed to save schedule");
      return;
    }

    window.location.href = "/confirmation";
  } catch (err) {
    alert("Network error while saving schedule");
  }
});