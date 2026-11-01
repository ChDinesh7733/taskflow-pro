import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, User, Eye, EyeOff, AlertCircle, CheckCircle2, ServerCrash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlowButton } from '../ui/GlowButton';
import { AnimatedInput } from '../ui/AnimatedInput';
import { authCard, authLeft, staggerContainer, staggerItem } from '../../animations/motionVariants';
import QuantumShatterTransition from '../AuthTransition/QuantumShatterTransition';
import styles from './AuthPage.module.css';

/* ── Floating particle system ── */
const PARTICLE_COUNT = 28;
const Particles = () => {
  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 14 + 10,
      delay: Math.random() * 8,
      opacity: Math.random() * 0.5 + 0.1,
    }))
  ).current;

  return (
    <div className={styles.particles} aria-hidden="true">
      {particles.map(p => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  );
};

/* ── Luminous orbs ── */
const Orbs = () => (
  <div className={styles.orbs} aria-hidden="true">
    <div className={styles.orb1} />
    <div className={styles.orb2} />
    <div className={styles.orb3} />
  </div>
);

/* ── Pointer-responsive ambient light on the page ── */
const useAmbientLight = (containerRef) => {
  useEffect(() => {
    const isTouchDev = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDev) return;

    let raf;
    let tx = 30, ty = 40, cx = 30, cy = 40;

    const onMove = (e) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      tx = ((e.clientX - rect.left) / rect.width) * 100;
      ty = ((e.clientY - rect.top) / rect.height) * 100;
    };

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (containerRef.current) {
        containerRef.current.style.setProperty('--ax', `${cx}%`);
        containerRef.current.style.setProperty('--ay', `${cy}%`);
      }
      raf = requestAnimationFrame(tick);
    };

    const el = containerRef.current;
    if (el) el.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      if (el) el.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [containerRef]);
};

/* ══════════════════════════════════════════════════════════════
   Main AuthPage Component
══════════════════════════════════════════════════════════════ */
const AuthPage = ({ initialMode = 'login', onBackToLanding = null, onDemoLogin = null }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(initialMode);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [errors, setErrors]           = useState({});
  const [apiError, setApiError]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState('');
  const [slowServer, setSlowServer]   = useState(false);   // cold-start warning
  const [isShattering, setIsShattering] = useState(false);

  const containerRef = useRef(null);
  const cardRef = useRef(null);
  useAmbientLight(containerRef);

  const clearForm = () => {
    setDisplayName(''); setEmail(''); setPassword('');
    setErrors({}); setApiError(''); setSuccess('');
  };

  const switchMode = (m) => { setMode(m); clearForm(); };

  const validate = () => {
    const e = {};
    if (mode === 'register' && !displayName.trim()) e.displayName = 'Full name is required.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (mode === 'register' && password && !/[A-Z]/.test(password)) e.password = 'Must contain at least one uppercase letter.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setApiError(''); setErrors({});
    try {
      if (mode === 'login') {
        setIsShattering(true);
        // Cinematic warp fly-through duration (~1.1s snappy full-screen shatter)
        await Promise.all([
          login(email.trim().toLowerCase(), password),
          new Promise(r => setTimeout(r, 1100))
        ]);
      } else {
        await register(displayName.trim(), email.trim().toLowerCase(), password);
        try {
          setIsShattering(true);
          await Promise.all([
            login(email.trim().toLowerCase(), password),
            new Promise(r => setTimeout(r, 1100))
          ]);
        } catch {
          setIsShattering(false);
          setMode('login');
          setSuccess('Account created successfully! Please sign in with your password.');
          setEmail(email.trim().toLowerCase());
        }
      }
    } catch (err) {
      setIsShattering(false);
      setApiError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setIsShattering(true);
    try {
      if (onDemoLogin) {
        await Promise.all([
          onDemoLogin(),
          new Promise(r => setTimeout(r, 1100))
        ]);
      }
    } catch {
      setIsShattering(false);
    }
  };

  return (
    <div className={styles.page} ref={containerRef}>
      {/* ── Animated background ── */}
      <div className={styles.bg} aria-hidden="true">
        <Orbs />
        <Particles />
        {/* Orbital ring */}
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        {/* Pointer-following ambient light */}
        <div className={styles.ambientLight} />
      </div>

      {/* ── Left brand panel ── */}
      <motion.div
        className={styles.left}
        variants={authLeft}
        initial="hidden"
        animate={isShattering ? { opacity: 0, scale: 0.94, filter: 'blur(10px)', transition: { duration: 0.25 } } : "visible"}
      >
        <div className={styles.leftContent}>
          <motion.div className={styles.logoRow} variants={staggerItem}>
            <motion.div
              className={styles.logoIcon}
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Zap size={28} color="#fff" strokeWidth={2.5} />
            </motion.div>
            <span className={styles.logoName}>TaskFlow Pro</span>
          </motion.div>

          <motion.h1 className={styles.tagline} variants={staggerItem}>
            Plan, organize,<br />and get things done.
          </motion.h1>

          <motion.p className={styles.subTagline} variants={staggerItem}>
            A modern task management system with automatic status transitions,
            priority tracking, and real-time updates.
          </motion.p>

          <motion.div
            className={styles.featureList}
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {[
              'Automatic PENDING → IN_PROGRESS → COMPLETED',
              'Priority badges: High, Medium, Low',
              'Real-time 30-second sync',
              'Full REST API with Swagger docs',
            ].map(f => (
              <motion.div key={f} className={styles.feature} variants={staggerItem}>
                <CheckCircle2 size={15} className={styles.featureIcon} />
                <span>{f}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
        <motion.div className={styles.leftFooter} variants={staggerItem}>
          Built with React + Spring Boot + MySQL
        </motion.div>
      </motion.div>

      {/* ── Right form panel ── */}
      <div className={styles.right}>
        <motion.div
          ref={cardRef}
          className={styles.card}
          variants={authCard}
          initial="hidden"
          animate={isShattering ? { scale: 0.85, opacity: 0, pointerEvents: 'none', transition: { duration: 0.15 } } : "visible"}
        >
          {/* Travelling border light */}
          <div className={styles.cardBorderLight} aria-hidden="true" />

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode + '-header'}
              className={styles.cardHeader}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className={styles.cardTitle}>
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className={styles.cardSub}>
                {mode === 'login'
                  ? 'Sign in to your TaskFlow workspace'
                  : 'Start managing tasks in seconds'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tab switcher */}
          <div className={styles.tabs}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                className={`${styles.tab} ${mode === m ? styles.tabActive : ''}`}
                onClick={() => switchMode(m)}
                type="button"
              >
                {m === 'login' ? 'Sign In' : 'Register'}
                {mode === m && (
                  <motion.span className={styles.tabIndicator} layoutId="tab-indicator" />
                )}
              </button>
            ))}
          </div>

          {/* Alerts */}
          <AnimatePresence mode="wait">
            {apiError && (
              <motion.div
                key="api-err"
                className={styles.alertError}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle size={15} />
                <span>{apiError}</span>
              </motion.div>
            )}
            {success && (
              <motion.div
                key="success"
                className={styles.alertSuccess}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <CheckCircle2 size={15} />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginBottom: '0.25rem' }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ overflow: 'hidden' }}
                >
                  <AnimatedInput
                    id="displayName"
                    label="Full Name"
                    type="text"
                    placeholder="Enter your Name"
                    value={displayName}
                    onChange={e => { setDisplayName(e.target.value); setErrors(p => ({...p, displayName: ''})); }}
                    autoFocus={mode === 'register'}
                    disabled={loading}
                    autoComplete="name"
                    error={errors.displayName}
                    icon={User}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatedInput
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ''})); }}
              autoFocus={mode === 'login'}
              disabled={loading}
              autoComplete="email"
              error={errors.email}
              icon={Mail}
            />

            <AnimatedInput
              id="password"
              label="Password"
              type={showPwd ? 'text' : 'password'}
              placeholder={mode === 'register' ? 'Min 8 chars, 1 uppercase' : '••••••••'}
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ''})); }}
              disabled={loading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              error={errors.password}
              icon={Lock}
              rightElement={
                <motion.button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => setShowPwd(v => !v)}
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  whileTap={{ scale: 0.9 }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </motion.button>
              }
            />

            <GlowButton
              type="submit"
              variant="primary"
              loading={loading}
              className={styles.submitBtn}
            >
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </GlowButton>
          </form>

          {onDemoLogin && (
            <div style={{ marginTop: '0.875rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleDemoClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                🚀 Or Launch Live Demo Account
              </button>
            </div>
          )}

          {/* Footer switch */}
          <p className={styles.switchText}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              className={styles.switchLink}
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              type="button"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>

          {onBackToLanding && (
            <p style={{ textAlign: 'center', marginTop: '0.5rem', marginBottom: 0 }}>
              <button
                type="button"
                onClick={onBackToLanding}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer' }}
              >
                ← Back to Feature Tour & Pricing
              </button>
            </p>
          )}
        </motion.div>
      </div>

      {/* Cinematic Quantum Shatter & Warp Speed Overlay on Sign In */}
      {isShattering && (
        <QuantumShatterTransition
          originRect={cardRef.current?.getBoundingClientRect()}
        />
      )}
    </div>
  );
};

export default AuthPage;
