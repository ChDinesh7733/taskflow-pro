import React, { useEffect, useMemo } from 'react';
import { useTaskList, useChangeStatus } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import { Check, Timer, X, Sparkles, Flame, Calendar, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './FocusMode.module.css';

export default function FocusMode({ isOpen, onClose }) {
  const { data: taskData, refetch } = useTaskList({ size: 100 });
  const changeStatusMutation = useChangeStatus();

  // Pick today's top 3 tasks based on active state and highest priority
  const topTasks = useMemo(() => {
    if (!taskData?.content) return [];
    const all = taskData.content;

    // Filter active items
    const active = all.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW');

    // Priority rank: URGENT (1), HIGH (2), MEDIUM (3), LOW (4)
    const priorityWeight = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };

    return [...active].sort((a, b) => {
      const pDiff = (priorityWeight[a.priority] || 3) - (priorityWeight[b.priority] || 3);
      if (pDiff !== 0) return pDiff;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    }).slice(0, 3);
  }, [taskData]);

  // Handle ESC key to exit focus mode
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleDone = async (task) => {
    const isDone = task.status === 'DONE';
    const nextStatus = isDone ? 'TODO' : 'DONE';

    try {
      await changeStatusMutation.mutateAsync({ id: task.id, status: nextStatus });
      if (!isDone) {
        triggerConfetti();
        toast.success(`🎯 Completed: "${task.title}"! High five! 🙌`);
      }
      refetch();
    } catch (err) {
      toast.error('Failed to update task: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleLaunchPomodoro = (taskId) => {
    window.dispatchEvent(new CustomEvent('taskflow:open-pomodoro', { detail: { taskId } }));
  };

  const completedCount = topTasks.filter(t => t.status === 'DONE').length;
  const progressPct = topTasks.length ? Math.round((completedCount / topTasks.length) * 100) : 0;

  return (
    <div className={styles.focusOverlay} role="dialog" aria-modal="true">
      <div className={styles.focusContainer}>
        {/* Top bar */}
        <div className={styles.topBar}>
          <div className={styles.badgeWrap}>
            <div className={styles.targetIcon}>🎯</div>
            <div>
              <h2 className={styles.focusTitle}>Focus Mode</h2>
              <p className={styles.focusSubtitle}>
                Eliminate noise. Zero distractions. Today's top 3 high-impact deliverables.
              </p>
            </div>
          </div>
          <button className={styles.exitBtn} onClick={onClose} title="Exit Focus Mode (Esc)">
            <ArrowLeft size={15} />
            <span>Exit Focus (Esc)</span>
          </button>
        </div>

        {/* Progress header */}
        {topTasks.length > 0 && (
          <div className={styles.progressBox}>
            <div className={styles.progressInfo}>
              <span>
                {completedCount === topTasks.length && topTasks.length > 0
                  ? '🎉 All 3 focus tasks completed for today!'
                  : `${completedCount} of ${topTasks.length} focus goals achieved`}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressBar} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        )}

        {/* Top 3 Task List */}
        {topTasks.length === 0 ? (
          <div className={styles.emptyBox}>
            <div className={styles.emptyIcon}>🏆</div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#fff' }}>No Active Deliverables!</h3>
            <p className={styles.emptyText}>
              All your tasks are either completed or your workspace is clear. Take a well-deserved break!
            </p>
            <button className={styles.exitCenterBtn} onClick={onClose}>
              Return to Workspace
            </button>
          </div>
        ) : (
          <div className={styles.taskList}>
            {topTasks.map((task, idx) => {
              const isCompleted = task.status === 'DONE';
              return (
                <div
                  key={task.id}
                  className={`${styles.focusCard} ${isCompleted ? styles.focusCardCompleted : ''}`}
                >
                  <button
                    className={`${styles.checkBtn} ${isCompleted ? styles.checkedBtn : ''}`}
                    onClick={() => handleToggleDone(task)}
                    title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>

                  <div className={styles.cardBody}>
                    <h3 className={`${styles.cardTitle} ${isCompleted ? styles.cardTitleCompleted : ''}`}>
                      <span style={{ color: '#818cf8', marginRight: '0.4rem' }}>#{idx + 1}</span>
                      {task.title}
                    </h3>

                    <div className={styles.cardMeta}>
                      <span className={`${styles.priorityTag} ${styles[task.priority.toLowerCase()]}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className={styles.dateTag}>
                          <Calendar size={13} />
                          <span>Due {task.dueDate}</span>
                        </span>
                      )}
                      {task.categoryName && (
                        <span style={{ color: '#94a3b8' }}>📁 {task.categoryName}</span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        className={styles.pomodoroBtn}
                        onClick={() => handleLaunchPomodoro(task.id)}
                        title="Start 25m Focus Session on this task"
                      >
                        <Timer size={13} />
                        <span>Start Pomodoro</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
