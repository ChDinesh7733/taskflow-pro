import React, { useState, useEffect } from 'react';
import productivityApi from '../../api/productivityApi';
import { useTaskList } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import { Target, Plus, Calendar, CheckCircle2, Link2, Trash2, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './GoalsModal.module.css';

export default function GoalsModal({ isOpen, onClose }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState({});

  // Tasks available to link
  const { data: taskData } = useTaskList({ size: 100 });
  const tasks = taskData?.content || [];

  useEffect(() => {
    if (isOpen) {
      loadGoals();
    }
  }, [isOpen]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      const data = await productivityApi.getGoals();
      setGoals(data || []);
    } catch (err) {
      console.error('Failed to load goals:', err);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaving(true);
    try {
      const created = await productivityApi.createGoal({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        targetDate: newTargetDate || undefined,
      });

      setGoals(prev => [created, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setNewTargetDate('');
      setShowAddForm(false);
      toast.success('🎯 Strategic Goal added!');
    } catch (err) {
      toast.error('Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  const handleLinkTask = async (goalId) => {
    const taskId = selectedTaskIds[goalId];
    if (!taskId) {
      toast.error('Please pick a task to link');
      return;
    }

    try {
      await productivityApi.linkTaskToGoal(goalId, taskId);
      toast.success('Task linked to goal!');
      loadGoals();
    } catch (err) {
      toast.error('Failed to link task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal? Linked tasks will remain intact.')) return;
    try {
      await productivityApi.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Goal removed');
    } catch (err) {
      toast.error('Failed to delete goal');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>🎯</div>
            <div>
              <h2 className={styles.headerTitle}>Goals & Strategic OKRs</h2>
              <p className={styles.headerSubtitle}>
                Connect daily execution tasks to high-level strategic objectives with auto progress tracking
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Top action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className={styles.addGoalBtn}
              onClick={() => setShowAddForm(prev => !prev)}
            >
              <Plus size={15} />
              <span>{showAddForm ? 'Close Form' : 'New Strategic Goal'}</span>
            </button>
          </div>

          {/* New Goal Form */}
          {showAddForm && (
            <form onSubmit={handleCreate} className={styles.newGoalForm}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#14532d' }}>Create New Objective</h4>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Goal / Objective Title (e.g. Launch SaaS Product V1)..."
                  className={styles.inputField}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
                <input
                  type="date"
                  className={styles.inputField}
                  style={{ maxWidth: '180px' }}
                  value={newTargetDate}
                  onChange={e => setNewTargetDate(e.target.value)}
                  title="Target Date"
                />
              </div>
              <input
                type="text"
                placeholder="Description, key results (KRs), or success criteria..."
                className={styles.inputField}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="button"
                  style={{ background: '#e2e8f0', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '0.4rem', cursor: 'pointer' }}
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.addGoalBtn} disabled={saving}>
                  {saving ? 'Creating...' : 'Save Goal'}
                </button>
              </div>
            </form>
          )}

          {/* Goals list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading strategic goals...
            </div>
          ) : goals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No goals created yet. Click "New Strategic Goal" above to align your sprint deliverables.
            </div>
          ) : (
            <div className={styles.goalsList}>
              {goals.map(goal => (
                <div key={goal.id} className={styles.goalCard}>
                  <div className={styles.goalTop}>
                    <div style={{ flex: 1 }}>
                      <h3 className={styles.goalTitle}>{goal.title}</h3>
                      {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {goal.targetDate && (
                        <span className={styles.targetDateTag}>
                          <Calendar size={13} />
                          <span>Due {goal.targetDate}</span>
                        </span>
                      )}
                      <button
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                        onClick={() => handleDelete(goal.id)}
                        title="Delete Goal"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className={styles.progressContainer}>
                    <div className={styles.progressLabelRow}>
                      <span>
                        Progress: {goal.completedTasks}/{goal.totalTasks} tasks completed
                      </span>
                      <span>{goal.progress}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressBar} style={{ width: `${goal.progress}%` }} />
                    </div>
                  </div>

                  {/* Actions: Link Tasks */}
                  <div className={styles.goalActions}>
                    <div className={styles.linkTaskBox}>
                      <span style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600 }}>Link Task:</span>
                      <select
                        className={styles.selectTask}
                        value={selectedTaskIds[goal.id] || ''}
                        onChange={e => setSelectedTaskIds({ ...selectedTaskIds, [goal.id]: e.target.value })}
                      >
                        <option value="">Select a task to link...</option>
                        {tasks.map(t => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                      <button className={styles.linkBtn} onClick={() => handleLinkTask(goal.id)}>
                        <Link2 size={13} style={{ display: 'inline', marginRight: 3 }} />
                        Link
                      </button>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 600 }}>
                      {goal.progress === 100 && goal.totalTasks > 0 ? '🏆 Milestone Achieved!' : 'In Progress'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
