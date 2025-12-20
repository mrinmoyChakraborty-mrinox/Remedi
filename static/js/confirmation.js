document.addEventListener('DOMContentLoaded', () => {
    let medicines = [];
    let chartInstance = null;

    const medicineListEl = document.getElementById('medicine-list');
    const totalMedEl = document.getElementById("summary-med-count");
    const remindersDayEl = document.getElementById("summary-reminders-day");
    const startDateEl = document.getElementById("summary-start-date");
    const endDateEl = document.getElementById("summary-end-date");

    // ---------------- FETCH DATA ----------------
    async function getConfirmationData() {
        const res = await fetch('/api/draft/load');
        const data = await res.json();

        if (!data.draft) {
            medicineListEl.innerHTML = '<p>No draft found. Please go back.</p>';
            return;
        }

        medicines = data.draft.medicines || [];
    }

    // ---------------- RENDER MEDICINES WITH DROPDOWN ----------------
    function render() {
        medicineListEl.innerHTML = "";

        medicines.forEach((item, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "medicine-item";
            // *** CHANGE 1: Display multiple times ***
            // Use the 'times' array and join its elements with a comma.
            const timesDisplay = item.schedule.times && item.schedule.times.length > 0
                ? item.schedule.times.join(", ")
                : "Not set";
            wrapper.innerHTML = `
                <button class="medicine-header" type="button">
                    <div>
                        <div class="title">${item.medicine.name}</div>
                        <div class="subtitle">${item.medicine.dosage || ""}</div>
                    </div>
                    <div class="caret">▼</div>
                </button>

                <div class="medicine-details">
                    <div><b>Start date:</b> ${item.schedule.start_date || "—"}</div>
                    <div><b>Duration:</b> ${item.schedule.duration_days} days</div>
                    <div><b>Days:</b> ${
                        item.schedule.days && item.schedule.days.length
                        ? item.schedule.days.join(", ")
                        : "—"
                    }</div>
                    <div><b>Times:</b> ${timesDisplay}</div>
                    <div><b>Quantity per dose:</b> ${item.schedule.quantity_per_dose}</div>
                    <div><b>Total remaining:</b> ${item.medicine.quantity}</div>
                    <div><b>Medium:</b> ${item.medicine.medium || "—"}</div>
                    <div><b>Food preference:</b> ${item.medicine.food || "—"}</div>
                    ${item.medicine.notes ? `<div><b>Notes:</b> ${item.medicine.notes}</div>` : ''}
                </div>
            `;

            const header = wrapper.querySelector(".medicine-header");
            const details = wrapper.querySelector(".medicine-details");
            const caret = wrapper.querySelector(".caret");

            // Toggle dropdown on click
            header.addEventListener("click", e => {
                e.preventDefault();
                const isOpen = details.classList.contains("open");
                
                // Toggle open class
                details.classList.toggle("open");
                wrapper.classList.toggle("open");
                
                // Rotate caret
                caret.style.transform = isOpen ? "rotate(0deg)" : "rotate(180deg)";
            });

            medicineListEl.appendChild(wrapper);
        });
    }
    
    // ---------------- SUMMARY CALCULATION ----------------
    function renderSummary() {
        totalMedEl.innerText = medicines.length;

        
        // *** CHANGE 2: Calculate reminders based on the number of times per day ***
        // Total reminders = sum of the length of the 'times' array for each medicine.
        const totalReminders = medicines.reduce(
            (sum, m) => sum + (m.schedule.times?.length || 0),
            0
        );
        remindersDayEl.innerText = totalReminders;

        // Start date = earliest start
        const startDates = medicines
            .map(m => m.schedule.start_date)
            .filter(Boolean)
            .map(d => new Date(d));

        if (startDates.length) {
            const minStart = new Date(Math.min(...startDates));
            startDateEl.innerText = minStart.toLocaleDateString();
        } else {
            startDateEl.innerText = "Not set";
        }

        // End date = max(start + duration)
        const endDates = medicines
            .filter(m => m.schedule.start_date && m.schedule.duration_days)
            .map(m => {
                const d = new Date(m.schedule.start_date);
                d.setDate(d.getDate() + m.schedule.duration_days);
                return d;
            });

        if (endDates.length) {
            const maxEnd = new Date(Math.max(...endDates));
            endDateEl.innerText = maxEnd.toLocaleDateString();
        } else {
            endDateEl.innerText = "Not set";
        }
    }

    // ---------------- DONUT CHART ----------------
    function renderDonutChart() {
        const canvas = document.getElementById('medicine-donut-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        if (chartInstance) {
            chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: medicines.map(m => m.medicine.name),
                datasets: [{
                    label: 'Reminders per Day',
                    // Use the length of the times array to determine slice size
                    data: medicines.map(m => m.schedule.times?.length || 0),
                    backgroundColor: [
                        '#4c8bfd',
                        '#22c55e',
                        '#f97316',
                        '#a855f7',
                        '#ef4444',
                        '#14b8a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }

    // ---------------- ACTIONS ----------------
    async function activateSchedule() {
        const res = await fetch('/api/activate', { method: 'POST' });

        if (!res.ok) {
            alert('Failed to activate schedule');
            return;
        }
        alert('✅ Schedule activated successfully!');
        window.location.href = '/dashboard';
    }

    async function saveDraftOnly() {
        await fetch("/api/draft/save", { 
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ medicines })
        });
        alert("Draft saved successfully!");
    }

    function goBack() {
        window.location.href = '/addmedicine';
    }

    // ---------------- INIT ----------------
    async function init() {
        await getConfirmationData();
        render();
        renderSummary();
        renderDonutChart();
        
        document.getElementById("save-draft-btn")?.addEventListener("click", saveDraftOnly);
        document.getElementById('back-btn')?.addEventListener('click', goBack);
        document.getElementById('activate-btn')?.addEventListener('click', activateSchedule);
    }

    init();
});