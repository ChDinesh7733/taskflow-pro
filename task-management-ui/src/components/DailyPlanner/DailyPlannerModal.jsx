import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sun, Sparkles, CheckCircle2, Clock, Timer, Copy, RefreshCw,
  Loader2, ArrowRight, Lightbulb, AlertTriangle, Calendar
} from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { useChangeStatus } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import toast from 'react-hot-toast';
import styles from './DailyPlannerModal.module.css';

const PRIORITY_CLASSES = {
  URGENT: styles.priorityUrgent,
  HIGH: styles.priorityHigh,
  MEDIUM: styles.priorityMed,
  LOW: styles.priorityLow,
};

export default function DailyPlannerModal({ isOpen, onClose, onSelectTask }) {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState(null);
  const changeStatusMutation = useChangeStatus();

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.planMyDay();
      setPlan(data);
    } catch (err) {
      console.error('Failed to load daily plan:', err);
      setError('Unable to synthesize your daily plan right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlan();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFocusTask = (taskId) => {
    onClose();
    window.dispatchEvent(new CustomEvent('taskflow:open-pomodoro', { detail: { taskId } }));
  };

  const handleCompleteTask = (taskId) => {
    triggerConfetti();
    changeStatusMutation.mutate({ id: taskId, status: 'DONE' }, {
      onSuccess: () => {
        toast.success('Task marked as Done!');
        fetchPlan();
      }
    });
  };

  const handleCopyPlan = () => {
    if (!plan || !plan.plannedTasks?.length) return;
    const lines = [
      `# 📅 Daily Focus Plan (${plan.date})`,
      `**Theme:** ${plan.dayTheme}`,
      `**Total Planned Focus:** ${plan.totalEstimatedMinutes} mins across ${plan.totalTasksPlanned} tasks`,
      '',
      ...plan.plannedTasks.map(t =>
        `${t.orderIndex}. [${t.priority}] ${t.title} (${t.suggestedTimeBlock})\n   💡 Reason: ${t.reason}`
      ),
      '',
      `Coach Note: ${plan.plannerNote}`
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('📋 Daily plan copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.calendarIconWrap}>
                <Sun size={24} />
              </div>
              <div>
                <div className={styles.titleRow}>
                  <h2 className={styles.title}>AI Daily Planner</h2>
                  {plan?.date && <span className={styles.dateBadge}>{plan.date}</span>}
                  {plan?.dayTheme && <span className={styles.themeBadge}>{plan.dayTheme}</span>}
                </div>
                <p className={styles.subtitle}>
                  AI analyzed your backlog and organized today's highest-leverage tasks with clear strategic rationale.
                </p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>

          {/* Strategic Note Ribbon */}
          {plan?.plannerNote && (
            <div className={styles.coachBar}>
              <div className={styles.coachNoteText}>
                <Lightbulb size={16} color="#9333ea" />
                <span>{plan.plannerNote}</span>
              </div>
              <div className={styles.metricsPills}>
                <span className={styles.metricPill}>
                  {plan.totalTasksPlanned} Tasks Planned
                </span>
                <span className={styles.metricPill}>
                  ⏱ {plan.totalEstimatedMinutes}m Total Focus
                </span>
              </div>
            </div>
          )}

          {/* Actions Ribbon */}
          <div className={styles.actionsBar}>
            <button
              className={styles.actionBtn}
              onClick={handleCopyPlan}
              disabled={loading || !plan}
              title="Copy formatted schedule"
            >
              <Copy size={13} />
              <span>Copy Schedule</span>
            </button>
            <button
              className={styles.actionBtn}
              onClick={fetchPlan}
              disabled={loading}
              title="Regenerate plan"
            >
              <RefreshCw size={13} className={loading ? 'spin' : ''} />
              <span>Regenerate</span>
            </button>
          </div>

          {/* Body Content */}
          <div className={styles.body}>
            {loading ? (
              <div className={styles.loadingBox}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles size={32} color="#f59e0b" />
                </motion.div>
                <p>Analyzing priorities, deadlines, and backlog leverage with AI…</p>
              </div>
            ) : error ? (
              <div className={styles.loadingBox}>
                <AlertTriangle size={32} color="#f59e0b" />
                <p>{error}</p>
                <button className={styles.actionBtn} onClick={fetchPlan}>Try Again</button>
              </div>
            ) : plan?.plannedTasks?.length ? (
              plan.plannedTasks.map((item) => (
                <div key={item.taskId || item.orderIndex} className={styles.planCard}>
                  {/* Top row */}
                  <div className={styles.cardTopRow}>
                    <div className={styles.topLeftGroup}>
                      <span className={styles.orderBadge}>{item.orderIndex}</span>
                      <span className={styles.timeBlockChip}>
                        <Clock size={11} />
                        <span>{item.suggestedTimeBlock}</span>
                      </span>
                      <span className={`${styles.priorityBadge} ${PRIORITY_CLASSES[item.priority] || styles.priorityMed}`}>
                        {item.priority}
                      </span>
                      {item.dueDate && (
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          Due: {item.dueDate}
                        </span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={`${styles.cardActionBtn} ${styles.cardActionFocus}`}
                        onClick={() => handleFocusTask(item.taskId)}
                        title="Start Pomodoro Focus on this task"
                      >
                        <Timer size={12} />
                        <span>Focus</span>
                      </button>
                      <button
                        className={styles.cardActionBtn}
                        onClick={() => handleCompleteTask(item.taskId)}
                        title="Mark Complete"
                      >
                        <CheckCircle2 size={12} color="#10b981" />
                        <span>Done</span>
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <div className={styles.cardTitleRow}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                  </div>

                  {/* 1-Line AI Reason */}
                  <div className={styles.reasonBox}>
                    <Sparkles size={14} className={styles.reasonIcon} />
                    <span><strong>Why today:</strong> {item.reason}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.loadingBox}>
                <CheckCircle2 size={36} color="#10b981" />
                <p style={{ fontWeight: 600, color: '#0f172a' }}>All Clear for Today!</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
                  No active tasks require immediate action. Use the Smart Task NLP bar to define new project goals.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
