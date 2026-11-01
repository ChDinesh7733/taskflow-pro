import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flag, Clock, User, ChevronRight, ChevronLeft, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { useChangeStatus } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import styles from './KanbanBoard.module.css';

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: '#d97706', dot: '#fbbf24', next: 'IN_PROGRESS', prev: null },
  { id: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', dot: '#60a5fa', next: 'IN_REVIEW', prev: 'TODO' },
  { id: 'IN_REVIEW', label: 'In Review', color: '#7c3aed', dot: '#a78bfa', next: 'DONE', prev: 'IN_PROGRESS' },
  { id: 'DONE', label: 'Done', color: '#059669', dot: '#34d399', next: null, prev: 'IN_PROGRESS' },
];

const PRIORITY_CFG = {
  LOW:    { label: 'Low',    color: '#059669', bg: '#d1fae5' },
  MEDIUM: { label: 'Medium', color: '#d97706', bg: '#fef3c7' },
  HIGH:   { label: 'High',   color: '#dc2626', bg: '#fee2e2' },
  URGENT: { label: 'Urgent', color: '#9333ea', bg: '#fae8ff' },
};

export function KanbanBoard({ tasks = [], onSelectTask, onCreateInStatus }) {
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const changeStatusMutation = useChangeStatus();

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDragOverColumn(null);
    setDraggedTaskId(null);

    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== targetStatus) {
      if (targetStatus === 'DONE') {
        triggerConfetti();
      }
      changeStatusMutation.mutate({ id: taskId, status: targetStatus });
    }
  };

  const handleMove = (e, taskId, newStatus) => {
    e.stopPropagation();
    if (newStatus === 'DONE') {
      triggerConfetti();
    }
    changeStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className={styles.kanbanContainer}>
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.id);

        return (
          <div
            key={col.id}
            className={`${styles.column} ${dragOverColumn === col.id ? styles.columnDragOver : ''}`}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column Header */}
            <div className={styles.columnHeader}>
              <div className={styles.headerLeft}>
                <span className={styles.statusDot} style={{ background: col.dot }} />
                <span className={styles.columnTitle}>{col.label}</span>
                <span className={styles.countBadge}>{colTasks.length}</span>
              </div>
              <button
                className={styles.addBtn}
                onClick={() => onCreateInStatus && onCreateInStatus(col.id)}
                title={`Add task to ${col.label}`}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cards List */}
            <div className={styles.cardsList}>
              {colTasks.length === 0 ? (
                <div className={styles.emptyColumn}>
                  <span>No tasks</span>
                  {onCreateInStatus && (
                    <button
                      className={styles.addBtn}
                      style={{ fontSize: '0.75rem', color: '#6366f1' }}
                      onClick={() => onCreateInStatus(col.id)}
                    >
                      + Add task
                    </button>
                  )}
                </div>
              ) : (
                colTasks.map(task => {
                  const pri = PRIORITY_CFG[task.priority] || PRIORITY_CFG.MEDIUM;
                  const tagList = task.tags
                    ? task.tags.split(',').map(t => t.trim()).filter(Boolean)
                    : [];

                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      className={`${styles.cardItem} ${draggedTaskId === task.id ? styles.cardDragging : ''}`}
                    >
                      {/* Top row: Priority & Quick Move */}
                      <div className={styles.cardTop}>
                        <span
                          className={styles.priorityBadge}
                          style={{ background: pri.bg, color: pri.color }}
                        >
                          <Flag size={9} /> {pri.label}
                        </span>

                        <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                          {col.prev && (
                            <button
                              className={styles.actionBtn}
                              title={`Move to ${COLUMNS.find(c => c.id === col.prev)?.label}`}
                              onClick={(e) => handleMove(e, task.id, col.prev)}
                            >
                              <ChevronLeft size={14} />
                            </button>
                          )}
                          {col.next && (
                            <button
                              className={styles.actionBtn}
                              title={`Move to ${COLUMNS.find(c => c.id === col.next)?.label}`}
                              onClick={(e) => handleMove(e, task.id, col.next)}
                            >
                              <ChevronRight size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className={styles.cardTitle}>{task.title}</h4>

                      {/* Description preview */}
                      {task.description && (
                        <p className={styles.cardDesc}>{task.description}</p>
                      )}

                      {/* Tags */}
                      {tagList.length > 0 && (
                        <div className={styles.tagsRow}>
                          {tagList.slice(0, 3).map(tag => (
                            <span key={tag} className={styles.tagPill}>#{tag}</span>
                          ))}
                          {tagList.length > 3 && (
                            <span className={styles.tagPill}>+{tagList.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className={styles.cardFooter}>
                        <div className={styles.cardMeta}>
                          {task.dueDate && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              {new Date(task.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {task.subtaskCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <CheckCircle2 size={11} />
                              {task.completedSubtaskCount || 0}/{task.subtaskCount}
                            </span>
                          )}
                        </div>

                        {task.assigneeName && (
                          <span title={`Assigned to ${task.assigneeName}`} style={{ fontWeight: 600, color: '#4f46e5' }}>
                            👤 {task.assigneeName.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default KanbanBoard;
