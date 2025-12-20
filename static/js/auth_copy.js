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
  googleBtn.addEventListener("click", async () => {
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
        window.location.href = "/dashboard";
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

  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();

  // ❌ VALIDATION FIRST
  if (!validateEmailValue(email)) {
    alert("❌ Invalid email format (example@gmail.com)");
    return;
  }


// ✅ NEW
const signupPassword = document.getElementById("signup-password");
const passError = signupPassword.nextElementSibling;

if (!validatePasswordValue(password)) {
  signupPassword.classList.add("invalid");
  passError.textContent =
    "Password must be 8+ chars, include number & special character";
  passError.style.display = "block";
  return; // ⛔ Firebase + backend STOP
}


  // ✅ Firebase runs ONLY if valid
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    const idToken = await user.getIdToken();

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      alert("Server error during signup");
      return;
    }

    window.location.href = "/dashboard";
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
 });
}

// ---------- LOGIN ----------
const signinForm = document.getElementById("signin-form");

if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value.trim();

  // ❌ VALIDATION FIRST
  if (!validateEmailValue(email)) {
    alert("❌ Invalid email format");
    return;
  }


// ✅ NEW
const signinPassword = document.getElementById("signin-password");
const passError = signinPassword.nextElementSibling;

if (password.length < 8) {
  signinPassword.classList.add("invalid");
  passError.textContent = "Password must be at least 8 characters";
  passError.style.display = "block";
  return; // ⛔ Firebase + backend STOP
}

  // ✅ Firebase only if valid
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const user = cred.user;
    const idToken = await user.getIdToken();

    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      alert("Server error during signin");
      return;
    }

    window.location.href = "/dashboard";
  } catch (err) {
    alert("Signin failed: " + err.message);
  }
  });
}

// ===== PHONE OTP BUTTON =====
const sendOtpBtn = document.getElementById("send-otp-btn");

if (sendOtpBtn) {
  sendOtpBtn.addEventListener("click", () => {
    const phoneInput = document.getElementById("phone");
    const phone = phoneInput.value.trim();
    const error = phoneInput.nextElementSibling;

    // reset
    phoneInput.classList.remove("invalid");
    error.style.display = "none";

    // ❌ validation
    if (!validatePhoneValue(phone)) {
      phoneInput.classList.add("invalid");
      error.textContent = "❌ Enter valid Indian phone number";
      error.style.display = "block";
      return; // ⛔ backend stop
    }

    // ✅ ONLY if valid
    alert("Phone valid — OTP sent (next step)");
  });
}

