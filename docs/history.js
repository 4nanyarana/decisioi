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
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  const statsList = document.getElementById('statsList');
  const totalSpinsStat = document.getElementById('totalSpinsStat');
  const successRateStat = document.getElementById('successRateStat');
  const logoutBtn = document.getElementById('logoutBtn');

  let currentUser = null;

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
      window.location.href = 'login.html';
    });
  });

  // Watch Auth State
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      logoutBtn.classList.remove('hidden');
      loadFirebaseStats(user.uid);
    } else {
      currentUser = null;
      window.location.href = 'login.html'; // Require login to view history
      // Alternatively, we could load local stats if we wanted to allow guests:
      // logoutBtn.classList.add('hidden');
      // loadLocalStats();
    }
  });

  async function loadFirebaseStats(uid) {
    try {
      const snapshot = await db.collection("spins")
                               .where("userId", "==", uid)
                               .orderBy("timestamp", "desc")
                               .limit(50)
                               .get();
      
      const spins = [];
      snapshot.forEach(doc => {
        spins.push({ id: doc.id, ...doc.data() });
      });
      renderStats(spins);
    } catch(e) {
      console.error("Error fetching stats:", e);
      loadLocalStats(); // Fallback
    }
  }

  function loadLocalStats() {
    const spins = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
    renderStats(spins);
  }

  function renderStats(spins) {
    statsList.innerHTML = '';
    let satisfied = 0;
    let totalRegretChecked = 0;

    spins.forEach(s => {
      const li = document.createElement('li');
      li.className = 'activity-item';
      
      let badgeHtml = '';
      if (s.regretStatus && s.regretStatus !== 'pending') {
        totalRegretChecked++;
        if (s.regretStatus === 'satisfied') {
          satisfied++;
          badgeHtml = `<span class="badge badge-satisfied">Satisfied</span>`;
        } else {
          badgeHtml = `<span class="badge badge-regret">Regret</span>`;
        }
      }

      li.innerHTML = `
        <strong>${s.result}</strong>
        <div class="meta">From: ${s.options ? s.options.join(', ') : 'Unknown'}</div>
        ${badgeHtml}
      `;
      statsList.appendChild(li);
    });

    totalSpinsStat.innerText = spins.length;
    
    if (totalRegretChecked > 0) {
      const rate = Math.round((satisfied / totalRegretChecked) * 100);
      successRateStat.innerText = `${rate}%`;
    } else {
      successRateStat.innerText = '-';
    }
  }
});
