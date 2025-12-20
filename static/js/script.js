// script.js
// Purpose: UI switching only (Sign In / Sign Up tabs)

document.addEventListener("DOMContentLoaded", () => {
  const signInBtn = document.getElementById("show-signin");
  const signUpBtn = document.getElementById("show-signup");

  const signInForm = document.getElementById("signin-form");
  const signUpForm = document.getElementById("signup-form");

  if (!signInBtn || !signUpBtn || !signInForm || !signUpForm) return;

  signInBtn.addEventListener("click", () => {
    signInForm.style.display = "block";
    signUpForm.style.display = "none";

    signInBtn.classList.add("active");
    signUpBtn.classList.remove("active");
  });

  signUpBtn.addEventListener("click", () => {
    signUpForm.style.display = "block";
    signInForm.style.display = "none";

    signUpBtn.classList.add("active");
    signInBtn.classList.remove("active");
  });
});
