const btnSignIn = document.getElementById("btn-signin");
const btnSignUp = document.getElementById("btn-signup");
const signInForm = document.getElementById("signin-form");
const signUpForm = document.getElementById("signup-form");

btnSignIn.addEventListener("click", () => {
  btnSignIn.classList.add("active");
  btnSignUp.classList.remove("active");
  signInForm.style.display = "flex";
  signUpForm.style.display = "none";
});

btnSignUp.addEventListener("click", () => {
  btnSignUp.classList.add("active");
  btnSignIn.classList.remove("active");
  signUpForm.style.display = "flex";
  signInForm.style.display = "none";
});
