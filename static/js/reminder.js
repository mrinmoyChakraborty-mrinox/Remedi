// reminder.js — UI only (no storage, no scheduling)
document.addEventListener('DOMContentLoaded', () => {

  const enableReminder = document.getElementById('enable-reminder-checkbox');
  const reminderOptions = document.getElementById('reminder-options');
  const snoozeSelect = document.getElementById('snooze-select');
  const notifyBrowser = document.getElementById('notify-browser-checkbox');
  const notifyEmail = document.getElementById('notify-email-checkbox');

  function updateReminderUI() {
    if (!enableReminder || !reminderOptions) return;

    const enabled = enableReminder.checked;

    reminderOptions.classList.toggle('disabled', !enabled);

    [snoozeSelect, notifyBrowser, notifyEmail].forEach(el => {
      if (el) el.disabled = !enabled;
    });

    const header = document.querySelector('.reminder-header-section');
    if (header) {
      header.style.opacity = enabled ? '1' : '0.6';
    }
  }

  if (enableReminder) {
    enableReminder.addEventListener('change', updateReminderUI);
  }

  updateReminderUI(); // initialize state
});
