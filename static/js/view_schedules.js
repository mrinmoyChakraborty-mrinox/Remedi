// view_schedules.js
document.addEventListener("DOMContentLoaded", () => {
    loadSchedules();
});

async function loadSchedules() {
    const listDiv = document.getElementById("schedulesList");

    try {
        const response = await fetch("/api/schedules/list");
        const data = await response.json();

        listDiv.innerHTML = "";

        if (data.schedules.length === 0) {
            listDiv.innerHTML = "<p>No schedules found.</p>";
            return;
        }

        data.schedules.forEach(schedule => {
            const card = document.createElement("div");
            card.className = "schedule-card";

            card.innerHTML = `
                <div class="schedule-header">
                    <strong>${schedule.med_name || '-'}</strong>
                    <strong>${schedule.dosage || '-'}</strong>
                    <button onclick="toggleDetails('${schedule.id}')">▼</button>
                </div>

                <div class="schedule-details" id="details-${schedule.id}" style="display:none">
                    <p><b>Times:</b> ${schedule.times.join(", ")}</p>
                    <p><b>Days:</b> ${schedule.days.join(", ") || '-'}</p>
                    <p><b>Start date:</b> ${schedule.start_date || '-'}</p>
                    <p><b>Duration:</b> ${schedule.duration_days || '-'} days</p>
                    <p><b>Quantity per dose:</b> ${schedule.quantity_per_dose || '-'}</p>
                    <p><b>Total quantity:</b> ${schedule.quantity || '-'}</p>
                    <p><b> Medium:</b> ${schedule.medium || '-'}</p>
                    <p><b> Food preference:</b> ${schedule.food || '-'}</p>
                    <button onclick="editSchedule('${schedule.id}')">
                        ✏️ Edit
                    </button>
                    <button onclick="deleteSchedule('${schedule.id}')">
                        🗑 Delete
                    </button>
                </div>
            `;

            listDiv.appendChild(card);
        });

    } catch (error) {
        console.error(error);
        listDiv.innerHTML = "<p>Failed to load schedules.</p>";
    }
}
function editSchedule(id) {
    window.location.href = `/schedule/edit/${id}`;
}

function toggleDetails(id) {
    const details = document.getElementById(`details-${id}`);
    details.style.display = details.style.display === "none" ? "block" : "none";
}

async function deleteSchedule(id) {
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    const response = await fetch(`/api/schedules/delete/${id}`, {
        method: "DELETE"
    });

    if (response.ok) {
        loadSchedules(); // reload list
    } else {
        alert("Failed to delete schedule");
    }
}
