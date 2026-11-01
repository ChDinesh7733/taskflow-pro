import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { overlayVariants, modalVariants } from '../../animations/motionVariants';
import styles from './ConfirmDialog.module.css';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <motion.div
      className={styles.overlay}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm action"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <motion.div
        className={styles.dialog}
        onClick={e => e.stopPropagation()}
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.button
          className={styles.closeBtn}
          onClick={onCancel}
          aria-label="Close"
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.15 }}
        >
          <X size={16} />
        </motion.button>

        <motion.div
          className={styles.icon}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        >
          <AlertTriangle size={28} strokeWidth={1.8} />
        </motion.div>

        <h2 className={styles.title}>Are you sure?</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.actions}>
          <GlowButton variant="secondary" onClick={onCancel}>
            Cancel
          </GlowButton>
          <GlowButton variant="danger" onClick={onConfirm} autoFocus>
            Delete Task
          </GlowButton>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ConfirmDialog;
