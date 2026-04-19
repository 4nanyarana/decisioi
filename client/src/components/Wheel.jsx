import React, { useRef, useEffect } from 'react';

const COLORS = {
  default: ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'],
  safe: ['#10b981', '#059669', '#0ea5e9', '#0284c7', '#14b8a6', '#0d9488', '#3b82f6', '#2563eb'],
  hangry: ['#ef4444', '#dc2626', '#f97316', '#ea580c', '#eab308', '#ca8a04', '#f43f5e', '#e11d48']
};

export default function Wheel({ options, isSpinning, currentAngle, mood }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let validOptions = options.map(o => o.text.trim()).filter(s => s);
    if (validOptions.length === 0) validOptions = ['Enter', 'Options'];

    // Weighted slice sizes logic
    // Sum of all weights
    const totalWeights = options.reduce((sum, opt) => sum + opt.weight, 0) || validOptions.length;
    
    let currentSliceStartAngle = currentAngle;
    const padding = 20;
    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = cx - padding;

    ctx.clearRect(0, 0, width, height);

    const activeColors = COLORS[mood] || COLORS.default;

    for (let i = 0; i < validOptions.length; i++) {
        // Calculate the slice for this option based on its weight
        const optWeight = options[i]?.weight || 1;
        const arc = (Math.PI * 2) * (optWeight / totalWeights);
        const angle = currentSliceStartAngle;
        const color = activeColors[i % activeColors.length];

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, angle, angle + arc, false);
        ctx.fill();
        ctx.save();

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        ctx.translate(cx, cy);
        ctx.rotate(angle + arc / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Outfit, sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.fillText(validOptions[i], radius - 20, 6);
        ctx.restore();

        currentSliceStartAngle += arc;
    }
  }, [options, currentAngle, mood]);

  return (
    <div className="wheel-container">
      <div className="pointer"></div>
      <canvas ref={canvasRef} width="400" height="400" id="wheelCanvas"></canvas>
    </div>
  );
}
