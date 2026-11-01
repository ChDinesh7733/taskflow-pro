import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Clock, Play, Eye, CheckCircle2, XCircle,
  Settings, Zap, LogOut, User, Mail, Calendar, ChevronUp, Folder, Plus,
  PanelLeftClose, PanelLeftOpen, LayoutList, LayoutGrid, Code2, Activity, ExternalLink,
  FolderOpen, Timer, Sparkles, Target, ListTodo, Flame, Hourglass, Trophy, Users, Share2,
  CreditCard, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTaskStats } from '../../hooks/useTasks';
import { useCategories, useCreateCategory } from '../../hooks/useCategories';
import { StatusTooltip } from '../ui/StatusTooltip';
import styles from './Sidebar.module.css';

/* ── helpers ─────────────────────────────────────────────── */
const getActiveAccount = () => {
  try {
    const activeEmail = localStorage.getItem('taskflow_active_account');
    const accounts = JSON.parse(localStorage.getItem('taskflow_google_accounts') || '[]');
    return accounts.find(a => a.email === activeEmail) || null;
  } catch { return null; }
};

const AVATAR_COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const avatarColor = (str = '') => AVATAR_COLORS[str.charCodeAt(0) % AVATAR_COLORS.length];

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

const formatMemberSince = (dateStr) => {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  } catch { return null; }
};

/* ─────────────────────────────────────────────────────────── */
const Sidebar = ({
  activeFilter,
  onFilterChange = () => {},
  selectedCategory = null,
  onCategoryChange = () => {},
  viewMode = 'list',
  onViewChange = () => {},
  onOpenStatus = () => {},
  onOpenPomodoro = () => {},
  onOpenWeeklySummary = () => {},
  onOpenDailyPlanner = () => {},
  onSettingsClick,
  refreshInterval = 30,
  isCollapsed: controlledCollapsed,
  onToggleCollapse: controlledToggleCollapse
}) => {
  const { user, logout } = useAuth();
  const { data: serverStats } = useTaskStats();
  const stats = serverStats || {};
  const { data: categories = [] } = useCategories();
  const createCategoryMutation = useCreateCategory();
  const [googleAccount, setGoogleAccount] = useState(getActiveAccount);
  const [loggingOut, setLoggingOut]       = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [internalCollapsed, setInternalCollapsed] = useState(() => localStorage.getItem('taskflow_sidebar_collapsed') === 'true');

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (controlledToggleCollapse) {
      controlledToggleCollapse();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('taskflow_sidebar_collapsed', next);
        return next;
      });
    }
  };

  useEffect(() => {
    const refresh = () => setGoogleAccount(getActiveAccount());
    window.addEventListener('storage', refresh);
    window.addEventListener('taskflow:account-changed', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('taskflow:account-changed', refresh);
    };
  }, []);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  /* ── Resolved display values ── */
  const serverName   = user?.name || user?.displayName || '';
  const serverEmail  = user?.email || '';
  const memberSince  = formatMemberSince(user?.createdAt);

  const displayName  = googleAccount?.name  || serverName  || 'User';
  const displayEmail = googleAccount?.email || serverEmail || '';
  const picture      = googleAccount?.picture || null;
  const initials     = getInitials(displayName);
  const bgColor      = avatarColor(displayEmail || displayName);

  const navItems = [
    { id: null,          icon: LayoutDashboard, label: 'All Tasks',   status: 'MY_TASKS',   count: stats?.total      ?? 0 },
    { id: 'TODO',        icon: Clock,           label: 'To Do',       status: 'TODO',       count: stats?.todo       ?? 0 },
    { id: 'IN_PROGRESS', icon: Play,            label: 'In Progress', status: 'IN_PROGRESS', count: stats?.inProgress ?? 0 },
    { id: 'IN_REVIEW',   icon: Eye,             label: 'In Review',   status: 'IN_REVIEW',   count: stats?.inReview   ?? 0 },
    { id: 'DONE',        icon: CheckCircle2,    label: 'Done',        status: 'DONE',       count: stats?.completed  ?? stats?.done ?? 0 },
    { id: 'CANCELLED',   icon: XCircle,         label: 'Cancelled',   status: 'CANCELLED',  count: stats?.cancelled ?? 0 },
  ];

  const legendItems = [
    { label: 'To Do',       status: 'TODO',        color: '#f59e0b' },
    { label: 'In Progress', status: 'IN_PROGRESS', color: '#0284c7' },
    { label: 'In Review',   status: 'IN_REVIEW',   color: '#8b5cf6' },
    { label: 'Done',        status: 'DONE',        color: '#10b981' },
    { label: 'Cancelled',   status: 'CANCELLED',   color: '#ef4444' },
  ];

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* ── Logo & Collapse Toggle ── */}
      <div className={styles.brand}>
        <div className={styles.brandIcon}>
          <Zap size={18} color="#fff" strokeWidth={2.5} />
        </div>
        {!isCollapsed && (
          <div>
            <p className={styles.brandName}>TaskFlow</p>
            <p className={styles.brandSub}>Pro Edition</p>
          </div>
        )}
        <button
          className={styles.collapseToggleBtn}
          onClick={toggleCollapse}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className={styles.nav}>
        <p className={styles.navSection}>VIEWS</p>
        <button
          className={`${styles.navItem} ${viewMode === 'list' ? styles.active : ''}`}
          onClick={() => onViewChange('list')}
          title="List View"
        >
          {viewMode === 'list' && (
            <motion.span layoutId="sidebar-view-indicator" className={styles.activeIndicator} />
          )}
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <LayoutList size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>List View</span>
        </button>

        <button
          className={`${styles.navItem} ${viewMode === 'board' ? styles.active : ''}`}
          onClick={() => onViewChange('board')}
          title="Kanban Board"
        >
          {viewMode === 'board' && (
            <motion.span layoutId="sidebar-view-indicator" className={styles.activeIndicator} />
          )}
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <LayoutGrid size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>Kanban Board</span>
        </button>

        <button
          className={`${styles.navItem} ${viewMode === 'calendar' ? styles.active : ''}`}
          onClick={() => onViewChange('calendar')}
          title="Calendar View"
        >
          {viewMode === 'calendar' && (
            <motion.span layoutId="sidebar-view-indicator" className={styles.activeIndicator} />
          )}
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <Calendar size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>Calendar</span>
        </button>

        <button
          className={`${styles.navItem} ${viewMode === 'files' ? styles.active : ''}`}
          onClick={() => onViewChange('files')}
          title="Uploaded Files & Documents"
        >
          {viewMode === 'files' && (
            <motion.span layoutId="sidebar-view-indicator" className={styles.activeIndicator} />
          )}
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <FolderOpen size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>Uploaded Files</span>
        </button>

        <button
          className={styles.navItem}
          onClick={onOpenDailyPlanner}
          title="Plan My Day: pick and order today's top tasks with AI"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#f59e0b' }}>
            <Calendar size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#f59e0b', fontWeight: 600 }}>Plan My Day</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-focus-mode'))}
          title="Focus Mode: show only today's top 3 tasks and hide everything else"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#6366f1' }}>
            <Target size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#6366f1', fontWeight: 600 }}>Focus Mode</span>
        </button>

        <button
          className={styles.navItem}
          onClick={onOpenPomodoro}
          title="Pomodoro Focus Timer & Streaks"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#ec4899' }}>
            <Timer size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#ec4899', fontWeight: 600 }}>Focus Timer</span>
        </button>

        <button
          className={styles.navItem}
          onClick={onOpenWeeklySummary}
          title="Weekly AI Performance Summary & Email Digest"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#8b5cf6' }}>
            <Sparkles size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#8b5cf6', fontWeight: 600 }}>Weekly AI Digest</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-overdue-rescue'))}
          title="AI Overdue Rescue: suggest new deadlines for overdue tasks"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#ef4444' }}>
            <Clock size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#ef4444', fontWeight: 600 }}>Overdue Rescue</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-templates'))}
          title="Task Templates: reusable checklists and workflows"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#059669' }}>
            <ListTodo size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#059669', fontWeight: 600 }}>Task Templates</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-habits'))}
          title="Habit Tracker: build daily streaks and routines"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#ea580c' }}>
            <Flame size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#ea580c', fontWeight: 600 }}>Habit Tracker</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-goals'))}
          title="Goals & OKRs: link tasks to strategic objectives"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#16a34a' }}>
            <Target size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#16a34a', fontWeight: 600 }}>Goals & OKRs</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-time-blocking'))}
          title="Time Blocking: schedule tasks onto a day timeline"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#0284c7' }}>
            <Hourglass size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#0284c7', fontWeight: 600 }}>Time Blocking</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-gamification'))}
          title="Achievements, Badges, Level & Weekly Leaderboard"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#c026d3' }}>
            <Trophy size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#c026d3', fontWeight: 600 }}>Achievements</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-team'))}
          title="Team & Collaborators: invite teammates, roles and audit log"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#3b82f6' }}>
            <Users size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#3b82f6', fontWeight: 600 }}>Team & Roles</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-integrations'))}
          title="Integrations: Google Calendar, Email Inbound, Slack & API Keys"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#f59e0b' }}>
            <Zap size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#f59e0b', fontWeight: 600 }}>Integrations</span>
        </button>

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-pricing'))}
          title="Pricing & Subscriptions: Free, Pro and Enterprise tiers"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#6366f1' }}>
            <CreditCard size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#6366f1', fontWeight: 600 }}>Pricing & Plans</span>
        </button>

        {user?.role === 'ADMIN' && (
          <button
            className={styles.navItem}
            onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-admin'))}
            title="Workspace Admin: User management, role controls and MRR metrics"
          >
            <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#0284c7' }}>
              <Shield size={16} className={styles.navIcon} />
            </motion.span>
            <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#0284c7', fontWeight: 600 }}>Admin Dashboard</span>
          </button>
        )}

        <button
          className={styles.navItem}
          onClick={() => window.dispatchEvent(new CustomEvent('taskflow:open-status'))}
          title="Platform Hub: Web App, Swagger API, Actuator Health & Prometheus in One Link"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1, color: '#10b981' }}>
            <Activity size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, color: '#10b981', fontWeight: 600 }}>Platform Hub (1 Link)</span>
        </button>

        <p className={styles.navSection} style={{ marginTop: '0.75rem' }}>WORKSPACE</p>
        {navItems.map(({ id, icon: Icon, label, status, title, count }) => (
          <StatusTooltip key={label} status={status} title={title || label} placement="right">
            <button
              className={`${styles.navItem} ${activeFilter === id ? styles.active : ''}`}
              onClick={() => onFilterChange(id)}
            >
              {activeFilter === id && (
                <motion.span layoutId="sidebar-indicator" className={styles.activeIndicator} />
              )}
              <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
                <Icon size={16} className={styles.navIcon} />
              </motion.span>
              <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>{label}</span>
              <span className={`${styles.navBadge} ${activeFilter === id ? styles.activeBadge : ''}`}
                style={{ position: 'relative', zIndex: 1 }}>
                {count}
              </span>
            </button>
          </StatusTooltip>
        ))}
      </nav>

      {/* ── Projects / Categories ── */}
      <div className={styles.nav} style={{ paddingTop: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem 0.25rem' }}>
          <p className={styles.navSection} style={{ margin: 0 }}>PROJECTS</p>
          <button
            onClick={() => {
              const name = window.prompt('Enter project name:');
              if (name && name.trim()) {
                createCategoryMutation.mutate({ name: name.trim() });
              }
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(199,210,254,0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px',
              borderRadius: '4px'
            }}
            title="Create Project"
          >
            <Plus size={13} />
          </button>
        </div>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.navItem} ${selectedCategory === cat.id ? styles.active : ''}`}
            onClick={() => onCategoryChange(selectedCategory === cat.id ? null : cat.id)}
          >
            {selectedCategory === cat.id && (
              <motion.span layoutId="sidebar-indicator" className={styles.activeIndicator} />
            )}
            <span
              className={styles.dot}
              style={{
                background: cat.color || '#6366f1',
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginRight: '0.4rem',
                flexShrink: 0
              }}
            />
            <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1, flex: 1, textAlign: 'left' }}>{cat.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('taskflow:open-share-project', { detail: { category: cat } }));
              }}
              title="Share Project Link"
              style={{
                position: 'relative',
                zIndex: 2,
                opacity: 0.6,
                padding: '2px 4px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
            >
              <Share2 size={12} />
            </span>
          </button>
        ))}
      </div>

      {/* ── Status legend ── */}
      <div className={styles.legend}>
        <p className={styles.navSection}>STATUS COLORS</p>
        {legendItems.map(({ label, status, color }) => (
          <StatusTooltip key={label} status={status} title={label} placement="right">
            <div
              className={styles.legendItem}
              tabIndex={0}
              onClick={() => onFilterChange(status)}
              style={{ cursor: 'pointer' }}
            >
              <span className={styles.dot} style={{ background: color }} />
              <span>{label}</span>
            </div>
          </StatusTooltip>
        ))}
      </div>

      {/* ── Developer Tools ── */}
      <div className={styles.nav} style={{ paddingTop: '0.25rem' }}>
        <p className={styles.navSection}>DEVELOPER & SYSTEM</p>
        <a
          href="/swagger-ui/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.navItem}
          title="Open Swagger API Documentation"
          style={{ textDecoration: 'none' }}
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <Code2 size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>Swagger API Docs</span>
          <ExternalLink size={12} style={{ marginLeft: 'auto', opacity: 0.6 }} />
        </a>

        <button
          type="button"
          className={styles.navItem}
          onClick={onOpenStatus}
          title="Check Backend Health & System Status"
        >
          <motion.span whileHover={{ scale: 1.15 }} style={{ display: 'flex', position: 'relative', zIndex: 1 }}>
            <Activity size={16} className={styles.navIcon} />
          </motion.span>
          <span className={styles.navLabel} style={{ position: 'relative', zIndex: 1 }}>Backend Health</span>
          <span className={styles.dot} style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', marginLeft: 'auto' }} />
        </button>
      </div>

      {/* ── Auto-update chip ── */}
      <div className={styles.autoInfo}>
        <Zap size={12} className={styles.autoIcon} />
        <p>
          Auto-updates every{' '}
          {refreshInterval < 60 ? `${refreshInterval}s` : `${refreshInterval / 60}m`}
        </p>
      </div>

      {/* ── Profile section ── */}
      <div className={styles.profileSection}>
        {/* Collapsible profile card — expands on click */}
        <AnimatePresence>
          {profileOpen && (
            <motion.div
              className={styles.profileCard}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '0.5rem' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div className={styles.profileCardInner}>
                {/* Large avatar */}
                <div className={styles.profileAvatarLg} style={{ background: bgColor }}>
                  {picture
                    ? <img src={picture} alt={displayName} className={styles.profileAvatarImg} />
                    : initials}
                </div>

                {/* Name */}
                <div className={styles.profileRow}>
                  <User size={12} className={styles.profileRowIcon} />
                  <div>
                    <p className={styles.profileRowLabel}>Name</p>
                    <p className={styles.profileRowValue}>{displayName}</p>
                  </div>
                </div>

                {/* Email */}
                <div className={styles.profileRow}>
                  <Mail size={12} className={styles.profileRowIcon} />
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.profileRowLabel}>Email</p>
                    <p className={styles.profileRowValue} title={displayEmail}
                       style={{ wordBreak: 'break-all' }}>
                      {displayEmail || '—'}
                    </p>
                  </div>
                </div>

                {/* Member since */}
                {memberSince && (
                  <div className={styles.profileRow}>
                    <Calendar size={12} className={styles.profileRowIcon} />
                    <div>
                      <p className={styles.profileRowLabel}>Member since</p>
                      <p className={styles.profileRowValue}>{memberSince}</p>
                    </div>
                  </div>
                )}

                {/* Actions inside card */}
                <div className={styles.profileActions}>
                  <button
                    className={styles.profileActionBtn}
                    onClick={onSettingsClick}
                    title="Settings"
                  >
                    <Settings size={13} />
                    <span>Settings</span>
                  </button>
                  <button
                    className={`${styles.profileActionBtn} ${styles.profileLogoutBtn}`}
                    onClick={handleLogout}
                    disabled={loggingOut}
                    title="Sign out"
                  >
                    <LogOut size={13} />
                    <span>{loggingOut ? 'Signing out…' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User bar — always visible, click to toggle profile card */}
        <motion.button
          className={`${styles.user} ${profileOpen ? styles.userOpen : ''}`}
          onClick={() => setProfileOpen(v => !v)}
          aria-expanded={profileOpen}
          aria-label="Toggle profile"
          whileTap={{ scale: 0.98 }}
        >
          {/* Avatar */}
          {picture ? (
            <img src={picture} alt={displayName} className={styles.avatarImg} />
          ) : (
            <div className={styles.avatar} style={{ background: bgColor }}>
              {initials}
            </div>
          )}

          {/* Name + email */}
          <div className={styles.userInfo}>
            <p className={styles.userName}>{displayName}</p>
            <p className={styles.userEmail} title={displayEmail}>
              {displayEmail.length > 22 ? displayEmail.slice(0, 20) + '…' : displayEmail}
            </p>
          </div>

          {/* Chevron */}
          <motion.span
            className={styles.chevronIcon}
            animate={{ rotate: profileOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronUp size={14} />
          </motion.span>
        </motion.button>
      </div>
    </aside>
  );
};

export default Sidebar;
