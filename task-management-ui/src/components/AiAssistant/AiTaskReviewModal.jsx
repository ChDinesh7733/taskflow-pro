import React, { useState } from 'react';
import { Sparkles, Trash2, Plus, Check, X } from 'lucide-react';
import styles from './AiTaskReviewModal.module.css';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function AiTaskReviewModal({ initialTasks = [], onSave, onClose }) {
  const [tasks, setTasks] = useState(() =>
    initialTasks.map((t, idx) => ({
      id: `ai-${Date.now()}-${idx}`,
      title: typeof t === 'string' ? t : t.title || 'Action item',
      priority: t.priority || 'MEDIUM',
      selected: true,
    }))
  );

  const toggleSelect = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const updateTitle = (id, newTitle) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  const updatePriority = (id, newPriority) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, priority: newPriority } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addTask = () => {
    setTasks([
      ...tasks,
      {
        id: `ai-${Date.now()}-${tasks.length}`,
        title: 'New actionable step',
        priority: 'MEDIUM',
        selected: true,
      }
    ]);
  };

  const handleSaveAll = () => {
    const selectedTasks = tasks
      .filter(t => t.selected && t.title.trim().length > 0)
      .map(t => ({
        title: t.title.trim(),
        priority: t.priority,
        status: 'TODO',
      }));

    if (!selectedTasks.length) return;
    onSave(selectedTasks);
  };

  const selectedCount = tasks.filter(t => t.selected).length;

  return (
    <div className={styles.reviewOverlay} onClick={onClose}>
      <div className={styles.reviewCard} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.reviewHeader}>
          <div className={styles.reviewTitle}>
            <Sparkles size={16} color="#4f46e5" />
            Review & Edit AI Tasks
          </div>
          <button
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Task rows */}
        <div className={styles.reviewList}>
          {tasks.map(task => (
            <div key={task.id} className={styles.taskRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={task.selected}
                onChange={() => toggleSelect(task.id)}
              />
              <input
                type="text"
                className={styles.titleInput}
                value={task.title}
                onChange={(e) => updateTitle(task.id, e.target.value)}
              />
              <select
                className={styles.prioritySelect}
                value={task.priority}
                onChange={(e) => updatePriority(task.id, e.target.value)}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                className={styles.deleteBtn}
                onClick={() => deleteTask(task.id)}
                title="Remove task"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          <button className={styles.addRowBtn} onClick={addTask}>
            <Plus size={14} /> Add Another Task
          </button>
        </div>

        {/* Footer */}
        <div className={styles.reviewFooter}>
          <span className={styles.countInfo}>
            {selectedCount} of {tasks.length} selected
          </span>
          <div className={styles.footerActions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleSaveAll}
              disabled={selectedCount === 0}
            >
              <Check size={14} /> Save {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AiTaskReviewModal;
