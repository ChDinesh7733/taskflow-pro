import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Clock, Flag, CheckCircle2, XCircle, Play, Search, Timer } from 'lucide-react';
import { GlowCard } from '../ui/GlowCard';
import { listItem } from '../../animations/motionVariants';
import { useChangeStatus } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import styles from './TaskCard.module.css';

/* ── Status config ── */
const STATUS_CFG = {
  TODO:        { label: 'To Do',       color: '#d97706', bg: '#fef3c7', dot: '#fbbf24' },
  IN_PROGRESS: { label: 'In Progress', color: '#2563eb', bg: '#dbeafe', dot: '#60a5fa' },
  IN_REVIEW:   { label: 'In Review',   color: '#7c3aed', bg: '#ede9fe', dot: '#a78bfa' },
  DONE:        { label: 'Done',         color: '#059669', bg: '#d1fae5', dot: '#34d399' },
  CANCELLED:   { label: 'Cancelled',   color: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

const PRIORITY_CFG = {
  LOW:    { label: 'Low',    color: '#059669', bg: '#d1fae5' },
  MEDIUM: { label: 'Medium', color: '#d97706', bg: '#fef3c7' },
  HIGH:   { label: 'High',   color: '#dc2626', bg: '#fee2e2' },
  URGENT: { label: 'Urgent', color: '#9333ea', bg: '#fae8ff' },
};

/* ── Due date chip — red when overdue ── */
const DueDateChip = ({ dueDate, status }) => {
  if (!dueDate) return null;
  const due      = new Date(dueDate);
  const now      = new Date();
  const isOverdue = due < now && status !== 'DONE' && status !== 'CANCELLED';
  const label    = due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <span className={styles.dueChip}
      style={{ background: isOverdue ? '#fee2e2' : '#f1f5f9', color: isOverdue ? '#dc2626' : '#475569' }}
      title={isOverdue ? 'Overdue!' : 'Due date'}>
      <Clock size={10} />
      {isOverdue && <span style={{ fontWeight: 700 }}>⚠ </span>}
      {label}
    </span>
  );
};

/* ── Quick-complete button (visible when TODO or IN_PROGRESS) ── */
const QuickDoneBtn = ({ taskId, currentStatus }) => {
  const { mutate, isPending } = useChangeStatus();
  if (currentStatus === 'DONE' || currentStatus === 'CANCELLED') return null;

  // Determine next valid "advance" action
  const next = currentStatus === 'TODO' ? 'IN_PROGRESS'
             : currentStatus === 'IN_PROGRESS' ? 'DONE'
             : currentStatus === 'IN_REVIEW' ? 'DONE'
             : null;
  if (!next) return null;

  const label = next === 'IN_PROGRESS' ? 'Start' : 'Complete';
  const Icon  = next === 'IN_PROGRESS' ? Play : CheckCircle2;

  const handleAdvance = () => {
    if (next === 'DONE') {
      triggerConfetti();
    }
    mutate({ id: taskId, status: next });
  };

  return (
    <motion.button
      className={`${styles.iconBtn} ${styles.doneBtn}`}
      onClick={handleAdvance}
      disabled={isPending}
      title={label}
      aria-label={label}
      whileHover={{ scale: 1.12, backgroundColor: '#d1fae5', color: '#059669' }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.15 }}>
      <Icon size={13} />
    </motion.button>
  );
};

/* ── Task card ── */
const TaskCard = ({ task, onEdit, onDelete, onSelect, isSelected = false, onToggleSelect }) => {
  const cfg = STATUS_CFG[task.status]   || STATUS_CFG.TODO;
  const pri = PRIORITY_CFG[task.priority] || PRIORITY_CFG.MEDIUM;

  const timeAgo = (dt) => {
    if (!dt) return '';
    const diff = Date.now() - new Date(dt).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const isDone = task.status === 'DONE';
  const tagList = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <motion.div variants={listItem} layout>
      <GlowCard accentColor={cfg.color} className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}>
        <div className={styles.accent} style={{ background: cfg.color }} />
        <div
          className={styles.body}
          style={{ cursor: onSelect ? 'pointer' : 'default' }}
          onClick={(e) => {
            if (onSelect && !e.target.closest('button') && !e.target.closest('input')) {
              onSelect(task);
            }
          }}
        >

          {/* Top row: status + priority badges | actions */}
          <div className={styles.topRow}>
            <div className={styles.badges}>
              {onToggleSelect && (
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleSelect(task.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: 'pointer',
                    width: '16px',
                    height: '16px',
                    accentColor: '#4f46e5',
                    borderRadius: '4px',
                    marginRight: '0.35rem'
                  }}
                  title="Select for bulk actions"
                />
              )}
              <span className={styles.badge} style={{ background: cfg.bg, color: cfg.color }}>
                <span className={styles.badgeDot} style={{ background: cfg.dot }} />
                {cfg.label}
              </span>
              <span className={styles.priorityBadge} style={{ background: pri.bg, color: pri.color }}>
                <Flag size={9} /> {pri.label}
              </span>
            </div>
            <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
              <QuickDoneBtn taskId={task.id} currentStatus={task.status} />
              {!isDone && (
                <motion.button className={styles.iconBtn}
                  onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-pomodoro', { detail: { taskId: task.id } }))}
                  title="Focus on this task (Pomodoro)" aria-label="Focus"
                  whileHover={{ scale: 1.15, backgroundColor: '#fdf2f8', color: '#db2777' }}
                  whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }}>
                  <Timer size={13} />
                </motion.button>
              )}
              {!isDone && (
                <motion.button className={styles.iconBtn} onClick={() => onEdit(task)}
                  title="Edit" aria-label="Edit"
                  whileHover={{ scale: 1.15, backgroundColor: '#eef2ff', color: '#4f46e5' }}
                  whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }}>
                  <Pencil size={13} />
                </motion.button>
              )}
              <motion.button className={`${styles.iconBtn} ${styles.deleteBtn}`}
                onClick={() => onDelete(task.id)} title="Delete" aria-label="Delete"
                whileHover={{ scale: 1.15, backgroundColor: '#fee2e2', color: '#dc2626' }}
                whileTap={{ scale: 0.9 }} transition={{ duration: 0.15 }}>
                <Trash2 size={13} />
              </motion.button>
            </div>
          </div>

          {/* Title */}
          <h3 className={`${styles.title} ${isDone ? styles.done : ''}`}>{task.title}</h3>

          {/* Description */}
          {task.description && <p className={styles.desc}>{task.description}</p>}

          {/* Tags list */}
          {tagList.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', margin: '0.4rem 0' }}>
              {tagList.map(tag => (
                <span key={tag} style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 500,
                }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Due date chip & Assignee */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', margin: '0.2rem 0' }}>
            <DueDateChip dueDate={task.dueDate} status={task.status} />
            {task.assigneeName && (
              <span style={{
                fontSize: '0.72rem',
                color: '#6366f1',
                background: '#e0e7ff',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                👤 {task.assigneeName}
              </span>
            )}
            {task.subtaskCount > 0 && (
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                ✓ {task.completedSubtaskCount || 0}/{task.subtaskCount}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.meta}>
              <Clock size={11} />
              <span>{timeAgo(task.createdAt)}</span>
            </div>
            <span className={styles.idChip} title={task.id}>#{task.id?.substring(0, 6)}</span>
          </div>
        </div>
      </GlowCard>
    </motion.div>
  );
};

export default TaskCard;
