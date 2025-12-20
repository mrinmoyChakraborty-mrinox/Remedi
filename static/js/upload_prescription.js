let selectedFile = null;

// Upload button (images + pdf)
function openFilePicker() {
    document.getElementById("fileInput").click();
}


// Image + PDF handler
document.getElementById("fileInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf","image/jpg"];

    if (!allowedTypes.includes(file.type)) {
        alert("Invalid file type.");
        this.value = "";
        return;
    }

    selectedFile = file;
    document.getElementById("fileName").textContent =
        "Selected file: " + file.name;
});
async function uploadPrescription(){
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
        const response = await fetch('/api/upload_prescription', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (response.ok && result.success) {
            console.log("Success:", result);
            alert("✅ Prescription uploaded successfully!");
            window.location.href = '/dashboard';
        } else {
            alert("Error: " + (result.error || "Failed to process prescription."));
            confirmBtn.disabled = false;
            confirmBtn.innerText = "Confirm";
        }

    } catch (error) {
        console.error("Upload error:", error);
        alert("Network error. Please try again.");
        confirmBtn.disabled = false;
        confirmBtn.innerText = "Confirm";
    }    


}

function confirmUpload() {
    if (!selectedFile) {
        alert("Please upload a prescription first.");
        return;
    }
    
    const confirmBtn = document.querySelector(".confirm-btn");
    
    // UI Loading State
    confirmBtn.disabled = true;
    confirmBtn.innerText = "Processing... (This may take a few seconds)";
    uploadPrescription();

    
}
