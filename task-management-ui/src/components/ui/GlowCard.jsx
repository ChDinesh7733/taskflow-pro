/**
 * GlowCard — wrapper that lifts on hover, adds pointer-following glow reflection.
 * Uses CSS custom properties set via useGlowPointer.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useGlowPointer } from '../../animations/useGlowPointer';
import styles from './GlowCard.module.css';

export const GlowCard = ({ children, className = '', accentColor = '#6366f1', onClick, ...rest }) => {
  const glowRef = useGlowPointer();

  return (
    <motion.div
      ref={glowRef}
      className={[styles.card, className].filter(Boolean).join(' ')}
      style={{ '--accent': accentColor }}
      whileHover={{ y: -4, transition: { duration: 0.2, ease: 'easeOut' } }}
      onClick={onClick}
      {...rest}
    >
      {/* Pointer-following reflection */}
      <span className={styles.reflection} aria-hidden="true" />
      {/* Glowing border on hover */}
      <span className={styles.border} aria-hidden="true" />
      {children}
    </motion.div>
  );
};

export default GlowCard;
