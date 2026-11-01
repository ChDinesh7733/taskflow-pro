/**
 * Linear.app-style Motion Configuration & Animation Presets
 */

// Core Linear-style cubic bezier easing curves
export const EASING = {
  linear: [0.22, 1, 0.36, 1], // Signature snappy yet smooth deceleration
  gentle: [0.16, 1, 0.3, 1],
  spring: { type: 'spring', stiffness: 260, damping: 20 },
  subtleSpring: { type: 'spring', stiffness: 180, damping: 24 },
};

// Standardized duration presets (seconds)
export const DURATION = {
  fast: 0.2,
  base: 0.5,
  slow: 0.8,
  gradientShift: 8,
};

// Stagger timing
export const STAGGER = {
  fast: 0.05,
  base: 0.08,
  slow: 0.12,
};

// Blur-to-sharp & Y-axis reveal
export const blurFadeUp = {
  hidden: {
    opacity: 0,
    y: 22,
    filter: 'blur(6px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: DURATION.base,
      ease: EASING.linear,
    },
  },
};

// Staggered container variants
export const staggerParent = (staggerTime = STAGGER.base, delayChildren = 0.05) => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerTime,
      delayChildren,
    },
  },
});

// Horizontal expansion for section dividers
export const dividerExpand = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: {
    scaleX: 1,
    opacity: 1,
    transition: {
      duration: DURATION.slow,
      ease: EASING.linear,
    },
  },
};
