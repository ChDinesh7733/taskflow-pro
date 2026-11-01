import React, { useState, useEffect } from 'react';
import styles from './OverdueRescueModal.module.css';
import { aiApi } from '../api/aiApi';
import taskApi from '../api/taskApi';
import { triggerConfetti } from '../utils/confetti';

export default function OverdueRescueModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [rescheduledIds, setRescheduledIds] = useState(new Set());

  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      fetchSuggestions();
    };

    window.addEventListener('taskflow:open-overdue-rescue', handleOpen);
    return () => window.removeEventListener('taskflow:open-overdue-rescue', handleOpen);
  }, []);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const data = await aiApi.getOverdueSuggestions();
      setSuggestions(data || []);
      setRescheduledIds(new Set());
    } catch (err) {
      console.error('Failed to fetch overdue suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleOne = async (item) => {
    try {
      setRescheduling(true);
      await taskApi.reschedule(item.taskId, {
        newDueDate: item.suggestedDueDate,
        reason: item.reason,
      });

      setRescheduledIds(prev => new Set([...prev, item.taskId]));
      window.dispatchEvent(new CustomEvent('taskflow:refresh-tasks'));
    } catch (err) {
      console.error('Failed to reschedule task:', err);
      alert('Failed to reschedule task: ' + (err.response?.data?.message || err.message));
    } finally {
      setRescheduling(false);
    }
  };

  const handleRescheduleAll = async () => {
    const pendingItems = suggestions.filter(s => !rescheduledIds.has(s.taskId));
    if (pendingItems.length === 0) return;

    try {
      setRescheduling(true);
      for (const item of pendingItems) {
        await taskApi.reschedule(item.taskId, {
          newDueDate: item.suggestedDueDate,
          reason: item.reason,
        });
      }

      setRescheduledIds(new Set(suggestions.map(s => s.taskId)));
      triggerConfetti();
      window.dispatchEvent(new CustomEvent('taskflow:refresh-tasks'));
    } catch (err) {
      console.error('Failed to reschedule all tasks:', err);
      alert('Error during bulk reschedule: ' + (err.response?.data?.message || err.message));
    } finally {
      setRescheduling(false);
    }
  };

  if (!isOpen) return null;

  const remainingCount = suggestions.filter(s => !rescheduledIds.has(s.taskId)).length;

  return (
    <div className={styles.overlay} onClick={() => setIsOpen(false)}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>🚨</div>
            <div>
              <h2 className={styles.headerTitle}>AI Overdue Task Rescue</h2>
              <p className={styles.headerSubtitle}>
                AI analyzed deadlines and workload to propose balanced recovery dates
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={() => setIsOpen(false)} title="Close">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                Analyzing overdue milestones and calendar schedules...
              </p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyEmoji}>🎉</div>
              <h3 className={styles.emptyTitle}>All Caught Up!</h3>
              <p className={styles.emptySubtitle}>
                You have zero overdue tasks. Your schedule is perfectly on track.
              </p>
            </div>
          ) : (
            <div className={styles.taskList}>
              {suggestions.map(item => {
                const isDone = rescheduledIds.has(item.taskId);
                return (
                  <div key={item.taskId} className={styles.taskCard}>
                    <div className={styles.taskCardTop}>
                      <h4 className={styles.taskTitle}>{item.title || item.taskTitle}</h4>
                      <span className={`${styles.priorityBadge} ${styles[item.priority?.toLowerCase() || 'medium']}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className={styles.dateRow}>
                      <span className={styles.oldDate}>{item.currentDueDate}</span>
                      <span className={styles.arrow}>➔</span>
                      <span className={styles.newDate}>📅 {item.suggestedDueDate}</span>
                      <span className={styles.overdueTag}>{item.daysOverdue}d overdue</span>
                    </div>

                    <div className={styles.reasonBox}>
                      💡 <strong>AI Rationale:</strong> {item.reason}
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.rescheduleBtn}
                        onClick={() => handleRescheduleOne(item)}
                        disabled={rescheduling || isDone}
                        style={isDone ? { background: '#16a34a', color: '#fff' } : {}}
                      >
                        {isDone ? '✓ Rescheduled' : '⚡ Accept Suggested Date'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {suggestions.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.footerInfo}>
              {remainingCount === 0
                ? 'All overdue tasks rescheduled!'
                : `${remainingCount} task${remainingCount > 1 ? 's' : ''} awaiting adjustment`}
            </div>
            <div className={styles.footerButtons}>
              <button
                className={styles.cancelBtn}
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
              <button
                className={styles.rescheduleAllBtn}
                onClick={handleRescheduleAll}
                disabled={rescheduling || remainingCount === 0}
              >
                {rescheduling ? 'Rescheduling...' : `⚡ Reschedule All (${remainingCount})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
