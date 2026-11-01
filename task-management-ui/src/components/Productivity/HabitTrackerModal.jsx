import React, { useState, useEffect } from 'react';
import productivityApi from '../../api/productivityApi';
import { triggerConfetti } from '../../utils/confetti';
import { Check, Flame, Trophy, Plus, Trash2, Calendar, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './HabitTrackerModal.module.css';

export default function HabitTrackerModal({ isOpen, onClose }) {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadHabits();
    }
  }, [isOpen]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await productivityApi.getHabits();
      setHabits(data || []);
    } catch (err) {
      console.error('Failed to load habits:', err);
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCheck = async (habit) => {
    try {
      const updated = await productivityApi.toggleCheckHabit(habit.id);
      if (updated.completedToday) {
        triggerConfetti();
        toast.success(`🔥 Streak continued! ${updated.currentStreak} day${updated.currentStreak !== 1 ? 's' : ''}!`);
      }
      setHabits(prev => prev.map(h => h.id === habit.id ? updated : h));
    } catch (err) {
      toast.error('Failed to check habit: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSaving(true);
    try {
      const created = await productivityApi.createHabit({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        frequency: 'DAILY'
      });
      setHabits(prev => [created, ...prev]);
      setNewTitle('');
      setNewDesc('');
      toast.success('Habit added to tracker! 🌱');
    } catch (err) {
      toast.error('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await productivityApi.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
      toast.success('Habit removed');
    } catch (err) {
      toast.error('Failed to delete habit');
    }
  };

  if (!isOpen) return null;

  const totalStreaks = habits.reduce((acc, h) => acc + h.currentStreak, 0);
  const completedTodayCount = habits.filter(h => h.completedToday).length;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>🌱</div>
            <div>
              <h2 className={styles.headerTitle}>Daily Habit Tracker & Streaks</h2>
              <p className={styles.headerSubtitle}>
                Build powerful consistent daily habits and unlock milestone achievement badges
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Quick stats banner */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            background: '#f8fafc',
            padding: '1rem 1.25rem',
            borderRadius: '0.875rem',
            border: '1px solid #e2e8f0',
            justifyContent: 'space-around'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ea580c' }}>
                🔥 {totalStreaks}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Streak Days</div>
            </div>
            <div style={{ width: '1px', background: '#e2e8f0' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#16a34a' }}>
                ✅ {completedTodayCount}/{habits.length}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Completed Today</div>
            </div>
          </div>

          {/* Add Habit Bar */}
          <form onSubmit={handleCreate} className={styles.addHabitBar}>
            <input
              type="text"
              placeholder="Add a new daily habit (e.g. Read 20 pages, Code review, Gym)..."
              className={styles.habitInput}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              disabled={saving}
              required
            />
            <button type="submit" className={styles.addBtn} disabled={saving || !newTitle.trim()}>
              <Plus size={16} />
              <span>{saving ? 'Adding...' : 'Add Habit'}</span>
            </button>
          </form>

          {/* Habits list */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading habits...
            </div>
          ) : habits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No habits tracked yet. Type a habit above to start your streak!
            </div>
          ) : (
            <div className={styles.habitList}>
              {habits.map(habit => (
                <div
                  key={habit.id}
                  className={`${styles.habitCard} ${habit.completedToday ? styles.habitCardCompleted : ''}`}
                >
                  <div className={styles.habitLeft}>
                    <button
                      className={`${styles.checkCircle} ${habit.completedToday ? styles.checkCircleActive : ''}`}
                      onClick={() => handleToggleCheck(habit)}
                      title={habit.completedToday ? 'Mark incomplete for today' : 'Check-in for today!'}
                    >
                      <Check size={18} strokeWidth={3} />
                    </button>

                    <div className={styles.habitDetails}>
                      <h4 className={`${styles.habitTitle} ${habit.completedToday ? styles.habitTitleCompleted : ''}`}>
                        {habit.title}
                      </h4>
                      <div className={styles.habitMeta}>
                        <span className={styles.streakBadge}>
                          🔥 {habit.currentStreak} day{habit.currentStreak !== 1 ? 's' : ''} streak
                        </span>
                        <span className={styles.recordBadge}>
                          🏆 Best: {habit.longestStreak}d
                        </span>
                        {habit.completedToday && (
                          <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.75rem' }}>
                            ✓ Done today
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(habit.id)}
                    title="Delete habit"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
