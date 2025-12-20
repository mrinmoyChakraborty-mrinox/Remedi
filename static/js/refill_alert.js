document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  const schedule_id = params.get("schedule_id");
  const medName = params.get("med_name");
  const remaining = params.get("remaining");

  document.getElementById("medicineStatus").innerText =
    `You are running low on ${medName}`;

  document.getElementById("remainingValue").innerText = remaining;

  // Refill action
  document.querySelector(".refill-btn").onclick = async () => {
    const qty = prompt("Enter refill quantity:");

    if (!qty || isNaN(qty)) {
      alert("Invalid quantity");
      return;
    }

    const res = await fetch("/api/refill_medicine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicine_id: medicineId,
        quantity: Number(qty)
      })
    });

    if (res.ok) {
      alert("Medicine refilled successfully");
      window.close();

    } else {
      alert("Failed to refill");
    }
  };

  // Skip / course done
  document.querySelector(".skip-btn").onclick = async () => {
    if (!confirm("This will delete the schedule. Continue?")) return;

    const res = await fetch(`/api/schedules/delete/${schedule_id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      alert("Course marked as completed");
      window.close();

    } else {
      alert("Failed to update");
    }
  };
});
