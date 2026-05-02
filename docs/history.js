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
      window.location.href = 'index.html';
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
      window.location.href = 'index.html'; // Require login to view history
      // Alternatively, we could load local stats if we wanted to allow guests:
      // logoutBtn.classList.add('hidden');
      // loadLocalStats();
    }
  });

  async function loadFirebaseStats(uid) {
    try {
      const snapshot = await db.collection("spins")
                               .where("userId", "==", uid)
                               .limit(50)
                               .get();
      
      const spins = [];
      snapshot.forEach(doc => {
        spins.push({ id: doc.id, ...doc.data() });
      });
      
      // Merge with local storage spins in case Firebase writes failed
      const localSpins = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      const allSpins = [...spins];
      
      localSpins.forEach(ls => {
        if (!allSpins.find(s => s.id === ls._id)) {
          allSpins.push({
            id: ls._id,
            options: ls.options,
            result: ls.result,
            regretStatus: ls.regretStatus,
            timestamp: { toMillis: () => new Date(ls.timestamp).getTime() }
          });
        }
      });

      // Sort by timestamp descending
      allSpins.sort((a, b) => {
        let tA = 0;
        let tB = 0;
        if (a.timestamp && typeof a.timestamp.toMillis === 'function') tA = a.timestamp.toMillis() || 0;
        if (b.timestamp && typeof b.timestamp.toMillis === 'function') tB = b.timestamp.toMillis() || 0;
        return tB - tA;
      });
      
      renderStats(allSpins);
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
    
    if (spins.length === 0) {
      statsList.innerHTML = '<li class="activity-item" style="justify-content: center; color: var(--text-muted); font-style: italic;">No decisions made yet. Go spin!</li>';
    }

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

  // Feature: Clear History
  window.clearHistory = async function() {
    if (!confirm("Are you sure you want to clear your decision history?")) return;
    if (currentUser) {
      try {
        const snapshot = await db.collection("spins").where("userId", "==", currentUser.uid).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        localStorage.removeItem('decisio_spins');
        renderStats([]);
      } catch (e) {
        console.error("Error clearing history", e);
      }
    } else {
      localStorage.removeItem('decisio_spins');
      renderStats([]);
    }
  };
});
