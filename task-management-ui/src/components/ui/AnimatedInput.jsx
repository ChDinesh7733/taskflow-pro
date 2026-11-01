/**
 * AnimatedInput — form input with animated focus ring, glow, and floating label motion.
 */
import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './AnimatedInput.module.css';

export const AnimatedInput = forwardRef(({
  label,
  error,
  icon: Icon,
  rightElement,
  className = '',
  ...inputProps
}, ref) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={[styles.field, error ? styles.hasError : '', focused ? styles.focused : '', className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={inputProps.id}>
          {label}
        </label>
      )}
      <div className={styles.wrap}>
        {Icon && <Icon size={16} className={styles.icon} />}
        <input
          ref={ref}
          className={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {rightElement && <span className={styles.right}>{rightElement}</span>}
        {/* Animated focus border */}
        <motion.span
          className={styles.focusBar}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: focused ? 1 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden="true"
        />
      </div>
      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className={styles.error}
            key="err"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

AnimatedInput.displayName = 'AnimatedInput';
export default AnimatedInput;
