import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Wheel from './components/Wheel';
import './index.css';

// Audio Context for the ticking sound
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTick(freq = 400) {
  if(audioCtx.state === 'suspended') audioCtx.resume();
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
  if(audioCtx.state === 'suspended') audioCtx.resume();
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

export default function App() {
  const [options, setOptions] = useState([
    { id: 1, text: 'Pizza', weight: 1 },
    { id: 2, text: 'Burgers', weight: 1 },
    { id: 3, text: 'Tacos', weight: 1 }
  ]);
  const [mood, setMood] = useState('default');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [spins, setSpins] = useState([]);
  const [showStats, setShowStats] = useState(false);
  
  const [currentAngle, setCurrentAngle] = useState(0);
  const [overthinkingLevel, setOverthinkingLevel] = useState(100);
  const overthinkingTimer = useRef(null);

  // Overthinking Feature
  useEffect(() => {
    if (!isSpinning && !result) {
      overthinkingTimer.current = setInterval(() => {
        setOverthinkingLevel(prev => Math.max(0, prev - 1));
      }, 300);
    } else {
      clearInterval(overthinkingTimer.current);
    }
    return () => clearInterval(overthinkingTimer.current);
  }, [isSpinning, result]);

  const handleAddOption = () => {
    setOptions([...options, { id: Date.now(), text: '', weight: 1 }]);
    setOverthinkingLevel(100);
  };

  const updateOption = (id, text) => {
    setOptions(options.map(o => o.id === id ? { ...o, text } : o));
    setOverthinkingLevel(100);
  };

  const removeOption = (id) => {
    setOptions(options.filter(o => o.id !== id));
    setOverthinkingLevel(100);
  };

  const toggleWeight = (id) => {
    setOptions(options.map(o => o.id === id ? { ...o, weight: o.weight === 1 ? 3 : 1 } : o));
    setOverthinkingLevel(100);
  };

  const easeOut = (t, b, c, d) => {
    const ts = (t /= d) * t;
    const tc = ts * t;
    return b + c * (tc + -3 * ts + 3 * t);
  };

  const spin = () => {
    const valid = options.filter(o => o.text.trim());
    if (valid.length < 2) return alert("Needs 2 or more options!");

    setIsSpinning(true);
    setResult(null);
    setOverthinkingLevel(100);

    const spinTimeTotal = mood === 'hangry' ? 2000 : 4000 + Math.random() * 2000;
    const spinVelocity = mood === 'hangry' ? 40 : 20 + Math.random() * 10;
    let spinTime = 0;
    let lastAngle = currentAngle;
    let lastTickAngle = currentAngle;

    const rotateWheel = () => {
      spinTime += 30;
      if (spinTime >= spinTimeTotal) {
        stopRotateWheel(lastAngle);
        return;
      }
      
      const spinAngle = easeOut(spinTime, 0, spinVelocity, spinTimeTotal) * (Math.PI / 180);
      lastAngle += spinAngle;
      setCurrentAngle(lastAngle);

      // Web Audio Tick
      if (lastAngle - lastTickAngle > Math.PI / options.length) {
        playTick(400 + Math.random() * 200);
        lastTickAngle = lastAngle;
      }

      requestAnimationFrame(rotateWheel);
    };

    requestAnimationFrame(rotateWheel);
  };

  const stopRotateWheel = async (finalAngle) => {
    setIsSpinning(false);
    playWin();

    if (mood !== 'hangry') {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } else {
      confetti({ particleCount: 50, spread: 100, colors: ['#ef4444', '#f97316'], origin: { y: 0.6 } });
    }

    const valid = options.filter(o => o.text.trim());
    const totalWeights = valid.reduce((sum, opt) => sum + opt.weight, 0);
    const degrees = finalAngle * 180 / Math.PI;
    
    // Calculate which slice won
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

    setResult(winner);

    // Save
    try {
      const res = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          options: valid.map(o => o.text.trim()),
          result: winner.text
        })
      });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      setResult({ ...winner, dbId: data._id });
    } catch(e) {
      console.warn("Backend unavailable (likely on GitHub Pages). Using LocalStorage.");
      const localId = 'loc_' + Date.now();
      const newSpin = {
        _id: localId,
        options: valid.map(o => o.text.trim()),
        result: winner.text,
        mood: mood || 'default',
        regretStatus: 'pending',
        timestamp: new Date().toISOString()
      };
      const saved = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      saved.unshift(newSpin);
      localStorage.setItem('decisio_spins', JSON.stringify(saved.slice(0, 50)));
      setResult({ ...winner, dbId: localId });
    }
  };

  const loadStats = async () => {
    try {
      const r = await fetch('/api/stats');
      if (!r.ok) throw new Error('API unavailable');
      const d = await r.json();
      setSpins(d);
    } catch(e) { 
      console.warn("Using LocalStorage for stats.");
      const local = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      setSpins(local);
    }
  };

  const handleRegret = async (status) => {
    if (!result || !result.dbId) return;
    try {
      const res = await fetch('/api/spin/' + result.dbId + '/regret', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regretStatus: status })
      });
      if (!res.ok) throw new Error('API unavailable');
      setResult({ ...result, regretStatus: status });
    } catch(e) { 
      console.warn("Using LocalStorage to save regret status.");
      const saved = JSON.parse(localStorage.getItem('decisio_spins') || '[]');
      const updated = saved.map(s => s._id === result.dbId ? { ...s, regretStatus: status } : s);
      localStorage.setItem('decisio_spins', JSON.stringify(updated));
      setResult({ ...result, regretStatus: status });
    }
  };

  return (
    <>
      <div className={`background-effects theme-${mood}`}>
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <main className="container">
        <header>
          <div className="greeting">Hello, Decisive One ✨</div>
          <h1>Stop overthinking. <br/><span className="highlight">Just spin it.</span></h1>
        </header>

        <section className="app-layout">
          <div className="input-section glass-panel">
            <h2>
              Your Options
              <label className="mood-selector">
                Mood: 
                <select value={mood} onChange={e => setMood(e.target.value)}>
                  <option value="default">Default</option>
                  <option value="safe">Safe (Chill)</option>
                  <option value="hangry">Hangry (Fast!)</option>
                </select>
              </label>
            </h2>

            <div className="confidence-meter" title="Overthinking Meter">
              <div className="confidence-fill" style={{ 
                width: `${overthinkingLevel}%`, 
                backgroundColor: overthinkingLevel > 50 ? '#10b981' : overthinkingLevel > 20 ? '#f59e0b' : '#ef4444' 
              }}></div>
            </div>

            <div className="input-group">
              {options.map((opt, idx) => (
                <div key={opt.id} className="input-entry">
                  <button 
                    className={`weight-btn ${opt.weight > 1 ? 'active' : ''}`}
                    onClick={() => toggleWeight(opt.id)}
                    title="Toggle Favorite (Weighted Spin)"
                  >★</button>
                  <input 
                    type="text" 
                    value={opt.text} 
                    onChange={e => updateOption(opt.id, e.target.value)} 
                    placeholder={`Option ${idx + 1}`}
                  />
                  {options.length > 2 && (
                    <button className="remove-btn" onClick={() => removeOption(opt.id)}>×</button>
                  )}
                </div>
              ))}
              <button className="add-btn" onClick={handleAddOption}>+ Add Another Option</button>
            </div>

            <div className="controls">
              <button className="btn primary" onClick={spin} disabled={isSpinning}>
                <span className="icon">🎡</span> {mood === 'hangry' ? 'SPIN NOW!!' : 'Spin It'}
              </button>
              <button className="btn secondary" onClick={() => { setShowStats(true); loadStats(); }}>
                <span className="icon">📊</span> Stats
              </button>
            </div>

            {result && (
              <div className="result-box success">
                ✨ You got: <strong>{result.text}</strong>!
                {!result.regretStatus && result.dbId && (
                  <div className="regret-prompt">
                    <button className="regret-btn satisfied" onClick={() => handleRegret('satisfied')}>Loved it!</button>
                    <button className="regret-btn regret" onClick={() => handleRegret('regret')}>Regret it!</button>
                  </div>
                )}
                {result.regretStatus === 'satisfied' && <p style={{marginTop: 10, fontSize: '0.9rem', color: '#10b981'}}>You're satisfied with this choice!</p>}
                {result.regretStatus === 'regret' && <p style={{marginTop: 10, fontSize: '0.9rem', color: '#ef4444'}}>You regret this choice! Spin again next time.</p>}
              </div>
            )}
          </div>

          <Wheel 
            options={options} 
            isSpinning={isSpinning} 
            currentAngle={currentAngle} 
            mood={mood} 
          />
        </section>

        {/* Stats Slide-over */}
        <div className={`stats-box glass-panel ${!showStats ? 'hidden' : ''}`}>
          <div className="stats-header">
            <h3>Recent Spins & Regret Log</h3>
            <button className="close-btn" onClick={() => setShowStats(false)}>&times;</button>
          </div>
          <ul className="stats-list">
            {spins.length === 0 ? <li>Loading or no stats...</li> : spins.map(s => (
              <li key={s._id}>
                <strong>{s.result}</strong>
                <span>From: {s.options.join(', ')}</span>
                {s.regretStatus && (
                  <div className={`status-badge status-${s.regretStatus}`}>
                    {s.regretStatus === 'satisfied' ? 'Satisfied 😊' : 'Regret 😞'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  );
}
