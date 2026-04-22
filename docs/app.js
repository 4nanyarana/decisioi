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


const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTick(freq = 400) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = freq;
  osc.type = 'triangle';
  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
}

function playWin() {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.setValueAtTime(400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.5);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1);
  osc.start();
  osc.stop(audioCtx.currentTime + 1);
}

const easeOut = (t, b, c, d) => {
  const ts = (t /= d) * t;
  const tc = ts * t;
  return b + c * (tc + -3 * ts + 3 * t);
};

const HSL_COLORS = [
  'hsl(330, 80%, 60%)', 'hsl(260, 80%, 65%)', 'hsl(190, 80%, 55%)',
  'hsl(140, 70%, 50%)', 'hsl(40,  90%, 55%)', 'hsl(10,  80%, 60%)'
];

class DecisioApp {
  constructor() {
    this.options = [
      { id: 1, text: 'Pizza', weight: 1 },
      { id: 2, text: 'Burgers', weight: 1 },
      { id: 3, text: 'Tacos', weight: 1 }
    ];
    this.mood = 'default';
    this.isSpinning = false;
    this.currentAngle = 0;
    this.overthinkingLevel = 100;
    this.result = null;
    this.spins = [];
    this.overthinkingTimer = null;
    this.currentUser = null;

    this.cacheDOM();
    this.bindEvents();
    this.renderOptions();
    this.updateWheelCSS();
    this.startOverthinking();
    
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
        this.loadStats();
      } else {
        this.currentUser = null;
        this.authModal.classList.remove('hidden');
        this.logoutBtn.classList.add('hidden');
        this.greetingUser.innerText = 'Decisive One';
        this.spins = [];
        this.renderStats();
      }
    });
  }

  cacheDOM() {
    this.optionsList = document.getElementById('optionsList');
    this.addOptionBtn = document.getElementById('addOptionBtn');
    this.moodSelect = document.getElementById('moodSelect');
    this.confidenceFill = document.getElementById('confidenceFill');
    this.wheel = document.getElementById('wheel');
    this.spinBtn = document.getElementById('spinBtn');
    this.resultModal = document.getElementById('resultModal');
    this.resultText = document.getElementById('resultText');
    this.regretPrompt = document.getElementById('regretPrompt');
    this.regretStatusMessage = document.getElementById('regretStatusMessage');
    this.statsList = document.getElementById('statsList');
    this.totalSpinsStat = document.getElementById('totalSpinsStat');
    this.successRateStat = document.getElementById('successRateStat');
  }

  bindEvents() {
    this.addOptionBtn.addEventListener('click', () => this.addOption());
    this.moodSelect.addEventListener('change', (e) => this.setMood(e.target.value));
    this.spinBtn.addEventListener('click', () => this.spin());
  }

  setMood(newMood) {
    this.mood = newMood;
    document.body.className = `theme-${newMood}`;
    this.resetOverthinking();
  }

  startOverthinking() {
    if (this.overthinkingTimer) clearInterval(this.overthinkingTimer);
    this.overthinkingTimer = setInterval(() => {
      if (!this.isSpinning && !this.result) {
        this.overthinkingLevel = Math.max(0, this.overthinkingLevel - 1);
        this.updateOverthinkingUI();
      }
    }, 300);
  }

  resetOverthinking() {
    this.overthinkingLevel = 100;
    this.updateOverthinkingUI();
    this.resultModal.classList.add('hidden');
    this.result = null;
  }

  updateOverthinkingUI() {
    this.confidenceFill.style.width = `${this.overthinkingLevel}%`;
    if (this.overthinkingLevel > 50) this.confidenceFill.style.backgroundColor = '#10b981';
    else if (this.overthinkingLevel > 20) this.confidenceFill.style.backgroundColor = '#f59e0b';
    else this.confidenceFill.style.backgroundColor = '#ef4444';
  }

  // --- Options Management ---
  addOption() {
    this.options.push({ id: Date.now(), text: '', weight: 1 });
    this.resetOverthinking();
    this.renderOptions();
    this.updateWheelCSS();
  }

  updateOption(id, text) {
    const opt = this.options.find(o => o.id === id);
    if (opt) {
      opt.text = text;
      this.resetOverthinking();
      this.updateWheelCSS();
    }
  }

  removeOption(id) {
    if (this.options.length <= 2) return;
    this.options = this.options.filter(o => o.id !== id);
    this.resetOverthinking();
    this.renderOptions();
    this.updateWheelCSS();
  }

  toggleWeight(id) {
    const opt = this.options.find(o => o.id === id);
    if (opt) {
      opt.weight = opt.weight === 1 ? 3 : 1;
      this.resetOverthinking();
      this.renderOptions();
      this.updateWheelCSS();
    }
  }

  renderOptions() {
    this.optionsList.innerHTML = '';
    this.options.forEach((opt, idx) => {
      const dv = document.createElement('div');
      dv.className = 'option-entry';
      
      const starBtn = document.createElement('button');
      starBtn.className = `weight-btn ${opt.weight > 1 ? 'active' : ''}`;
      starBtn.innerHTML = '★';
      starBtn.title = "Toggle Favorite (Weighted Spin)";
      starBtn.onclick = () => this.toggleWeight(opt.id);

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'option-input';
      inp.value = opt.text;
      inp.placeholder = `Option ${idx + 1}`;
      inp.oninput = (e) => this.updateOption(opt.id, e.target.value);

      dv.appendChild(starBtn);
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

  // --- Wheel CSS Generation ---
  getValidOptions() {
    return this.options.filter(o => o.text.trim() !== '');
  }

  updateWheelCSS() {
    const valid = this.getValidOptions();
    this.wheel.innerHTML = ''; // clear labels
    if (valid.length === 0) {
      this.wheel.style.background = '#111';
      return;
    }

    const totalWeight = valid.reduce((sum, o) => sum + o.weight, 0);
    let accum = 0;
    const gradients = [];

    valid.forEach((opt, idx) => {
      const sliceSize = (opt.weight / totalWeight) * 360;
      const degStart = accum;
      const degEnd = accum + sliceSize;
      const color = HSL_COLORS[idx % HSL_COLORS.length];
      
      gradients.push(`${color} ${degStart}deg ${degEnd}deg`);

      // Add label
      const midAngle = degStart + (sliceSize / 2);
      const lbl = document.createElement('div');
      lbl.className = 'wheel-label';
      lbl.innerText = opt.text;
      lbl.style.transform = `translate(-50%, -50%) rotate(${midAngle - 90}deg) translate(120px) rotate(90deg)`;
      this.wheel.appendChild(lbl);

      accum += sliceSize;
    });

    this.wheel.style.background = `conic-gradient(${gradients.join(', ')})`;
    this.wheel.style.transform = `rotate(${this.currentAngle}rad)`;
  }

  // --- Spinning Logic ---
  spin() {
    const valid = this.getValidOptions();
    if (valid.length < 2) return alert("Needs 2 or more options!");

    this.isSpinning = true;
    this.resetOverthinking();
    this.spinBtn.disabled = true;

    const spinTimeTotal = this.mood === 'hangry' ? 2000 : 4000 + Math.random() * 2000;
    const spinVelocity = this.mood === 'hangry' ? 40 : 20 + Math.random() * 10;
    let spinTime = 0;
    let lastAngle = this.currentAngle;
    let lastTickAngle = this.currentAngle;

    const rotateWheel = () => {
      spinTime += 30;
      if (spinTime >= spinTimeTotal) {
        this.stopRotateWheel(lastAngle, valid);
        return;
      }
      
      const spinAngle = easeOut(spinTime, 0, spinVelocity, spinTimeTotal) * (Math.PI / 180);
      lastAngle += spinAngle;
      this.currentAngle = lastAngle;

      this.wheel.style.transform = `rotate(${this.currentAngle}rad)`;

      // Tick sound
      if (lastAngle - lastTickAngle > Math.PI / valid.length) {
        playTick(400 + Math.random() * 200);
        lastTickAngle = lastAngle;
      }

      requestAnimationFrame(rotateWheel);
    };

    requestAnimationFrame(rotateWheel);
  }

  async stopRotateWheel(finalAngle, valid) {
    this.isSpinning = false;
    this.spinBtn.disabled = false;
    playWin();

    if (this.mood !== 'hangry') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, zIndex: 100 });
    } else {
      confetti({ particleCount: 50, spread: 100, colors: ['#ef4444', '#f97316'], origin: { y: 0.6 }, zIndex: 100 });
    }

    const totalWeights = valid.reduce((sum, opt) => sum + opt.weight, 0);
    const degrees = finalAngle * 180 / Math.PI;
    
    let winner = valid[0];
    let accumulated = 0;
    const pointerAngle = (360 - (degrees % 360)) % 360;
    
    for (let opt of valid) {
      const sliceSize = (opt.weight / totalWeights) * 360;
      if (pointerAngle >= accumulated && pointerAngle < accumulated + sliceSize) {
        winner = opt;
        break;
      }
      accumulated += sliceSize;
    }

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
          mood: this.mood,
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

    this.loadStats();
  }

  fallbackLocalStorageSave(winner, valid) {
    console.warn("Using LocalStorage fallback.");
    const localId = 'loc_' + Date.now();
    const newSpin = {
      _id: localId,
      options: valid.map(o => o.text.trim()),
      result: winner.text,
      mood: this.mood,
      regretStatus: 'pending',
      timestamp: new Date().toISOString()
    };
    const saved = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
    saved.unshift(newSpin);
    localStorage.setItem('decisio_spins', JSON.stringify(saved.slice(0, 50)));
    this.result.dbId = localId;
  }
  // --- Regret & Stats ---
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
      this.regretStatusMessage.style.color = 'var(--secondary-glow)';
    } else {
      this.regretStatusMessage.innerText = "You regret this choice! Spin again next time.";
      this.regretStatusMessage.style.color = 'var(--danger-color)';
    }

    this.loadStats();
  }

  closeResult() {
    this.resultModal.classList.add('hidden');
    // We do NOT set result to null here immediately so that we don't accidentally erase history,
    // but we can call resetOverthinking to get the meter going again.
    this.resetOverthinking();
  }

  async loadStats() {
    let stats = [];
    if (this.currentUser) {
      try {
        const snapshot = await db.collection("spins")
          .where("userId", "==", this.currentUser.uid)
          .orderBy("timestamp", "desc")
          .limit(10)
          .get();
          
        snapshot.forEach(doc => {
          stats.push({ _id: doc.id, ...doc.data() });
        });
      } catch(e) {
        console.error("Firestore stats load error", e);
        // Fallback to local
        stats = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      }
    } else {
      stats = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
    }

    this.spins = stats;
    this.renderStats();
  }

  renderStats() {
    this.statsList.innerHTML = '';
    let satisfied = 0;
    let totalRegretChecked = 0;

    this.spins.forEach(s => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      
      let badgeHtml = '';
      if (s.regretStatus && s.regretStatus !== 'pending') {
        totalRegretChecked++;
        if (s.regretStatus === 'satisfied') {
          satisfied++;
          badgeHtml = `<span class="badge badge-satisfied">Satisfied 😊</span>`;
        } else {
          badgeHtml = `<span class="badge badge-regret">Regret 😞</span>`;
        }
      }

      li.innerHTML = `
        <strong>${s.result}</strong>
        <div class="meta">From: ${s.options.join(', ')}</div>
        ${badgeHtml}
      `;
      this.statsList.appendChild(li);
    });

    this.totalSpinsStat.innerText = this.spins.length;
    
    if (totalRegretChecked > 0) {
      const rate = Math.round((satisfied / totalRegretChecked) * 100);
      this.successRateStat.innerText = `${rate}%`;
    } else {
      this.successRateStat.innerText = '-';
    }
  }
}

// Ensure globally accessible for inline onclicks
window.app = new DecisioApp();
