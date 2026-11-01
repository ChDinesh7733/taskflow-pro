import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, RotateCcw, Volume2, VolumeX, FastForward, Maximize2 } from 'lucide-react';
import styles from './CinematicReelModal.module.css';

const DURATION = 24000; // 24s total keynote commercial
const PARTICLE_COUNT = 850;

export default function CinematicReelModal({ isOpen, onClose }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(performance.now());
  const manualProgressRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currProgress, setCurrProgress] = useState(0);
  const [sceneTitle, setSceneTitle] = useState('Sign In to Superiority.');
  const [sceneSub, setSceneSub] = useState('Glassmorphism login panel · Volumetric lighting · Continuous one-shot camera');
  const [scenePhase, setScenePhase] = useState('ACT I: MACRO LOGIN');

  // Web Audio Synth for sci-fi commercial ambience
  const audioCtxRef = useRef(null);
  const soundPlayedRef = useRef({});

  const playSynthesizedFx = useCallback((type) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'shatter') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === 'whoosh') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {}
  }, [isMuted]);

  // Particles & Objects
  const particlesRef = useRef([]);
  useEffect(() => {
    const pts = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pts.push({
        origX: (Math.random() - 0.5) * 440,
        origY: (Math.random() - 0.5) * 400,
        z: (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16,
        vz: (Math.random() * 20) + 5,
        size: Math.random() * 3 + 1.5,
        color: Math.random() > 0.4 ? '#a855f7' : (Math.random() > 0.5 ? '#6366f1' : '#38bdf8'),
      });
    }
    particlesRef.current = pts;
  }, []);

  const spring = (t, b = 0, c = 1, d = 1) => {
    const s = 1.70158;
    const progress = Math.min(Math.max(t / d, 0), 1);
    return c * ((progress - 1) * progress * ((s + 1) * progress + s) + 1) + b;
  };

  const easeInOutQuad = (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

  // Render Scene at progress [0, 1]
  const renderFrame = useCallback((progress, width, height, ctx) => {
    ctx.clearRect(0, 0, width, height);

    // Deep Indigo Radial Backdrop
    const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.9);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#090d16');
    bgGrad.addColorStop(1, '#020617');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // SCENE 1: MACRO LOGIN (0.00 - 0.12)
    if (progress < 0.13) {
      setScenePhase('ACT I: MACRO LOGIN');
      setSceneTitle('Sign In to Superiority.');
      setSceneSub('Precision glassmorphism · Glowing capacitive purple trigger');

      const p1 = progress / 0.12;
      const camZoom = 1 + p1 * 0.14;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(camZoom, camZoom);

      const panelW = 380;
      const panelH = 430;

      // Glass panel
      ctx.shadowColor = 'rgba(168, 85, 247, 0.4)';
      ctx.shadowBlur = 40;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 24);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TaskFlow Pro', 0, -panelH / 2 + 70);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Autonomous AI Workflow Suite', 0, -panelH / 2 + 96);

      // Inputs
      ctx.fillStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(-panelW / 2 + 30, -50, panelW - 60, 46, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('demo@taskflow.dev', -panelW / 2 + 48, -22);

      ctx.beginPath();
      ctx.roundRect(-panelW / 2 + 30, 16, panelW - 60, 46, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillText('••••••••••••', -panelW / 2 + 48, 44);

      // Glowing Purple Sign In Button
      const btnY = 90;
      const btnH = 50;
      const btnW = panelW - 60;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = Math.sin(progress * 60) * 15 + 28;
      const btnGrad = ctx.createLinearGradient(-btnW / 2, btnY, btnW / 2, btnY + btnH);
      btnGrad.addColorStop(0, '#7c3aed');
      btnGrad.addColorStop(1, '#6366f1');
      ctx.fillStyle = btnGrad;
      ctx.beginPath();
      ctx.roundRect(-btnW / 2, btnY, btnW, btnH, 14);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sign In', 0, btnY + 31);

      // Luminous Cursor
      const curX = 160 * (1 - easeInOutQuad(p1));
      const curY = 220 - (220 - (btnY + 25)) * easeInOutQuad(p1);
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(curX, curY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Trigger audio click once
      if (p1 > 0.95 && !soundPlayedRef.current['click']) {
        soundPlayedRef.current['click'] = true;
        playSynthesizedFx('click');
      }

      ctx.restore();
    }
    // SCENE 2: QUANTUM SHATTER (0.12 - 0.25)
    else if (progress < 0.26) {
      setScenePhase('ACT II: QUANTUM SHATTER');
      setSceneTitle('Dissolving Boundaries.');
      setSceneSub('High-speed camera flight through 850+ volumetric digital particles');

      if (!soundPlayedRef.current['shatter']) {
        soundPlayedRef.current['shatter'] = true;
        playSynthesizedFx('shatter');
      }

      const p2 = (progress - 0.12) / 0.14;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      particlesRef.current.forEach((pt) => {
        const dist = pt.vz * p2 * 100;
        const px = pt.origX + pt.vx * p2 * 60;
        const py = pt.origY + pt.vy * p2 * 60;
        const scale = Math.max(0.1, (pt.z + dist) / 100);
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, 1 - p2 * 1.3);
        ctx.beginPath();
        ctx.arc(px * scale, py * scale, pt.size * scale, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    // SCENE 3: DASHBOARD MANIFESTATION (0.26 - 0.52)
    else if (progress < 0.52) {
      setScenePhase('ACT III: DASHBOARD MANIFESTATION');
      setSceneTitle('TaskFlow Pro Unleashed.');
      setSceneSub('Spring-physics KPI cards · Pulsing neon lines · 3D task flight');

      const p3 = (progress - 0.26) / 0.26;
      const panX = Math.sin(p3 * Math.PI) * 40;

      ctx.save();
      ctx.translate(panX, 0);

      // Sidebar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(0, 0, 240, height, 0);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(38, 48, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TaskFlow PRO', 62, 54);

      // Stat cards
      const stats = [
        { label: 'TOTAL TASKS', val: '33', color: '#6366f1' },
        { label: 'TO DO', val: '8', color: '#f59e0b' },
        { label: 'IN PROGRESS', val: '14', color: '#3b82f6' },
        { label: 'IN REVIEW', val: '5', color: '#a855f7' },
        { label: 'DONE', val: '6', color: '#10b981' }
      ];

      const mainLeft = 270;
      const cardW = (width - mainLeft - 40 - 4 * 16) / 5;
      stats.forEach((st, idx) => {
        const cx = mainLeft + idx * (cardW + 16);
        const cy = 40;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.roundRect(cx, cy, cardW, 100, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(st.label, cx + 18, cy + 30);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 28px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(st.val, cx + 18, cy + 66);

        // Neon Pulse line
        ctx.shadowColor = st.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = st.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + 18, cy + 100);
        ctx.lineTo(cx + cardW - 18, cy + 100);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Glowing White AI Bar
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 35;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.roundRect(mainLeft, 165, width - mainLeft - 40, 54, 16);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#7c3aed';
      ctx.font = '800 15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('✦ Smart Task Creation: Deploy multi-cloud cluster tomorrow 4pm urgent #devops', mainLeft + 22, 198);

      ctx.restore();
    }
    // SCENE 4: 3D CARD ZOOM & AI DECOMPOSITION (0.52 - 0.75)
    else if (progress < 0.75) {
      setScenePhase('ACT IV: SUB-ATOMIC INTELLIGENCE');
      setSceneTitle('Sub-Atomic Task Intelligence.');
      setSceneSub('Holographic subtask branching · Live spatial collaborator cursor trails');

      const p4 = (progress - 0.52) / 0.23;
      const cardZoom = 1.3 + Math.sin(p4 * Math.PI) * 0.1;

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(cardZoom, cardZoom);

      const hW = 460;
      const hH = 320;
      ctx.shadowColor = 'rgba(124, 58, 237, 0.45)';
      ctx.shadowBlur = 45;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-hW / 2, -hH / 2, hW, hH, 20);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ec4899';
      ctx.font = '800 11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('● URGENT · AI-POWERED WORKFLOW', -hW / 2 + 24, -hH / 2 + 36);

      ctx.fillStyle = '#ffffff';
      ctx.font = '800 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Autonomous Q4 Product Launch Blitz', -hW / 2 + 24, -hH / 2 + 68);

      const subtasks = [
        'Decompose architecture into 5 containerized microservices',
        'Provision Flyway database schemas on MySQL 8.0 cluster',
        'Deploy Gemini Live voice agent transcription WebSocket'
      ];

      subtasks.forEach((sub, sIdx) => {
        const subProgress = Math.min(Math.max(p4 * 3 - sIdx * 0.8, 0), 1);
        if (subProgress <= 0) return;

        const sy = -hH / 2 + 100 + sIdx * 54;
        ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.roundRect(-hW / 2 + 24, sy, hW - 48, 44, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(-hW / 2 + 46, sy + 22, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(sub, -hW / 2 + 64, sy + 26);
      });

      ctx.restore();
    }
    // SCENE 5 & 6: GRAND CLIMAX (0.75 - 1.00)
    else {
      setScenePhase('ACT V: THE HERO CLIMAX');
      setSceneTitle('Work at the Speed of Thought.');
      setSceneSub('Enterprise grade · Zero friction · 10/10 Production-Ready SaaS');

      const p5 = (progress - 0.75) / 0.25;

      ctx.save();
      ctx.translate(width / 2, height / 2);

      // Anamorphic Laser Horizon
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 50;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.lineTo(width / 2, 0);
      ctx.stroke();

      // Crystalline Hologram Emblem
      const emblemScale = spring(Math.min(p5 * 1.4, 1));
      ctx.scale(emblemScale, emblemScale);

      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 60;
      ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const r = 90;
        const hx = r * Math.cos(angle);
        const hy = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 68px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 0, 24);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('TaskFlow Pro', 0, 130);

      ctx.fillStyle = '#c084fc';
      ctx.font = '700 13px monospace';
      ctx.fillText('ENTERPRISE SAAS PLATFORM · PORT 8081', 0, 156);

      ctx.restore();
    }
  }, [playSynthesizedFx]);

  // Main Loop
  useEffect(() => {
    if (!isOpen) return;

    soundPlayedRef.current = {};
    startTimeRef.current = performance.now();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const tick = (now) => {
      if (isPlaying) {
        const elapsed = (now - startTimeRef.current) * speed;
        let progress = (elapsed % DURATION) / DURATION;
        if (manualProgressRef.current !== null) progress = manualProgressRef.current;

        setCurrProgress(progress);
        renderFrame(progress, canvas.width, canvas.height, ctx);
      }
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, isPlaying, speed, renderFrame, onClose]);

  const handleReplay = () => {
    soundPlayedRef.current = {};
    startTimeRef.current = performance.now();
    manualProgressRef.current = null;
    setIsPlaying(true);
  };

  const handleNextAct = () => {
    const elapsed = performance.now() - startTimeRef.current;
    const currP = (elapsed % DURATION) / DURATION;
    const nextP = currP < 0.25 ? 0.26 : (currP < 0.50 ? 0.52 : (currP < 0.75 ? 0.76 : 0.01));
    startTimeRef.current = performance.now() - nextP * DURATION;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.modalBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className={styles.vignette} />
        <canvas ref={canvasRef} className={styles.canvas} />

        <div className={styles.hudOverlay}>
          {/* Top Row */}
          <div className={styles.topRow}>
            <div className={`${styles.glassPill} ${styles.brandPill} ${styles.interactive}`}>
              <span className={styles.statusDot} />
              <span className={styles.brandText}>
                Apple Keynote · <span className={styles.brandHighlight}>Unreal Engine 5</span>
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className={`${styles.glassPill} ${styles.interactive}`} style={{ padding: '0.45rem 1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc' }}>{scenePhase}</span>
              </div>
              <button
                className={`${styles.closeBtn} ${styles.interactive}`}
                onClick={onClose}
                title="Close Keynote Film (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Center Titles */}
          <div className={styles.centerCaption}>
            <h1 className={styles.heroTitle}>{sceneTitle}</h1>
            <p className={styles.heroSub}>{sceneSub}</p>
          </div>

          {/* Bottom Director Controls */}
          <div className={styles.bottomControls}>
            <div className={`${styles.ctrlGroup} ${styles.interactive}`}>
              <button className={styles.ctrlBtn} onClick={handleReplay} title="Replay Commercial">
                <RotateCcw size={14} /> Replay
              </button>
              <button className={styles.ctrlBtn} onClick={handleNextAct} title="Skip to Next Act">
                <FastForward size={14} /> Next Act
              </button>
              <button
                className={styles.ctrlBtn}
                onClick={() => setIsMuted((v) => !v)}
                title={isMuted ? 'Unmute Sound FX' : 'Mute Sound FX'}
              >
                {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>

            {/* Scrubber Timeline */}
            <div className={`${styles.glassPill} ${styles.scrubberWrap} ${styles.interactive}`}>
              <span className={styles.timecode}>{(currProgress * 24).toFixed(1)}s</span>
              <input
                type="range"
                min="0"
                max="1000"
                value={Math.round(currProgress * 1000)}
                onChange={(e) => {
                  manualProgressRef.current = parseFloat(e.target.value) / 1000;
                  setCurrProgress(manualProgressRef.current);
                }}
                onMouseUp={() => { manualProgressRef.current = null; }}
                onTouchEnd={() => { manualProgressRef.current = null; }}
                className={styles.slider}
              />
              <span className={styles.timecode}>24.0s</span>
            </div>

            <div className={`${styles.glassPill} ${styles.interactive}`} style={{ padding: '0.5rem 1rem' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>Cinema 8K · 60 FPS</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
