import React, { useRef, useState, useEffect } from 'react';
import { motion, useInView } from 'framer-motion';
import { blurFadeUp, staggerParent, dividerExpand, EASING } from '../../animations/motionConfig';
import styles from './MotionPrimitives.module.css';

/**
 * Blur-to-sharp fade-up container (Linear.app style)
 */
export function FadeUp({ children, delay = 0, className = '', ...props }) {
  return (
    <motion.div
      variants={blurFadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered child container
 */
export function StaggerContainer({
  children,
  stagger = 0.08,
  delayChildren = 0.05,
  className = '',
  ...props
}) {
  return (
    <motion.div
      variants={staggerParent(stagger, delayChildren)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated Gradient Text with smooth continuous loop
 */
export function GradientText({ children, className = '' }) {
  return (
    <span className={`${styles.gradientText} ${className}`}>
      {children}
    </span>
  );
}

/**
 * Card with mouse-following radial spotlight (Linear.app style)
 */
export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(99, 102, 241, 0.12)',
  onClick,
  ...props
}) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    // Disable on touch/small screens for performance
    if (window.innerWidth < 768) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mx', `${x}px`);
    cardRef.current.style.setProperty('--my', `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`${styles.spotlightCard} ${className}`}
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={{ ease: EASING.linear, duration: 0.25 }}
      {...props}
    >
      <div
        className={styles.spotlightOverlay}
        style={{
          background: `radial-gradient(350px circle at var(--mx, 50%) var(--my, 50%), ${spotlightColor}, transparent 70%)`
        }}
      />
      {children}
    </motion.div>
  );
}

/**
 * Animated number roll on view
 */
export function CountUp({ to = 0, duration = 800, prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const end = Number(to) || 0;
    const startTime = performance.now();

    const tick = (now) => {
      const p = Math.min((now - startTime) / duration, 1);
      // Linear ease-out curve
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(end);
    };

    requestAnimationFrame(tick);
  }, [isInView, to, duration]);

  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

/**
 * Center-expanding gradient divider on scroll into view
 */
export function SectionDivider() {
  return (
    <motion.div
      className={styles.divider}
      variants={dividerExpand}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-20px' }}
    />
  );
}
