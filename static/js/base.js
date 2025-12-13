
const logoutPopup = document.getElementById("logout-popup");
const logoutBtn = document.getElementById("logout-btn");
const closeBtn = document.getElementById("closeBtn");
const confirmLogout = document.getElementById("confirmLogout");

// Only run this logic if the logout button exists on the page
if (logoutBtn) {
        // 1. Open Popup
    logoutBtn.addEventListener("click", (e) => {
        e.preventDefault(); // STOPS the href="#" from jumping/refreshing the page
        logoutPopup.style.display = "flex";
    });

// 2. Close Popup
if (closeBtn) {
    closeBtn.addEventListener("click", () => {
        logoutPopup.style.display = "none";
    });
}

// 3. Confirm Logout
if (confirmLogout) {
    confirmLogout.addEventListener("click", () => {
    window.location.href = "/logout";
    });
}

// 4. (Optional) Close if clicking outside the popup content
window.addEventListener("click", (e) => {
    if (e.target === logoutPopup) {
        logoutPopup.style.display = "none";
        }
    });
}
