import React, { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import taskApi from '../../api/taskApi';
import { triggerConfetti } from '../../utils/confetti';
import { Sparkles, Plus, Trash2, Calendar, Flag, CheckCircle2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './AiBreakdownModal.module.css';

const PRIORITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + (days || 1));
  return d.toISOString().split('T')[0];
}

export function AiBreakdownModal({ isOpen, onClose, onCreated }) {
  const [goal, setGoal] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fromFallback, setFallback] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBreakdown = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await aiApi.breakdown(goal.trim());
      const mapped = (res.suggestions || []).map((s, idx) => ({
        id: `step-${Date.now()}-${idx}`,
        title: s.title || '',
        priority: s.priority || 'MEDIUM',
        dueDate: offsetDate(s.dueInDays || 1),
        selected: true,
      }));
      setSubtasks(mapped);
      setFallback(res.fromFallback || false);
    } catch (e) {
      if (e.response?.status === 429) {
        setError('Rate limit reached — you can make 10 AI requests per hour.');
      } else {
        setError('AI breakdown service temporarily unavailable. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  };

  const updateTitle = (id, newTitle) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, title: newTitle } : t));
  };

  const updatePriority = (id, newPriority) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, priority: newPriority } : t));
  };

  const updateDueDate = (id, newDate) => {
    setSubtasks(subtasks.map(t => t.id === id ? { ...t, dueDate: newDate } : t));
  };

  const deleteStep = (id) => {
    setSubtasks(subtasks.filter(t => t.id !== id));
  };

  const addCustomStep = () => {
    setSubtasks([
      ...subtasks,
      {
        id: `step-${Date.now()}-${subtasks.length}`,
        title: '',
        priority: 'MEDIUM',
        dueDate: offsetDate(2),
        selected: true,
      }
    ]);
  };

  const toggleSelectAll = () => {
    const allSelected = subtasks.every(t => t.selected);
    setSubtasks(subtasks.map(t => ({ ...t, selected: !allSelected })));
  };

  const handleSaveTasks = async () => {
    const selectedTasks = subtasks.filter(t => t.selected && t.title.trim().length > 0);
    if (!selectedTasks.length) {
      toast.error('Please select at least one task to create.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading(`Creating ${selectedTasks.length} real tasks...`);
    try {
      let createdCount = 0;
      for (const t of selectedTasks) {
        await taskApi.create({
          title: t.title.trim(),
          priority: t.priority,
          dueDate: t.dueDate || undefined,
          tags: 'ai-breakdown',
          description: `Generated from goal: "${goal.trim()}"`
        });
        createdCount++;
      }

      triggerConfetti();
      toast.success(`Successfully created ${createdCount} tasks in workspace! 🚀`, { id: toastId });
      window.dispatchEvent(new CustomEvent('taskflow:refresh-tasks'));
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      toast.error('Failed to create some tasks: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = subtasks.filter(t => t.selected).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <span className={styles.headerIcon}>✨</span>
            <div>
              <h2>AI Goal Breakdown & Subtask Generator</h2>
              <p className={styles.headerSubtitle}>
                State any goal — AI will generate actionable, editable tasks with deadlines
              </p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Goal Input Row */}
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.goalInput}
              placeholder="e.g. Launch a new feature with documentation and marketing in 2 weeks"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !loading && handleBreakdown()}
              disabled={loading || saving}
            />
            <button
              className={styles.breakdownBtn}
              onClick={handleBreakdown}
              disabled={loading || saving || !goal.trim()}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Break Down</span>
                </>
              )}
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {fromFallback && subtasks.length > 0 && (
            <div className={styles.fallbackNote}>
              💡 Demonstrating intelligent breakdown templates. Set <code>GEMINI_API_KEY</code> for dynamic real-time Gemini generation.
            </div>
          )}

          {subtasks.length > 0 && (
            <>
              <div className={styles.reviewToolbar}>
                <label className={styles.selectAllLabel}>
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={subtasks.length > 0 && subtasks.every(t => t.selected)}
                    onChange={toggleSelectAll}
                  />
                  <span>Select All ({selectedCount}/{subtasks.length})</span>
                </label>
                <button type="button" className={styles.addStepBtn} onClick={addCustomStep}>
                  <Plus size={14} />
                  <span>Add Subtask</span>
                </button>
              </div>

              <div className={styles.list}>
                {subtasks.map((task) => (
                  <div
                    key={task.id}
                    className={`${styles.itemCard} ${task.selected ? styles.itemCardChecked : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={task.selected}
                      onChange={() => toggleSelect(task.id)}
                    />
                    <input
                      type="text"
                      className={styles.editTitleInput}
                      placeholder="Subtask title..."
                      value={task.title}
                      onChange={e => updateTitle(task.id, e.target.value)}
                    />
                    <select
                      className={styles.prioritySelect}
                      value={task.priority}
                      onChange={e => updatePriority(task.id, e.target.value)}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={task.dueDate}
                      onChange={e => updateDueDate(task.id, e.target.value)}
                      title="Due date"
                    />
                    <button
                      type="button"
                      className={styles.trashBtn}
                      onClick={() => deleteStep(task.id)}
                      title="Delete step"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {subtasks.length > 0 && (
          <div className={styles.footer}>
            <span className={styles.hint}>
              {selectedCount} subtask{selectedCount !== 1 ? 's' : ''} ready to save as real tasks
            </span>
            <div className={styles.footerRight}>
              <button className={styles.cancelBtn} onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button
                className={styles.saveBtn}
                disabled={saving || selectedCount === 0}
                onClick={handleSaveTasks}
              >
                <CheckCircle2 size={16} />
                <span>{saving ? 'Creating Tasks…' : `Save ${selectedCount} Tasks to Workspace`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default AiBreakdownModal;
