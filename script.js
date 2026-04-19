const spinBtn = document.getElementById('spinBtn');
const statsBtn = document.getElementById('statsBtn');
const closeStatsBtn = document.getElementById('closeStatsBtn');
const optionsInput = document.getElementById('optionsInput');
const resultBox = document.getElementById('resultBox');
const statsBox = document.getElementById('statsBox');
const statsList = document.getElementById('statsList');
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');

let options = ['Pizza', 'Burgers', 'Tacos', 'Sushi'];
let currentAngle = 0;
let isSpinning = false;
let animationFrameId;

// Harmonious wheel colors
const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', 
    '#f59e0b', '#10b981', '#06b6d4', '#6366f1'
];

function drawWheel() {
    const value = optionsInput.value.trim();
    if (value) {
        options = value.split(',').map(s => s.trim()).filter(s => s);
    }
    if (options.length === 0) {
        options = ['Enter', 'Options'];
    }

    const startAngle = currentAngle;
    const arc = Math.PI * 2 / options.length;
    const padding = 20;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = cx - padding;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < options.length; i++) {
        const angle = startAngle + i * arc;
        const color = colors[i % colors.length];

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc, false);
        ctx.fill();
        ctx.save();

        // Stroke
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Label
        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Outfit, sans-serif';
        // Add shadow for better readability
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(options[i], radius - 20, 6);
        ctx.restore();
    }
}

// Initial draw
drawWheel();

optionsInput.addEventListener('input', drawWheel);

spinBtn.addEventListener('click', () => {
    if (isSpinning) return;
    
    let currentOptions = optionsInput.value.trim() 
        ? optionsInput.value.split(',').map(s => s.trim()).filter(s => s)
        : options;

    if(currentOptions.length < 2) {
        showResult('Please enter at least two options to spin.', false);
        return;
    }

    options = currentOptions;
    drawWheel();

    isSpinning = true;
    spinBtn.disabled = true;
    resultBox.classList.add('hidden');
    
    // Spin mechanics
    const spinTimeTotal = 4000 + Math.random() * 2000;
    let spinTime = 0;
    const spinVelocity = 20 + Math.random() * 10;
    
    // Pointer is on the RIGHT side (0 radians is right)
    // The wheel draws starting from right and goes clockwise.
    // The pointer points exactly at angle 0.
    
    function easeOut(t, b, c, d) {
        const ts = (t /= d) * t;
        const tc = ts * t;
        return b + c * (tc + -3 * ts + 3 * t);
    }

    function rotateWheel() {
        spinTime += 30;
        if (spinTime >= spinTimeTotal) {
            stopRotateWheel();
            return;
        }
        
        const spinAngle = easeOut(spinTime, 0, spinVelocity, spinTimeTotal) * (Math.PI / 180);
        currentAngle += spinAngle;
        drawWheel();
        animationFrameId = requestAnimationFrame(rotateWheel);
    }

    rotateWheel();
});

async function stopRotateWheel() {
    cancelAnimationFrame(animationFrameId);
    isSpinning = false;
    spinBtn.disabled = false;

    // Calculate chosen option
    // currentAngle points the 0-index start.
    // Pointer is at 0 radians (right side).
    const arc = Math.PI * 2 / options.length;
    // We normalize current angle and figure out which slice is at 0 radians.
    // Since wheel moves clockwise, slices move past the pointer.
    const degrees = currentAngle * 180 / Math.PI;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - (degrees % 360)) / arcd) % options.length;
    const chosen = options[index];

    showResult(`✨ You got: <strong>${chosen}</strong>!`, true);
    
    // Save to API
    try {
        await fetch('/api/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ options, result: chosen })
        });
    } catch(e) {
        console.error('Failed to save spin', e);
    }
}

function showResult(msg, isSuccess) {
    resultBox.innerHTML = msg;
    resultBox.classList.remove('hidden');
    if(isSuccess) {
        resultBox.classList.add('success');
    } else {
        resultBox.classList.remove('success');
    }
}

statsBtn.addEventListener('click', async () => {
    statsBox.classList.toggle('hidden');
    if (!statsBox.classList.contains('hidden')) {
        loadStats();
    }
});

closeStatsBtn.addEventListener('click', () => {
    statsBox.classList.add('hidden');
});

async function loadStats() {
    statsList.innerHTML = '<li>Loading...</li>';
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        
        statsList.innerHTML = '';
        if(data.length === 0) {
            statsList.innerHTML = '<li>No spins yet. Spin the wheel first!</li>';
        } else {
            data.forEach(spin => {
                const li = document.createElement('li');
                const date = new Date(spin.timestamp).toLocaleString();
                li.innerHTML = `
                    <strong>${spin.result}</strong>
                    <span>From: ${spin.options.join(', ')}</span>
                    <small>${date}</small>
                `;
                statsList.appendChild(li);
            });
        }
    } catch(e) {
        statsList.innerHTML = '<li>Failed to load stats. Is backend running?</li>';
    }
}
