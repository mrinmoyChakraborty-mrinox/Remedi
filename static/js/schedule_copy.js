document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ schedule.js loaded");

  // ----------------------------
  // DAY MULTI-SELECT TOGGLE
  // ----------------------------
  document.querySelectorAll(".days-of-week .day").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("selected");
      btn.setAttribute(
        "aria-pressed",
        btn.classList.contains("selected")
      );
    });
  });

  // ----------------------------
  // Save schedule draft
  // ----------------------------
  async function saveScheduleDraft() {
    const selectedDays = Array.from(
      document.querySelectorAll(".days-of-week .day.selected")
    ).map(d => d.dataset.day.toLowerCase());

    const payload = {
      schedule: {
        preset_days: document.querySelector(".pill-pack-options .option.selected")?.dataset.days || null,
        custom_days: document.getElementById("customDaysInput")?.value || null,
        total_quantity: document.getElementById("totalQuantityInput")?.value || null,
        start_date: document.getElementById("startDate")?.value || null,

        days: selectedDays,
        time: document.getElementById("time-input")?.value || "",
        frequency: document.getElementById("frequency-select")?.value || "",
        every_x_hours: document.getElementById("every-x-hours-input")?.value || null,

        reminder_enabled: document.getElementById("enable-reminder-checkbox")?.checked || false,
        snooze_minutes: document.getElementById("snooze-select")?.value || 10,
        notification_type: getNotificationType()
      }
    };

    await fetch("/api/draft/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    console.log("💾 Schedule draft saved");
  }

  function getNotificationType() {
    const b = document.getElementById("notify-browser-checkbox")?.checked;
    const e = document.getElementById("notify-email-checkbox")?.checked;
    if (b && e) return "both";
    if (e) return "email";
    return "push";
  }

  // ----------------------------
  // SAVE + NEXT
  // ----------------------------
  document.getElementById("save-schedule-btn")
    ?.addEventListener("click", async (e) => {
      e.preventDefault();
      await saveScheduleDraft();
      window.location.href = "/confirmation";
    });

  // ----------------------------
  // BACK
  // ----------------------------
  document.getElementById("backBtn")
    ?.addEventListener("click", () => {
      window.location.href = "/addmedicine";
    });
});
