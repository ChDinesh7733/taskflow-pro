import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Search, Zap, Code2, Activity, ExternalLink, Timer, Flame, Sparkles, Calendar, Trophy, Users, Sun, Moon, Shield, CreditCard, Maximize2, Minimize2, Film } from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { usePageGlow } from '../../animations/useGlowPointer';
import { NotificationBell } from '../NotificationBell/NotificationBell';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import styles from './TopBar.module.css';

const TopBar = ({
  loading,
  onRefresh,
  onCreateClick,
  mobileMenuBtn,
  wsConnected,
  search = '',
  onSearchChange = () => {},
  onOpenStatus = () => {},
  onOpenPomodoro = () => {},
  onOpenWeeklySummary = () => {},
  onOpenDailyPlanner = () => {},
}) => {
  usePageGlow(); // attaches global cursor-tracking
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const planTier = (user?.planTier || 'FREE').toUpperCase();

  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        {mobileMenuBtn}
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>TaskManagement</h1>
          <p className={styles.subtitle}>Plan, organize, and get things done.</p>
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search tasks..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            aria-label="Search tasks"
          />
          {!search && (
            <span className={styles.searchKbd}>Ctrl+K</span>
          )}
          {search && (
            <motion.button
              className={styles.clearSearch}
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
            >
              ×
            </motion.button>
          )}
        </div>
      </div>

      <div className={styles.right}>
        {/* Daily Planner button */}
        <button
          type="button"
          onClick={onOpenDailyPlanner}
          className={styles.plannerBtn}
          title="Plan My Day: pick and order today's top tasks with AI"
        >
          <Calendar size={13} className={styles.plannerIcon} />
          <span>Plan Day</span>
        </button>

        {/* Weekly AI Summary button */}
        <button
          type="button"
          onClick={onOpenWeeklySummary}
          className={styles.weeklyAiBtn}
          title="Open Weekly AI Performance Summary & Email Digest"
        >
          <Sparkles size={13} className={styles.weeklyAiIcon} />
          <span>Weekly AI</span>
        </button>

        {/* Gamification Level & Badges button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-gamification'))}
          className={styles.pomodoroBtn}
          style={{ background: 'linear-gradient(135deg, #701a75 0%, #4a044e 100%)', border: '1px solid rgba(240, 171, 252, 0.4)' }}
          title="Open Levels, Achievements, Badges & Weekly Leaderboard"
        >
          <Trophy size={14} className={styles.pomodoroIcon} />
          <span>Achievements</span>
        </button>

        {/* Team & Collaboration button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-team'))}
          className={styles.pomodoroBtn}
          style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', border: '1px solid rgba(147, 197, 253, 0.4)' }}
          title="Open Team, Roles & Audit Activity Log"
        >
          <Users size={14} className={styles.pomodoroIcon} />
          <span>Team</span>
        </button>

        {/* Plan Tier badge button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-pricing'))}
          className={styles.pomodoroBtn}
          style={{
            background: planTier === 'ENTERPRISE'
              ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
              : planTier === 'PRO'
                ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)'
                : 'var(--surface-2, #f1f5f9)',
            color: planTier === 'FREE' ? 'var(--text-muted, #64748b)' : '#ffffff',
            border: planTier === 'FREE' ? '1px solid var(--border, #cbd5e1)' : 'none'
          }}
          title="Manage Pricing Plan & Subscription"
        >
          <Sparkles size={13} className={styles.pomodoroIcon} />
          <span>{planTier === 'FREE' ? 'Upgrade' : planTier}</span>
        </button>

        {/* Admin Dashboard shortcut if admin */}
        {user?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-admin'))}
            className={styles.pomodoroBtn}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', border: '1px solid rgba(56, 189, 248, 0.4)' }}
            title="Open Workspace Admin Dashboard & Revenue Analytics"
          >
            <Shield size={14} className={styles.pomodoroIcon} />
            <span>Admin</span>
          </button>
        )}

        {/* Pomodoro Focus Timer button */}
        <button
          type="button"
          onClick={() => onOpenPomodoro()}
          className={styles.pomodoroBtn}
          title="Open Pomodoro Focus Timer & Streaks"
        >
          <Timer size={14} className={styles.pomodoroIcon} />
          <span>Focus Timer</span>
        </button>

        {/* Focus Mode top 3 button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-focus-mode'))}
          className={styles.pomodoroBtn}
          style={{ background: 'linear-gradient(135deg, #4338ca 0%, #312e81 100%)', border: '1px solid rgba(99, 102, 241, 0.4)' }}
          title="Focus Mode: show only today's top 3 tasks and eliminate distractions"
        >
          <span style={{ fontSize: '0.85rem' }}>🎯</span>
          <span>Focus Mode</span>
        </button>

        {/* Cinematic Commercial Keynote Reel button */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-cinema-reel'))}
          className={styles.pomodoroBtn}
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.22) 0%, rgba(99, 102, 241, 0.22) 100%)',
            border: '1px solid rgba(168, 85, 247, 0.5)',
            color: '#c084fc',
            fontWeight: 700
          }}
          title="Watch 8K Cinematic Commercial Keynote Animation"
        >
          <Film size={14} className={styles.pomodoroIcon} />
          <span>Keynote Reel</span>
        </button>

        {/* Swagger API Docs direct button */}
        <a
          href="/swagger-ui/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.apiDocsPill}
          title="Open API Documentation (Swagger UI)"
        >
          <Code2 size={13} />
          <span>API Docs</span>
        </a>

        {/* Platform Hub / All-in-One Link Portal button */}
        <button
          type="button"
          onClick={onOpenStatus}
          className={`${styles.connectionBadge} ${wsConnected ? styles.connected : styles.connecting}`}
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.12) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            fontWeight: 600
          }}
          title="Open Platform Hub: Web App, Swagger API, Actuator Health & Prometheus in One Link"
        >
          <span className={styles.statusDot} style={{ background: wsConnected ? '#10b981' : '#f59e0b' }} />
          <span>Platform Hub (1 Link)</span>
        </button>

        {/* Refresh */}
        <motion.button
          className={styles.refreshBtn}
          onClick={onRefresh}
          disabled={loading}
          title="Refresh tasks"
          aria-label="Refresh"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
        >
          <motion.span
            animate={loading ? { rotate: 360 } : { rotate: 0 }}
            transition={loading ? { duration: 0.7, repeat: Infinity, ease: 'linear' } : {}}
            style={{ display: 'flex' }}
          >
            <RefreshCw size={15} />
          </motion.span>
        </motion.button>

        {/* Theme Toggle (Dark / Light) */}
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.refreshBtn}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
        </button>

        {/* Fullscreen Toggle (Whole Screen) */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className={styles.refreshBtn}
          title={isFullscreen ? 'Exit Full Screen' : 'Enter Full Screen (Whole Screen)'}
          aria-label="Toggle full screen"
        >
          {isFullscreen ? <Minimize2 size={15} style={{ color: '#38bdf8' }} /> : <Maximize2 size={15} style={{ color: '#94a3b8' }} />}
        </button>

        {/* Real notification bell */}
        <NotificationBell />

        {/* Create Task */}
        <GlowButton variant="primary" onClick={onCreateClick} className={styles.createBtn}>
          <Plus size={16} />
          <span>New Task</span>
        </GlowButton>
      </div>
    </header>
  );
};

export default TopBar;
