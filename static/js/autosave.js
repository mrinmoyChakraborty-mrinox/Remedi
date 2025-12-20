// ---------- HELPERS ----------
function collectMedicineDraft() {
  return {
    medicine: {
      name: document.getElementById("medName")?.value || "",
      dosage: document.getElementById("dosage")?.value || "",
      medium: document.getElementById("medium")?.value || "",
      quantity: document.getElementById("quantity")?.value || "",
      food: document.getElementById("food")?.value || "",
      notes: document.getElementById("notes")?.value || ""
    }
  };
}

function collectScheduleDraft() {
  return {
    schedule: {
      time: document.getElementById("time-input")?.value || "",
      frequency: document.getElementById("frequency-select")?.value || "",
      every_x_hours: document.getElementById("every-x-hours-input")?.value || null,
      reminder_enabled: document.getElementById("enable-reminder-checkbox")?.checked || false,
      snooze_minutes: document.getElementById("snooze-select")?.value || 10,
      notification_type: getNotificationType(),
      days: getSelectedDays()
    }
  };
}

function getSelectedDays() {
  return Array.from(document.querySelectorAll(".day.selected"))
    .map(d => d.dataset.day.toLowerCase());
}

function getNotificationType() {
  const browser = document.getElementById("notify-browser-checkbox")?.checked;
  const email = document.getElementById("notify-email-checkbox")?.checked;
  if (browser && email) return "both";
  if (email) return "email";
  return "push";
}

// ---------- SAVE DRAFT ----------
async function saveDraft() {
  let payload = {};

  // Merge instead of overwrite
  if (document.getElementById("medName")) {
    Object.assign(payload, collectMedicineDraft());
  }

  if (document.getElementById("time-input")) {
    Object.assign(payload, collectScheduleDraft());
  }

  if (Object.keys(payload).length === 0) return;

  await fetch("/api/draft/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// ---------- LOAD DRAFT ----------
async function loadDraft() {
  const res = await fetch("/api/draft/load");
  const data = await res.json();

  if (!data.draft) return;

  const d = data.draft;

  // Restore medicine
  if (d.medicine && document.getElementById("medName")) {
    document.getElementById("medName").value = d.medicine.name || "";
    document.getElementById("dosage").value = d.medicine.dosage || "";
    document.getElementById("notes").value = d.medicine.notes || "";
  }

  // Restore schedule
  if (d.schedule && document.getElementById("time-input")) {
    document.getElementById("time-input").value = d.schedule.time || "";
    document.getElementById("frequency-select").value = d.schedule.frequency || "";

    (d.schedule.days || []).forEach(day => {
      const el = document.querySelector(`.day[data-day="${day.toUpperCase()}"]`);
      if (el) el.classList.add("selected");
    });

    document.getElementById("enable-reminder-checkbox").checked =
      !!d.schedule.reminder_enabled;
  }
}

// ---------- AUTOSAVE TRIGGERS ----------
document.addEventListener("input", () => {
  clearTimeout(window.__autosaveTimer);
  window.__autosaveTimer = setTimeout(saveDraft, 800);
});

// ---------- LOAD ON PAGE OPEN ----------
document.addEventListener("DOMContentLoaded", loadDraft);
