// ----- UI wiring (your original open/close)
const openBtn = document.querySelector(".signup-btn");
const closeBtn = document.getElementById("cross");
const panel = document.getElementById("sign_up_pop_up_form");

// auth form elements
const emailInput = document.getElementById("email_id");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login_btn");
const switchToSignupLink = document.getElementById("switchToSignup");
const forgotPasswordLink = document.getElementById("forgotPassword");
const authMessage = document.getElementById("authMessage");
const authTitle = document.getElementById("authTitle");

let isSignup = false;

// Open/Close popup
openBtn.addEventListener("click", () => {
  panel.classList.add("active");
  panel.setAttribute("aria-hidden", "false");
});
closeBtn.addEventListener("click", () => {
  panel.classList.remove("active");
  panel.setAttribute("aria-hidden", "true");
});

// small helper for messages
function showMessage(msg, isError = true) {
  authMessage.textContent = msg;
  authMessage.classList.toggle("error", isError);
  authMessage.classList.toggle("ok", !isError);
}

// email validator (simple)
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* -------------------------
  Firebase initialization
------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyDXmHFMemjxSNv9agnAdBCIpyBBlMYA-F8",
  authDomain: "expense-tracker-web-ap.firebaseapp.com",
  projectId: "expense-tracker-web-ap",
  storageBucket: "expense-tracker-web-ap.firebasestorage.app",
  messagingSenderId: "801037078061",
  appId: "1:801037078061:web:e3810c6883f1a0ca2172a4",
  measurementId: "G-QCV1P7ZJRJ",
};

// Using compat CDN imports above: initialize
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

/* -------------------------
  Auth actions
------------------------- */

// Toggle Login <-> Sign up
switchToSignupLink.addEventListener("click", (e) => {
  e.preventDefault();
  isSignup = !isSignup;
  authTitle.textContent = isSignup ? "Sign up" : "Login";
  loginBtn.textContent = isSignup ? "Sign up" : "Login";
  switchToSignupLink.innerHTML = isSignup
    ? '<span style="color:blue">Back to Login</span>'
    : '<span style="color:blue">Sign up</span>';
  showMessage("", false);
});

// Forgot password (sends reset email)
forgotPasswordLink.addEventListener("click", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email || !isValidEmail(email)) {
    showMessage("Enter a valid email to reset password.", true);
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    showMessage("Password reset email sent. Check your inbox.", false);
  } catch (err) {
    handleAuthError(err);
  }
});

// Login / Signup button
loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // basic validation
  if (!email || !isValidEmail(email)) {
    showMessage("Please enter a valid email.", true);
    return;
  }
  if (!password || password.length < 6) {
    showMessage("Password must be at least 6 characters.", true);
    return;
  }

  loginBtn.disabled = true;
  showMessage("Processing...", false);

  try {
    if (isSignup) {
      // create account
      const userCredential = await auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // send verification email (optional) - we will send it here
      try {
        await user.sendEmailVerification();
        // inform user that verification email sent
        showMessage(
          "Account created. Verification email sent. Redirecting...",
          false
        );
      } catch (vErr) {
        // still proceed even if verification email failed to send
        console.warn("verification error:", vErr);
        showMessage(
          "Account created. (Couldn't send verification email.) Redirecting...",
          false
        );
      }

      // Redirect to dashboard
      window.location.href = "dashboard.html";
    } else {
      // login
      const userCredential = await auth.signInWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // optional: you can check emailVerified before granting access:
      // if (!user.emailVerified) { showMessage("Verify your email before logging in.", true); return; }

      showMessage("Login successful. Redirecting...", false);
      window.location.href = "dashboard.html";
    }
  } catch (err) {
    handleAuthError(err);
  } finally {
    loginBtn.disabled = false;
  }
});

// friendly error messages for common Firebase Auth error codes
function handleAuthError(err) {
  console.error(err);
  const code = err.code || "";
  switch (code) {
    case "auth/wrong-password":
    case "auth/user-not-found":
      showMessage("Email or password is incorrect, try again.", true);
      break;
    case "auth/invalid-email":
      showMessage("Invalid email address.", true);
      break;
    case "auth/email-already-in-use":
      showMessage("This email is already in use. Try logging in.", true);
      break;
    case "auth/weak-password":
      showMessage("Weak password. Use at least 6 characters.", true);
      break;
    case "auth/too-many-requests":
      showMessage("Too many attempts. Try again later.", true);
      break;
    default:
      // fallback to Firebase message
      showMessage(err.message || "Authentication error. Try again.", true);
  }
}

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
// Auto-redirect if already logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    window.location.href = "dashboard.html";
  }
});
