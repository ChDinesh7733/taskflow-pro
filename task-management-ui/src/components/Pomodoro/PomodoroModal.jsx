import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Play, Pause, RotateCcw, CheckCircle2, Flame,
  Coffee, Timer, Palmtree, Clock, Check
} from 'lucide-react';
import { useTaskList } from '../../hooks/useTasks';
import { pomodoroApi } from '../../api/pomodoroApi';
import { triggerConfetti } from '../../utils/confetti';
import toast from 'react-hot-toast';
import styles from './PomodoroModal.module.css';

const MODES = {
  WORK:        { label: 'Focus Work', durationSec: 25 * 60, icon: Timer, color: '#4f46e5' },
  SHORT_BREAK: { label: 'Short Break', durationSec: 5 * 60, icon: Coffee, color: '#059669' },
  LONG_BREAK:  { label: 'Long Break', durationSec: 15 * 60, icon: Palmtree, color: '#0891b2' },
};

export default function PomodoroModal({ isOpen, onClose, defaultTaskId = null }) {
  const [mode, setMode] = useState('WORK');
  const [timeLeft, setTimeLeft] = useState(MODES.WORK.durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(defaultTaskId || '');
  const [stats, setStats] = useState(null);
  const [logging, setLogging] = useState(false);

  // Fetch user's active tasks for attachment
  const { data: taskData } = useTaskList({ size: 50 });
  const activeTasks = (taskData?.content || []).filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');

  // Load Pomodoro stats
  const fetchStats = async () => {
    try {
      const data = await pomodoroApi.getStats();
      setStats(data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
      if (defaultTaskId) setSelectedTaskId(defaultTaskId);
    }
  }, [isOpen, defaultTaskId]);

  // Timer interval loop
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      setIsRunning(false);
      handleSessionComplete();
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // Switch mode
  const switchMode = (newMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODES[newMode].durationSec);
  };

  // Reset timer
  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(MODES[mode].durationSec);
  };

  // Complete session & log to backend
  const handleSessionComplete = async () => {
    const durationMinutes = Math.round((MODES[mode].durationSec - timeLeft) / 60) || (mode === 'WORK' ? 25 : 5);
    setLogging(true);
    const toastId = toast.loading('Logging focus session to backend...');
    try {
      await pomodoroApi.logSession({
        taskId: selectedTaskId || undefined,
        durationMinutes,
        sessionType: mode,
        interrupted: false,
      });

      triggerConfetti();
      toast.success(
        mode === 'WORK'
          ? `🎉 Great focus! ${durationMinutes} minutes logged to your streak!`
          : `☕ Break finished! Ready for the next focus sprint?`,
        { id: toastId, duration: 4000 }
      );

      fetchStats();

      // Auto-suggest next mode
      if (mode === 'WORK') {
        switchMode('SHORT_BREAK');
      } else {
        switchMode('WORK');
      }
    } catch (err) {
      toast.error('Failed to log session: ' + err.message, { id: toastId });
    } finally {
      setLogging(false);
    }
  };

  if (!isOpen) return null;

  // Format mm:ss
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // SVG Progress calculation
  const totalSec = MODES[mode].durationSec;
  const progress = (totalSec - timeLeft) / totalSec;
  const strokeDashoffset = 565 - 565 * progress;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconWrap} style={{ background: MODES[mode].color + '18', color: MODES[mode].color }}>
              <Timer size={18} />
            </div>
            <div>
              <h3>Pomodoro Focus Timer</h3>
              <p>Stay in flow and automatically log focus time to tasks</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Streak & Stats Bar */}
        <div className={styles.statsBar}>
          <div className={styles.statPill}>
            <Flame size={14} className={styles.flameIcon} />
            <span><strong>{stats?.currentStreak ?? 1}-Day</strong> Streak</span>
          </div>
          <div className={styles.statPill}>
            <Clock size={14} color="#4f46e5" />
            <span>Today: <strong>{stats?.todayMinutes ?? 0}m</strong></span>
          </div>
          <div className={styles.statPill}>
            <CheckCircle2 size={14} color="#059669" />
            <span>Sessions: <strong>{stats?.completedSessions ?? 0}</strong></span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className={styles.modesRow}>
          {Object.entries(MODES).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = mode === key;
            return (
              <button
                key={key}
                type="button"
                className={`${styles.modeBtn} ${active ? styles.modeBtnActive : ''}`}
                onClick={() => switchMode(key)}
                style={active ? { background: cfg.color, borderColor: cfg.color } : {}}
              >
                <Icon size={14} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Circular Countdown Ring */}
        <div className={styles.timerWrap}>
          <svg className={styles.progressRing} width="220" height="220">
            <circle
              className={styles.ringBackground}
              stroke="#f1f5f9"
              strokeWidth="10"
              fill="transparent"
              r="90"
              cx="110"
              cy="110"
            />
            <circle
              className={styles.ringProgress}
              stroke={MODES[mode].color}
              strokeWidth="10"
              strokeDasharray="565"
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              r="90"
              cx="110"
              cy="110"
            />
          </svg>
          <div className={styles.timerCenter}>
            <h1 className={styles.timeDisplay}>{timeFormatted}</h1>
            <p className={styles.modeSub}>{MODES[mode].label}</p>
          </div>
        </div>

        {/* Task Attachment Dropdown */}
        <div className={styles.taskPickerWrap}>
          <label className={styles.taskLabel}>Attach Focus to Task:</label>
          <select
            className={styles.taskSelect}
            value={selectedTaskId}
            onChange={e => setSelectedTaskId(e.target.value)}
          >
            <option value="">General Focus (No task attached)</option>
            {activeTasks.map(t => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.priority})
              </option>
            ))}
          </select>
        </div>

        {/* Timer Control Buttons */}
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.actionReset}
            onClick={handleReset}
            title="Reset timer"
          >
            <RotateCcw size={16} />
          </button>

          <button
            type="button"
            className={styles.actionPlay}
            onClick={() => setIsRunning(!isRunning)}
            style={{ background: MODES[mode].color }}
          >
            {isRunning ? (
              <>
                <Pause size={18} />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={18} style={{ marginLeft: 2 }} />
                <span>Start Focus</span>
              </>
            )}
          </button>

          <button
            type="button"
            className={styles.actionComplete}
            onClick={handleSessionComplete}
            disabled={logging}
            title="Complete & Log Session to Backend"
          >
            <Check size={16} />
            <span>Done</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
