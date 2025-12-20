import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
async function fetchFirebaseConfig() {
  const response = await fetch('/api/get_firebase_config');
  return await response.json();
}
const app = initializeApp(await fetchFirebaseConfig());
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const googleBtn = document.getElementById("google-login-btn");

if (googleBtn) {
  googleBtn.addEventListener("click", async (e) => {
    e.preventDefault(); 
    try {
      // 1) Google popup
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 2) Get ID token
      const idToken = await user.getIdToken();

      // 3) Send token to Python backend
      const response = await fetch("/google-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken: idToken }),
      });

      if (response.ok) {
        // backend created session, now go to dashboard
        window.location.href = "/";
      } else {
        const data = await response.json();
        alert("Server error: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Google login failed");
    }
  });
}
// ---------- SIGN UP ----------
const signupForm = document.getElementById("signup-form");

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    try {
      // 1) Ask Firebase to create user + store password securely
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Get ID token from Firebase
      const idToken = await user.getIdToken();

      // 3) Tell Flask: “this is the logged-in user”
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert("Server error (signup): " + (data.error || "Unknown error"));
        return;
      }

      // 4) Backend created session → go to dashboard/home
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("Signup failed: " + err.message);
    }
  });
}

// ---------- LOGIN ----------
const signinForm = document.getElementById("signin-form");

if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signin-email").value;
    const password = document.getElementById("signin-password").value;

    try {
      // 1) Ask Firebase to check email + password
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;

      // 2) Get ID token
      const idToken = await user.getIdToken();

      // 3) Send token to backend
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert("Server error (signin): " + (data.error || "Unknown error"));
        return;
      }

      // 4) Session created → redirect
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("signin failed: " + err.message);
    }
  });
}
