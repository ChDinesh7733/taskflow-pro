import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Sparkles, Settings, Moon, Sun, CheckCircle2,
  Clock, Play, Eye, FileText, ArrowRight, Calendar, LayoutGrid, LayoutList,
  Code2, Activity, FolderOpen, Timer, Mic, Target, ListTodo, Flame, Hourglass, Trophy, Users, Share2,
  CreditCard, Shield, Download, Zap, Film
} from 'lucide-react';
import { useTaskList } from '../../hooks/useTasks';
import styles from './CommandPalette.module.css';

export function CommandPalette({
  isOpen,
  onClose,
  onCreateTask,
  onOpenAi,
  onOpenSettings,
  onSelectStatus,
  onSelectTask,
  onSwitchView = () => {},
  onOpenStatus = () => {},
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Fetch recent tasks for search
  const { data: taskData } = useTaskList({ size: 30 });
  const tasks = taskData?.content || [];

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Built-in actions
  const defaultActions = [
    {
      id: 'create-task',
      label: 'Create New Task',
      group: 'Actions',
      icon: Plus,
      action: () => { onClose(); onCreateTask(); },
    },
    {
      id: 'voice-task',
      label: 'Voice Task Input (Speak to create task)',
      group: 'Actions',
      icon: Mic,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-voice-task')); },
    },
    {
      id: 'daily-planner',
      label: 'Plan My Day with AI (Order today\'s top tasks)',
      group: 'Productivity',
      icon: Calendar,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-daily-planner')); },
    },
    {
      id: 'overdue-rescue',
      label: 'Rescue Overdue Tasks (AI Smart Reschedule)',
      group: 'Productivity',
      icon: Clock,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-overdue-rescue')); },
    },
    {
      id: 'focus-mode',
      label: 'Enter Focus Mode (Show today\'s top 3 tasks)',
      group: 'Productivity',
      icon: Target,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-focus-mode')); },
    },
    {
      id: 'focus-pomodoro',
      label: 'Open Pomodoro Focus Timer & Streaks',
      group: 'Productivity',
      icon: Timer,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-pomodoro')); },
    },
    {
      id: 'weekly-summary',
      label: 'Weekly AI Summary & Performance Digest',
      group: 'Productivity',
      icon: Sparkles,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-weekly-summary')); },
    },
    {
      id: 'task-templates',
      label: 'Task Templates & Reusable Workflows',
      group: 'Productivity',
      icon: ListTodo,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-templates')); },
    },
    {
      id: 'habit-tracker',
      label: 'Daily Habit Tracker & Streaks',
      group: 'Productivity',
      icon: Flame,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-habits')); },
    },
    {
      id: 'goals-okrs',
      label: 'Goals & Strategic OKRs',
      group: 'Productivity',
      icon: Target,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-goals')); },
    },
    {
      id: 'time-blocking',
      label: 'Daily Time Blocking Timeline',
      group: 'Productivity',
      icon: Hourglass,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-time-blocking')); },
    },
    {
      id: 'gamification-achievements',
      label: 'Achievements, Badges & Weekly Leaderboard',
      group: 'Productivity',
      icon: Trophy,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-gamification')); },
    },
    {
      id: 'team-collaborators',
      label: 'Team & Collaborators (Invite teammates & manage roles)',
      group: 'Collaboration',
      icon: Users,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-team')); },
    },
    {
      id: 'audit-log',
      label: 'Audit Activity Log (Workspace change trail)',
      group: 'Collaboration',
      icon: Activity,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-team')); },
    },
    {
      id: 'share-project',
      label: 'Share Project Public Link (Read-only guest view)',
      group: 'Collaboration',
      icon: Share2,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-share-project')); },
    },
    {
      id: 'integrations-suite',
      label: 'Integrations (Google Calendar, Email Forwarding, Slack Webhooks)',
      group: 'Integrations',
      icon: Zap,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-integrations')); },
    },
    {
      id: 'integrations-api-keys',
      label: 'Developer API Keys & Browser Extension API',
      group: 'Integrations',
      icon: Code2,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-integrations')); },
    },
    {
      id: 'pricing-plans',
      label: 'Pricing & Plans (Free, Pro, Enterprise)',
      group: 'Business & Admin',
      icon: CreditCard,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-pricing')); },
    },
    {
      id: 'watch-keynote-film',
      label: 'Watch Keynote Commercial Reel (8K Cinematic Animation)',
      group: 'Showcase',
      icon: Film,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-cinema-reel')); },
    },
    {
      id: 'admin-dashboard',
      label: 'Admin Dashboard (Users, Roles & MRR Metrics)',
      group: 'Business & Admin',
      icon: Shield,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-admin')); },
    },
    {
      id: 'export-csv-action',
      label: 'Export Workspace Tasks to CSV',
      group: 'Actions',
      icon: Download,
      action: () => {
        onClose();
        import('../../api/billingApi').then(({ billingApi }) => billingApi.exportTasksCsv());
      },
    },
    {
      id: 'ai-breakdown',
      label: 'Break down a goal with AI (Review & Save subtasks)',
      group: 'Actions',
      icon: Sparkles,
      action: () => { onClose(); window.dispatchEvent(new CustomEvent('taskflow:open-breakdown')); },
    },
    {
      id: 'ai-chat',
      label: 'AI Chat Assistant',
      group: 'Actions',
      icon: Sparkles,
      action: () => { onClose(); onOpenAi(); },
    },
    {
      id: 'settings',
      label: 'Open Settings & Preferences',
      group: 'Actions',
      icon: Settings,
      action: () => { onClose(); onOpenSettings(); },
    },
    {
      id: 'swagger-docs',
      label: 'Open Swagger API Documentation',
      group: 'Developer',
      icon: Code2,
      action: () => { onClose(); window.open('/swagger-ui/index.html', '_blank'); },
    },
    {
      id: 'backend-health',
      label: 'Check Backend Health & System Status',
      group: 'Developer',
      icon: Activity,
      action: () => { onClose(); onOpenStatus(); },
    },
    {
      id: 'view-files',
      label: 'Open Uploaded Files & Backend Storage',
      group: 'Views',
      icon: FolderOpen,
      action: () => { onClose(); onSwitchView('files'); },
    },
    {
      id: 'view-calendar',
      label: 'Open Calendar View',
      group: 'Views',
      icon: Calendar,
      action: () => { onClose(); onSwitchView('calendar'); },
    },
    {
      id: 'view-board',
      label: 'Open Kanban Board',
      group: 'Views',
      icon: LayoutGrid,
      action: () => { onClose(); onSwitchView('board'); },
    },
    {
      id: 'view-list',
      label: 'Open List View',
      group: 'Views',
      icon: LayoutList,
      action: () => { onClose(); onSwitchView('list'); },
    },
    {
      id: 'nav-all',
      label: 'View All Tasks',
      group: 'Navigation',
      icon: FileText,
      action: () => { onClose(); onSelectStatus(null); },
    },
    {
      id: 'nav-todo',
      label: 'View To Do Tasks',
      group: 'Navigation',
      icon: Clock,
      action: () => { onClose(); onSelectStatus('TODO'); },
    },
    {
      id: 'nav-inprogress',
      label: 'View In Progress Tasks',
      group: 'Navigation',
      icon: Play,
      action: () => { onClose(); onSelectStatus('IN_PROGRESS'); },
    },
    {
      id: 'nav-done',
      label: 'View Done Tasks',
      group: 'Navigation',
      icon: CheckCircle2,
      action: () => { onClose(); onSelectStatus('DONE'); },
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Dark / Light Theme',
      group: 'Preferences',
      icon: Moon,
      action: () => {
        onClose();
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('taskflow_theme', isDark ? 'dark' : 'light');
      },
    },
  ];

  // Filter actions & tasks by query
  const q = query.trim().toLowerCase();

  const filteredActions = defaultActions.filter(a =>
    a.label.toLowerCase().includes(q)
  );

  const filteredTasks = q
    ? tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5).map(t => ({
        id: `task-${t.id}`,
        label: t.title,
        group: 'Matching Tasks',
        icon: FileText,
        action: () => { onClose(); onSelectTask(t); },
      }))
    : [];

  const allItems = [...filteredActions, ...filteredTasks];

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (allItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === 'Enter' && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.palette}
          initial={{ scale: 0.95, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -20 }}
          transition={{ duration: 0.16 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className={styles.inputWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              ref={inputRef}
              className={styles.input}
              placeholder="Type a command or search tasks..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
              onKeyDown={handleKeyDown}
            />
            <span className={styles.kbd}>ESC to close</span>
          </div>

          {/* Results List */}
          <div className={styles.results}>
            {allItems.length === 0 ? (
              <div className={styles.empty}>No matching commands or tasks found</div>
            ) : (
              allItems.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <button
                    key={item.id}
                    className={`${styles.item} ${isSelected ? styles.itemSelected : ''}`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className={styles.itemLeft}>
                      <Icon size={15} style={{ color: isSelected ? '#4f46e5' : '#64748b' }} />
                      <span>{item.label}</span>
                    </div>
                    <span className={styles.itemRight}>{item.group}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Navigation Hints */}
          <div className={styles.footer}>
            <div className={styles.footerHints}>
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
            <span>TaskFlow Command Palette</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CommandPalette;
