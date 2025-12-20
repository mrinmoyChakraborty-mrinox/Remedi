
document.addEventListener("DOMContentLoaded", () => {
    loadPrescriptions();
});

async function loadPrescriptions() {
    const listDiv = document.getElementById("prescriptionsList");

    try {
        const response = await fetch("/api/prescriptions/list");
        const data = await response.json();

        listDiv.innerHTML = "";

        if (!data.prescriptions || data.prescriptions.length === 0) {
            listDiv.innerHTML = "<p class='no-img'>No prescriptions found.</p>";
            return;
        }

        data.prescriptions.forEach(pres => {
            const dropdown = document.createElement("div");
            dropdown.className = "dropdown";

            dropdown.innerHTML = `
                <button class="dropdown-btn" onclick="togglePrescription('${pres.id}')">
                    Prescription #${pres.id}      -       ${pres.uploaded_at || 'No Date'}
                    <span class="arrow" id="arrow-${pres.id}">▼</span>
                </button>

                <div class="dropdown-content" id="content-${pres.id}" 
                style="display:none; padding: 10px; text-align: center; background: #f9f9f9; border: 1px solid #ddd; border-top: none;">
                
                <img src="${pres.image_url}" 
                    alt="Prescription" 
                    style="max-width: 100%; height: auto; max-height: 300px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); display: block; margin: 0 auto;">
                    
                    <div class="actions">
                        <button onclick="deletePrescription('${pres.id}')">
                            🗑 Delete
                        </button>
                        <!-- CHANGED: Added 'this' to createSchedule -->
                        <button class="schedule" onclick="createSchedule(this, '${pres.image_url}')">
                            📅 Create schedule with this
                        </button>
                    </div>
                </div>
            `;

            listDiv.appendChild(dropdown);
        });

    } catch (error) {
        console.error("Error loading prescriptions:", error);
        listDiv.innerHTML = "<p>Failed to load prescriptions.</p>";
    }
}

function togglePrescription(id) {
    const content = document.getElementById(`content-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    const isHidden = content.style.display === "none";
    content.style.display = isHidden ? "block" : "none";
    arrow.textContent = isHidden ? "▲" : "▼";
}

async function deletePrescription(id) {
    if (!confirm("Are you sure you want to delete this prescription?")) return;
    try {
        const response = await fetch(`/api/prescriptions/delete/${id}`, { method: "DELETE" });
        if (response.ok) { loadPrescriptions(); } 
        else { alert("Failed to delete prescription"); }
    } catch (error) { console.error("Error:", error); }
}

// NEW: OCR now returns true/false so the button knows if it should reset
async function OCR(imageUrl) {
    try {
        const response = await fetch('/api/fill_from_prescription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: imageUrl })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert("✅ Prescription processed successfully!");
            window.location.href = '/addmedicine';
            return true;
        } else {
            alert("Error: " + (result.error || "Failed to process prescription."));
            return false;
        }
    } catch (err) {
        alert("Failed to process ocr in prescription");
        return false;
    }
}

// CHANGED: Handles the loading state UI
async function createSchedule(btn, image_url) {
    // 1. Save original state
    const originalContent = btn.innerHTML;
    
    // 2. Set loading state
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner">⏳</span> Processing...`;
    btn.style.opacity = "0.7";
    btn.style.cursor = "not-allowed";

    // 3. Run OCR
    const success = await OCR(image_url);

    // 4. If it fails, reset the button (if it succeeds, the page redirects anyway)
    if (!success) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
}