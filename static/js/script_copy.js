const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const phoneForm = document.getElementById("phone-form");

const toggleBox = document.querySelector(".toggle");
const googleBtn = document.getElementById("google-login-btn");
const phoneBtn = document.getElementById("phone-login-btn");

// Phone login click
phoneBtn.addEventListener("click", () => {
  // hide others
  signinForm.style.display = "none";
  signupForm.style.display = "none";
  toggleBox.style.display = "none";
  googleBtn.style.display = "none";
  phoneBtn.style.display = "none";

  // show phone form
  phoneForm.style.display = "flex";
});

document.getElementById("back-btn").addEventListener("click", () => {
  phoneForm.style.display = "none";

  toggleBox.style.display = "flex";
  googleBtn.style.display = "block";
  phoneBtn.style.display = "block";
  signinForm.style.display = "flex";
});

const phoneGoogleBtn = document.getElementById("phone-google-btn");
const phoneEmailBtn = document.getElementById("phone-email-btn");

// Google from phone page
phoneGoogleBtn.addEventListener("click", () => {
  phoneForm.style.display = "none";

  toggleBox.style.display = "flex";
  googleBtn.style.display = "block";
  phoneBtn.style.display = "block";

  signinForm.style.display = "flex";
});

// Email from phone page
phoneEmailBtn.addEventListener("click", () => {
  phoneForm.style.display = "none";

  toggleBox.style.display = "flex";
  googleBtn.style.display = "block";
  phoneBtn.style.display = "block";

  signinForm.style.display = "flex";
});

signinForm.addEventListener("submit", function (e) {
  e.preventDefault(); // 🔥 MUST

  const password = document.getElementById("signin-password").value.trim();

  if (password.length < 8) {
    alert("Password must be at least 8 characters ❌");
    return;
  }

  alert("Sign In password valid ✅");
});

signupForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const password = document.getElementById("signup-password").value.trim();

  if (password.length < 8) {
    alert("Password must be at least 8 characters ❌");
    return;
  }

  alert("Sign Up password valid ✅");
});

// ================= VALIDATION FUNCTIONS =================

function validateEmailValue(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validatePasswordValue(password) {
  const regex =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z0-9!@#$%^&*]{8,}$/;
  return regex.test(password);
}

function validatePhoneValue(phone) {
  const regex = /^(\+91)?[6-9]\d{9}$/;
  return regex.test(phone);
}
