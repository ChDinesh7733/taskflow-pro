import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './StatusTooltip.module.css';

export const STATUS_CONFIG = {
  MY_TASKS: {
    title: 'My Tasks',
    color: '#3b82f6',
    description: 'View and manage all tasks assigned to you, including their current status and available actions.',
  },
  TODO: {
    title: 'To Do',
    color: '#f59e0b',
    description: 'Tasks that have been created but work has not started yet.',
  },
  IN_PROGRESS: {
    title: 'In Progress',
    color: '#0284c7',
    description: 'Tasks that are currently being worked on.',
  },
  IN_REVIEW: {
    title: 'In Review',
    color: '#8b5cf6',
    description: 'Tasks that are completed by the assignee and are waiting for review or approval.',
  },
  DONE: {
    title: 'Done',
    color: '#10b981',
    description: 'Tasks that have been successfully completed and require no further action.',
  },
  CANCELLED: {
    title: 'Cancelled',
    color: '#ef4444',
    description: 'Tasks that have been cancelled and will no longer be worked on.',
  },
};

export function resolveStatus(key) {
  if (!key) return STATUS_CONFIG.MY_TASKS;
  const k = String(key).toUpperCase().replace(/[\s-]/g, '_');
  if (k === 'TOTAL_TASKS' || k === 'ALL_TASKS' || k === 'ALL' || k === 'MY_TASKS') {
    return STATUS_CONFIG.MY_TASKS;
  }
  if (k === 'TODO' || k === 'PENDING' || k === 'TO_DO') {
    return STATUS_CONFIG.TODO;
  }
  if (k === 'IN_PROGRESS' || k === 'PROGRESS' || k === 'INPROGRESS') {
    return STATUS_CONFIG.IN_PROGRESS;
  }
  if (k === 'IN_REVIEW' || k === 'REVIEW' || k === 'INREVIEW') {
    return STATUS_CONFIG.IN_REVIEW;
  }
  if (k === 'DONE' || k === 'COMPLETED' || k === 'COMPLETE') {
    return STATUS_CONFIG.DONE;
  }
  if (k === 'CANCELLED' || k === 'CANCELED') {
    return STATUS_CONFIG.CANCELLED;
  }
  return STATUS_CONFIG[k] || STATUS_CONFIG.MY_TASKS;
}

/**
 * StatusTooltip
 * Floating contextual description popover matching TaskFlow UI.
 *
 * Props:
 * - status: 'MY_TASKS' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED' (or string label)
 * - title: optional override title
 * - description: optional override description
 * - color: optional override dot color
 * - placement: 'bottom' (default) | 'right'
 * - children: the element to wrap
 */
export const StatusTooltip = ({
  status,
  title: customTitle,
  description: customDesc,
  color: customColor,
  placement = 'bottom',
  children,
}) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const resolved = resolveStatus(status);
  const title = customTitle || resolved.title;
  const description = customDesc || resolved.description;
  const color = customColor || resolved.color;

  const show = useCallback((e) => {
    const el = e?.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (placement === 'right') {
      const top = Math.max(10, rect.top + rect.height / 2);
      const left = rect.right + 10;
      setCoords({ top, left });
    } else {
      // placement === 'bottom'
      const top = rect.bottom + 8;
      // center horizontally, clamp to screen padding
      let left = rect.left + rect.width / 2;
      const minLeft = 140;
      const maxLeft = (typeof window !== 'undefined' ? window.innerWidth : 1200) - 140;
      left = Math.max(minLeft, Math.min(left, maxLeft));
      setCoords({ top, left });
    }
    setVisible(true);
  }, [placement]);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const handleScrollOrKey = () => hide();
    window.addEventListener('scroll', handleScrollOrKey, { passive: true });
    window.addEventListener('keydown', handleScrollOrKey, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScrollOrKey);
      window.removeEventListener('keydown', handleScrollOrKey);
    };
  }, [visible, hide]);

  if (!React.isValidElement(children)) {
    return children;
  }

  const childProps = children.props || {};

  const handleMouseEnter = (e) => {
    childProps.onMouseEnter?.(e);
    show(e);
  };

  const handleMouseLeave = (e) => {
    childProps.onMouseLeave?.(e);
    hide();
  };

  const handleFocus = (e) => {
    childProps.onFocus?.(e);
    show(e);
  };

  const handleBlur = (e) => {
    childProps.onBlur?.(e);
    hide();
  };

  const handleClick = (e) => {
    childProps.onClick?.(e);
    hide();
  };

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onClick: handleClick,
      })}

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {visible && (
              <motion.div
                className={`${styles.popover} ${placement === 'right' ? styles.placementRight : styles.placementBottom}`}
                style={{
                  top: `${coords.top}px`,
                  left: `${coords.left}px`,
                }}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                role="tooltip"
              >
                <div className={styles.header}>
                  <span className={styles.dot} style={{ backgroundColor: color }} />
                  <span className={styles.title}>{title}</span>
                </div>
                <p className={styles.description}>{description}</p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

export default StatusTooltip;
