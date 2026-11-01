import { useState } from 'react';
import { useSubtasks, useAddSubtask, useToggleSubtask, useDeleteSubtask } from '../../hooks/useSubtasks';
import styles from './SubtaskPanel.module.css';

export function SubtaskPanel({ taskId, taskStatus }) {
  const [newTitle, setNewTitle] = useState('');
  const { data: subtasks = [], isLoading } = useSubtasks(taskId);
  const addMutation    = useAddSubtask(taskId);
  const toggleMutation = useToggleSubtask(taskId);
  const deleteMutation = useDeleteSubtask(taskId);

  const total     = subtasks.length;
  const completed = subtasks.filter(s => s.done).length;
  const pct       = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleAdd = () => {
    const t = newTitle.trim();
    if (!t) return;
    addMutation.mutate(t);
    setNewTitle('');
  };

  if (isLoading) return <div className={styles.loading}>Loading subtasks…</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.headerRow}>
        <span className={styles.title}>Subtasks</span>
        <span className={styles.count}>{completed}/{total}</span>
      </div>

      {total > 0 && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className={styles.list}>
        {subtasks.map(s => (
          <div key={s.id} className={`${styles.item} ${s.done ? styles.done : ''}`}>
            <input
              type="checkbox"
              checked={s.done}
              onChange={() => toggleMutation.mutate(s.id)}
              className={styles.checkbox}
            />
            <span className={styles.itemTitle}>{s.title}</span>
            <button
              className={styles.deleteBtn}
              onClick={() => deleteMutation.mutate(s.id)}
              title="Remove subtask"
            >✕</button>
          </div>
        ))}
      </div>

      {taskStatus !== 'DONE' && taskStatus !== 'CANCELLED' && (
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            placeholder="Add a subtask…"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            className={styles.addBtn}
            onClick={handleAdd}
            disabled={!newTitle.trim() || addMutation.isPending}
          >+</button>
        </div>
      )}
    </div>
  );
}
