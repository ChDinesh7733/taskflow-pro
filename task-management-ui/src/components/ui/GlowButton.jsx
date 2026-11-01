/**
 * GlowButton — premium animated button with gradient, shimmer, glow, and ripple.
 * Drop-in replacement for plain <button> elements.
 *
 * Props:
 *   variant    — 'primary' | 'secondary' | 'danger' | 'ghost'
 *   loading    — shows spinner, disables click
 *   className  — extra classes merged in
 *   children   — button content
 *   ...rest    — passed through to the underlying <motion.button>
 */
import React, { useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import styles from './GlowButton.module.css';

const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

export const GlowButton = ({
  variant = 'primary',
  loading = false,
  className = '',
  children,
  onClick,
  disabled,
  type = 'button',
  ...rest
}) => {
  const btnRef = useRef(null);

  /* Pointer-position shimmer effect */
  const onMouseMove = useCallback((e) => {
    if (isTouchDevice()) return;
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    btn.style.setProperty('--btn-x', `${x}%`);
    btn.style.setProperty('--btn-y', `${y}%`);
  }, []);

  const onMouseLeave = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    btn.style.setProperty('--btn-x', `50%`);
    btn.style.setProperty('--btn-y', `50%`);
  }, []);

  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={btnRef}
      type={type}
      className={[styles.btn, styles[variant], loading ? styles.loading : '', className].filter(Boolean).join(' ')}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      whileHover={isDisabled ? {} : { scale: 1.02, y: -1 }}
      whileTap={isDisabled ? {} : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-busy={loading}
      {...rest}
    >
      {/* Shimmer overlay */}
      <span className={styles.shimmer} aria-hidden="true" />
      {/* Glow overlay */}
      <span className={styles.glow} aria-hidden="true" />

      {loading ? (
        <span className={styles.inner}>
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <Loader2 size={14} />
          </motion.span>
          <span>{typeof children === 'string' ? children : 'Loading…'}</span>
        </span>
      ) : (
        <span className={styles.inner}>{children}</span>
      )}
    </motion.button>
  );
};

export default GlowButton;
