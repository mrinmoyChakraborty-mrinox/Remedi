document.addEventListener("DOMContentLoaded", async () => {
  const scheduleId = document.getElementById("scheduleId").value;

  const res = await fetch(`/api/schedules/get/${scheduleId}`);
  const data = await res.json();

  // Quantity
  document.getElementById("quantity_per_dose").value =
    data.quantity_per_dose || 1;

  // Food
  if (data.food) {
    document.querySelector(`input[name="food"][value="${data.food}"]`)?.click();
  }

  // Days
  if (data.days) {
    data.days.forEach(d => {
      document.querySelector(`.day[data-day="${d}"]`)?.classList.add("selected");
    });
    document.getElementById("days").value = JSON.stringify(data.days);
  }

  // Dates
  document.getElementById("start_date").value = data.start_date || "";
  document.getElementById("duration_days").value = data.duration_days || "";

  // Times
  if (data.tod_selection && Object.keys(data.tod_selection).length) {
    Object.entries(data.tod_selection).forEach(([label, time]) => {
      const checkbox = document.querySelector(`.tod-item input[value="${label}"]`);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.closest(".tod-item")
          .querySelector('input[type="time"]').value = time;
      }
    });
  } else if (data.times?.length) {
    document.getElementById("single_time").value = data.times[0];
  }
});

// day toggle
document.addEventListener("click", e => {
  if (!e.target.classList.contains("day")) return;
  e.target.classList.toggle("selected");

  const days = [...document.querySelectorAll(".day.selected")]
    .map(d => d.dataset.day);

  document.getElementById("days").value = JSON.stringify(days);
});

async function saveSchedule() {
  const scheduleId = document.getElementById("scheduleId").value;

  let times = [];
  let tod = {};

  document.querySelectorAll(".tod-item input[type=checkbox]:checked")
    .forEach(cb => {
      const t = cb.closest(".tod-item").querySelector('input[type="time"]').value;
      tod[cb.value] = t;
      times.push(t);
    });

  if (!times.length) {
    const single = document.getElementById("single_time").value;
    if (single) times = [single];
  }

  const payload = {
    quantity_per_dose: Number(document.getElementById("quantity_per_dose").value),
    food: document.querySelector('input[name="food"]:checked')?.value || "",
    days: JSON.parse(document.getElementById("days").value || "[]"),
    start_date: document.getElementById("start_date").value,
    duration_days: Number(document.getElementById("duration_days").value),
    times,
    tod_selection: tod
  };

  await fetch(`/api/schedules/update/${scheduleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  window.location.href = "/schedules";
}

function cancelEdit() {
  window.location.href = "/schedules";
}
