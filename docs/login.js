// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdY5PFd10UxsucH0WAHtZh33yAbWIsy9Y",
  authDomain: "decisio-1306.firebaseapp.com",
  projectId: "decisio-1306",
  storageBucket: "decisio-1306.firebasestorage.app",
  messagingSenderId: "964454907003",
  appId: "1:964454907003:web:382da474360027add536de",
  measurementId: "G-8CHQ5QD19Q"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
  const authForm = document.getElementById('authForm');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authSubmitBtn = document.getElementById('authSubmitBtn');
  const authToggleBtn = document.getElementById('authToggleBtn');
  const authToggleText = document.getElementById('authToggleText');
  const authTitle = document.getElementById('authTitle');
  const authErrorMsg = document.getElementById('authErrorMsg');
  
  let isLoginMode = true;

  // Toggle Login/Signup
  authToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
    authSubmitBtn.innerText = isLoginMode ? 'Log In' : 'Sign Up';
    authToggleText.innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    authToggleBtn.innerText = isLoginMode ? "Sign Up" : "Log In";
    authErrorMsg.innerText = '';
  });

  // Handle Form Submit
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmail.value;
    const pwd = authPassword.value;
    authErrorMsg.innerText = '';
    authSubmitBtn.disabled = true;

    try {
      if (isLoginMode) {
        await auth.signInWithEmailAndPassword(email, pwd);
      } else {
        await auth.createUserWithEmailAndPassword(email, pwd);
      }
      // Redirect to main interface on success
      window.location.href = 'index.html';
    } catch (err) {
      authErrorMsg.innerText = err.message;
      authSubmitBtn.disabled = false;
    }
  });

  // Watch Auth State - if already logged in, redirect
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.href = 'index.html';
    }
  });
});
