import React, { useEffect, useRef } from 'react';
import styles from './QuantumShatterTransition.module.css';

const PARTICLE_COUNT = 1400;

export default function QuantumShatterTransition({ onComplete, originRect = null }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    // Origin of initial button blast, default to screen center or originRect
    const blastOriginX = originRect ? originRect.left + originRect.width / 2 : width * 0.5;
    const blastOriginY = originRect ? originRect.top + originRect.height / 2 : height * 0.5;

    // Generate full-screen volumetric particles
    const particles = [];
    const colors = ['#c084fc', '#a855f7', '#818cf8', '#6366f1', '#38bdf8', '#e0e7ff', '#ffffff'];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 55% of particles burst from the interaction origin; 45% spawn across the entire screen
      const isFromOrigin = Math.random() < 0.55;
      let startX, startY, vx, vy;

      if (isFromOrigin) {
        const angle = Math.random() * Math.PI * 2;
        const blastSpeed = Math.random() * 32 + 8;
        const radius = Math.random() * 220;
        startX = blastOriginX + Math.cos(angle) * radius;
        startY = blastOriginY + Math.sin(angle) * radius;
        vx = Math.cos(angle) * blastSpeed;
        vy = Math.sin(angle) * blastSpeed;
      } else {
        // Distributed across the entire screen (left panel, header, footer, background)
        startX = Math.random() * width;
        startY = Math.random() * height;
        const angle = Math.atan2(startY - height / 2, startX - width / 2);
        const speed = Math.random() * 20 + 4;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }

      particles.push({
        x: startX,
        y: startY,
        z: Math.random() * 700 + 40, // 3D depth towards viewer
        vx,
        vy,
        vz: Math.random() * 45 + 20, // Forward warp speed
        size: Math.random() * 3.5 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        trailLength: Math.random() * 24 + 10,
      });
    }

    const startTime = performance.now();
    const duration = 1200; // ~1.2s total snappy cinematic warp fly-through
    let animId;

    const render = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, width, height);

      // Deep space hyperspace backdrop bloom across entire canvas
      const grad = ctx.createRadialGradient(
        width / 2, height / 2, 20,
        width / 2, height / 2, Math.max(width, height) * 0.95
      );

      // Flash & dark warp tunnel
      if (progress < 0.35) {
        const flashIntensity = Math.sin((progress / 0.35) * Math.PI);
        grad.addColorStop(0, `rgba(168, 85, 247, ${0.4 + flashIntensity * 0.35})`);
        grad.addColorStop(0.35, `rgba(99, 102, 241, ${0.3 + flashIntensity * 0.25})`);
        grad.addColorStop(0.7, `rgba(15, 23, 42, ${0.65 + flashIntensity * 0.2})`);
        grad.addColorStop(1, 'rgba(2, 6, 23, 0.96)');
      } else {
        const fadeOut = Math.max(0, (1 - progress) / 0.65);
        grad.addColorStop(0, `rgba(124, 58, 237, ${fadeOut * 0.35})`);
        grad.addColorStop(0.4, `rgba(56, 189, 248, ${fadeOut * 0.2})`);
        grad.addColorStop(1, `rgba(2, 6, 23, ${Math.min(0.95, fadeOut * 0.95)})`);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Camera Fly-Through Warp Speed
      // Camera moves rapidly from origin towards global screen center
      const camTargetX = width / 2;
      const camTargetY = height / 2;
      const camCurrentX = blastOriginX + (camTargetX - blastOriginX) * Math.min(progress * 1.8, 1);
      const camCurrentY = blastOriginY + (camTargetY - blastOriginY) * Math.min(progress * 1.8, 1);

      particles.forEach((p) => {
        // Accelerate Z towards screen
        p.z += p.vz * 1.9;
        const perspective = Math.max(0.1, p.z / 120);

        // Move outwards from the moving camera center
        p.x += p.vx * 1.1;
        p.y += p.vy * 1.1;

        // Projected 3D position
        const screenX = camCurrentX + (p.x - camCurrentX) * (1 + progress * 1.4);
        const screenY = camCurrentY + (p.y - camCurrentY) * (1 + progress * 1.4);

        // Fade in rapidly, then fade out near end
        let pAlpha = 1;
        if (progress > 0.6) {
          pAlpha = Math.max(0, (1 - progress) / 0.4);
        }

        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = pAlpha;

        const pRadius = p.size * perspective * 0.6;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(screenX, screenY, Math.min(pRadius, 18), 0, Math.PI * 2);
        ctx.fill();

        // Warp speed motion streaks (stretching away from center of flight)
        if (progress > 0.05 && progress < 0.92) {
          const streakFactor = Math.min((progress / 0.35), 1) * p.trailLength * perspective * 0.45;
          const dirX = screenX - camCurrentX;
          const dirY = screenY - camCurrentY;
          const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.min(p.size * perspective * 0.45, 4.5);
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(
            screenX - (dirX / dirLen) * streakFactor * 4,
            screenY - (dirY / dirLen) * streakFactor * 4
          );
          ctx.stroke();
        }

        ctx.restore();
      });

      // Shockwave rings expanding across entire screen
      if (progress > 0.1 && progress < 0.8) {
        const ringP = (progress - 0.1) / 0.7;
        ctx.save();
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 32;
        ctx.strokeStyle = `rgba(192, 132, 252, ${(1 - ringP) * 0.75})`;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, ringP * Math.max(width, height) * 0.85, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (progress < 1) {
        animId = requestAnimationFrame(render);
      } else {
        if (onComplete) onComplete();
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [onComplete, originRect]);

  return (
    <div className={styles.overlay}>
      <div className={styles.flash} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
