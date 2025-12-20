// timing.js — UI only (no logic, no storage)
(function () {

  function isEveryXSelected(selectEl) {
    if (!selectEl) return false;
    const val = (selectEl.value || '').toLowerCase();
    return val === 'every_x_hours';
  }

  function updateEveryXGroup() {
    const freq = document.getElementById('frequency-select');
    const group = document.getElementById('every-x-hours-group');
    const input = document.getElementById('every-x-hours-input');

    if (!freq || !group || !input) return;

    if (isEveryXSelected(freq)) {
      group.style.display = '';
      group.setAttribute('aria-hidden', 'false');
      input.disabled = false;
      input.required = true;
    } else {
      group.style.display = 'none';
      group.setAttribute('aria-hidden', 'true');
      input.disabled = true;
      input.required = false;
      input.value = '';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    updateEveryXGroup();

    const freq = document.getElementById('frequency-select');
    if (freq) {
      freq.addEventListener('change', updateEveryXGroup);
    }
  });

})();
