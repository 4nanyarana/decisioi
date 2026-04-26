// Decisio - Vanilla JS Main Application with Firebase

// --- FIREBASE CONFIGURATION ---
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
const db = firebase.firestore();

class DecisioApp {
  constructor() {
    this.options = [
      { id: 1, text: 'Pizza' },
      { id: 2, text: 'Burgers' },
      { id: 3, text: 'Tacos' }
    ];
    this.isSpinning = false;
    this.result = null;
    this.currentUser = null;

    this.cacheDOM();
    this.bindEvents();
    this.renderOptions();
    
    // Auth Listener
    this.setupAuth();
  }

  setupAuth() {
    this.authModal = document.getElementById('authModal');
    this.authForm = document.getElementById('authForm');
    this.authEmail = document.getElementById('authEmail');
    this.authPassword = document.getElementById('authPassword');
    this.authSubmitBtn = document.getElementById('authSubmitBtn');
    this.authToggleBtn = document.getElementById('authToggleBtn');
    this.authToggleText = document.getElementById('authToggleText');
    this.authTitle = document.getElementById('authTitle');
    this.authErrorMsg = document.getElementById('authErrorMsg');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.greetingUser = document.getElementById('greetingUser');
    this.isLoginMode = true;

    // Toggle Login/Signup
    this.authToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.isLoginMode = !this.isLoginMode;
      this.authTitle.innerText = this.isLoginMode ? 'Welcome Back' : 'Create Account';
      this.authSubmitBtn.innerText = this.isLoginMode ? 'Log In' : 'Sign Up';
      this.authToggleText.innerText = this.isLoginMode ? "Don't have an account?" : "Already have an account?";
      this.authToggleBtn.innerText = this.isLoginMode ? "Sign Up" : "Log In";
      this.authErrorMsg.innerText = '';
    });

    // Handle Form Submit
    this.authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = this.authEmail.value;
      const pwd = this.authPassword.value;
      this.authErrorMsg.innerText = '';
      this.authSubmitBtn.disabled = true;

      try {
        if (this.isLoginMode) {
          await auth.signInWithEmailAndPassword(email, pwd);
        } else {
          await auth.createUserWithEmailAndPassword(email, pwd);
        }
      } catch (err) {
        this.authErrorMsg.innerText = err.message;
      }
      this.authSubmitBtn.disabled = false;
    });

    // Handle Logout
    this.logoutBtn.addEventListener('click', () => auth.signOut());

    // Watch Auth State
    auth.onAuthStateChanged(user => {
      if (user) {
        this.currentUser = user;
        this.authModal.classList.add('hidden');
        this.logoutBtn.classList.remove('hidden');
        this.greetingUser.innerText = user.email.split('@')[0];
      } else {
        this.currentUser = null;
        this.authModal.classList.remove('hidden');
        this.logoutBtn.classList.add('hidden');
        this.greetingUser.innerText = 'Decisive One';
      }
    });
  }

  cacheDOM() {
    this.optionsList = document.getElementById('optionsList');
    this.addOptionBtn = document.getElementById('addOptionBtn');
    this.shuffleBox = document.getElementById('shuffleBox');
    this.shuffleText = document.getElementById('shuffleText');
    this.spinBtn = document.getElementById('spinBtn');
    this.resultModal = document.getElementById('resultModal');
    this.resultText = document.getElementById('resultText');
    this.regretPrompt = document.getElementById('regretPrompt');
    this.regretStatusMessage = document.getElementById('regretStatusMessage');
  }

  bindEvents() {
    this.addOptionBtn.addEventListener('click', () => this.addOption());
    this.spinBtn.addEventListener('click', () => this.spin());
  }

  resetOverthinking() {
    this.resultModal.classList.add('hidden');
    this.result = null;
  }

  // --- Options Management ---
  addOption() {
    this.options.push({ id: Date.now(), text: '' });
    this.resetOverthinking();
    this.renderOptions();
  }

  updateOption(id, text) {
    const opt = this.options.find(o => o.id === id);
    if (opt) {
      opt.text = text;
      this.resetOverthinking();
    }
  }

  removeOption(id) {
    if (this.options.length <= 2) return;
    this.options = this.options.filter(o => o.id !== id);
    this.resetOverthinking();
    this.renderOptions();
  }

  renderOptions() {
    this.optionsList.innerHTML = '';
    this.options.forEach((opt, idx) => {
      const dv = document.createElement('div');
      dv.className = 'option-entry';

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'option-input';
      inp.value = opt.text;
      inp.placeholder = `Option ${idx + 1}`;
      inp.oninput = (e) => this.updateOption(opt.id, e.target.value);

      dv.appendChild(inp);

      if (this.options.length > 2) {
        const remBtn = document.createElement('button');
        remBtn.className = 'remove-btn';
        remBtn.innerHTML = '×';
        remBtn.onclick = () => this.removeOption(opt.id);
        dv.appendChild(remBtn);
      }
      
      this.optionsList.appendChild(dv);
    });
  }

  getValidOptions() {
    return this.options.filter(o => o.text.trim() !== '');
  }

  // --- Spinning Logic ---
  spin() {
    const valid = this.getValidOptions();
    if (valid.length < 2) return alert("Needs 2 or more options!");

    this.isSpinning = true;
    this.resetOverthinking();
    this.spinBtn.disabled = true;
    this.spinBtn.innerText = "SHUFFLING...";

    const spinTimeTotal = 2000;
    let spinTime = 0;
    const intervalTime = 100;

    const shuffleInterval = setInterval(() => {
      spinTime += intervalTime;
      
      const randomIndex = Math.floor(Math.random() * valid.length);
      this.shuffleText.innerText = valid[randomIndex].text;

      if (spinTime >= spinTimeTotal) {
        clearInterval(shuffleInterval);
        this.stopRotateWheel(valid);
      }
    }, intervalTime);
  }

  async stopRotateWheel(valid) {
    this.isSpinning = false;
    this.spinBtn.disabled = false;
    this.spinBtn.innerText = "SHUFFLE";

    // Plain random selection
    const randomIndex = Math.floor(Math.random() * valid.length);
    const winner = valid[randomIndex];

    this.shuffleText.innerText = winner.text;
    this.result = { ...winner };
    this.resultText.innerText = winner.text;
    this.resultModal.classList.remove('hidden');
    this.regretPrompt.classList.remove('hidden');
    this.regretStatusMessage.classList.add('hidden');

    // Save to Firebase Firestore
    if (this.currentUser) {
      try {
        const docRef = await db.collection("spins").add({
          userId: this.currentUser.uid,
          options: valid.map(o => o.text.trim()),
          result: winner.text,
          regretStatus: 'pending',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        this.result.dbId = docRef.id;
      } catch(e) {
        console.error("Firebase save error", e);
        this.fallbackLocalStorageSave(winner, valid);
      }
    } else {
      this.fallbackLocalStorageSave(winner, valid);
    }
  }

  fallbackLocalStorageSave(winner, valid) {
    console.warn("Using LocalStorage fallback.");
    const localId = 'loc_' + Date.now();
    const newSpin = {
      _id: localId,
      options: valid.map(o => o.text.trim()),
      result: winner.text,
      regretStatus: 'pending',
      timestamp: new Date().toISOString()
    };
    const saved = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
    saved.unshift(newSpin);
    localStorage.setItem('decisio_spins', JSON.stringify(saved.slice(0, 50)));
    this.result.dbId = localId;
  }

  // --- Regret ---
  async handleRegret(status) {
    if (!this.result || !this.result.dbId) return;

    if (this.currentUser && !this.result.dbId.toString().startsWith('loc_')) {
      try {
        await db.collection("spins").doc(this.result.dbId).update({
          regretStatus: status
        });
      } catch (e) {
        console.error("Firebase update error", e);
      }
    } else {
      // Local storage fallback
      const saved = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      const updated = saved.map(s => s._id === this.result.dbId ? { ...s, regretStatus: status } : s);
      localStorage.setItem('decisio_spins', JSON.stringify(updated));
    }

    this.regretPrompt.classList.add('hidden');
    this.regretStatusMessage.classList.remove('hidden');
    
    if (status === 'satisfied') {
      this.regretStatusMessage.innerText = "You're satisfied with this choice!";
      this.regretStatusMessage.style.color = 'green';
    } else {
      this.regretStatusMessage.innerText = "You regret this choice! Spin again next time.";
      this.regretStatusMessage.style.color = 'red';
    }
  }

  closeResult() {
    this.resultModal.classList.add('hidden');
    this.resetOverthinking();
  }
}

// Ensure globally accessible for inline onclicks
window.app = new DecisioApp();
