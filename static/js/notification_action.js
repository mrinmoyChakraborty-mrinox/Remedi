document.addEventListener('DOMContentLoaded', () => {
    // 1. Get Elements
    const medNameDisplay = document.getElementById('medNameDisplay');
    const btnTake = document.getElementById('btn-take');
    const btnSkip = document.getElementById('btn-skip');

    // 2. Extract Data from URL
    const params = new URLSearchParams(window.location.search);
    const scheduleId = params.get('schedule_id');
    const food = params.get('food');
    const userId = params.get('user_id');
    const medName = params.get('med_name');

    // 3. Update UI
    if (medNameDisplay) {
        medNameDisplay.innerText = medName || "Medicine";
        if (food) {
            medNameDisplay.innerText += ` (${food})`;
        }
        
    }

    // 4. Define Actions
    
    // Action: Mark as Taken
    const markAsTaken = async () => {
        // Disable button to prevent double clicks
        btnTake.disabled = true;
        btnTake.innerText = "Processing...";

        try {
            const response = await fetch('/api/mark_taken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schedule_id: scheduleId, user_id: userId })
            });

            const result = await response.json();

            if (result.status === 'success') {
                alert("Great job! Inventory updated.");
                window.close(); 
            } else {
                alert("Something went wrong: " + (result.error || "Unknown error"));
                btnTake.disabled = false;
                btnTake.innerText = "✅ I Took It";
            }
        } catch (error) {
            console.error(error);
            alert("Network error. Please check your connection.");
            btnTake.disabled = false;
            btnTake.innerText = "✅ I Took It";
        }
    };

    // Action: Skip / Go Dashboard
    const goToDashboard = () => {
        window.close(); 
    };

    // 5. Attach Event Listeners
    if (btnTake) btnTake.addEventListener('click', markAsTaken);
    if (btnSkip) btnSkip.addEventListener('click', goToDashboard);
});