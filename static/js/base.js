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
            performLogout();
        });
    }

    async function performLogout() {
        const token = localStorage.getItem("fcm_token");
        try {
            // Only remove token from backend if it exists
            if (token) {
                const response = await fetch('/remove-fcm-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
                
                if (response.ok) {
                    console.log("FCM token removed from backend");
                }
            }
            
            // Clear localStorage
            localStorage.removeItem("fcm_token");
            
            // ✅ FIX: DON'T unregister service worker - just let it stay registered
            // The service worker can be reused on next login
            // Unregistering it causes issues when trying to enable notifications again
            
            // Redirect to logout
            window.location.href = "/logout";
            
        } catch (error) {
            console.error("Logout failed:", error);
            // Still logout even if token removal fails
            window.location.href = "/logout";
        }
    }

    // 4. (Optional) Close if clicking outside the popup content
    window.addEventListener("click", (e) => {
        if (e.target === logoutPopup) {
            logoutPopup.style.display = "none";
        }
    });
}