import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import AuthPage from './components/AuthPage/AuthPage';
import LandingPage from './components/LandingPage/LandingPage';
import Sidebar from './components/Sidebar/Sidebar';
import TopBar from './components/TopBar/TopBar';
import StatsBar from './components/StatsBar/StatsBar';
import TaskWorkspace from './components/TaskWorkspace/TaskWorkspace';
import TaskForm from './components/TaskForm/TaskForm';
import TaskDetailDrawer from './components/TaskDetailDrawer/TaskDetailDrawer';
import CommandPalette from './components/CommandPalette/CommandPalette';
import ConfirmDialog from './components/ConfirmDialog/ConfirmDialog';
import SettingsModal from './components/Settings/Settings';
import SystemStatusModal from './components/SystemStatusModal/SystemStatusModal';
import SmartTaskBar from './components/SmartTask/SmartTaskBar';
import PomodoroModal from './components/Pomodoro/PomodoroModal';
import WeeklySummaryModal from './components/WeeklySummary/WeeklySummaryModal';
import DailyPlannerModal from './components/DailyPlanner/DailyPlannerModal';
import VoiceTaskModal from './components/VoiceTask/VoiceTaskModal';
import OverdueRescueModal from './components/OverdueRescueModal';
import SmartTaskPreviewModal from './components/SmartTask/SmartTaskPreviewModal';
import AiBreakdownModal from './components/AiBreakdown/AiBreakdownModal';
import FocusMode from './components/FocusMode/FocusMode';
import TaskTemplatesModal from './components/Productivity/TaskTemplatesModal';
import HabitTrackerModal from './components/Productivity/HabitTrackerModal';
import GoalsModal from './components/Productivity/GoalsModal';
import TimeBlockingModal from './components/Productivity/TimeBlockingModal';
import GamificationModal from './components/Gamification/GamificationModal';
import TeamModal from './components/collaboration/TeamModal';
import ShareProjectModal from './components/collaboration/ShareProjectModal';
import PublicProjectView from './components/collaboration/PublicProjectView';
import IntegrationsModal from './components/integrations/IntegrationsModal';
import PricingModal from './components/billing/PricingModal';
import AdminDashboardModal from './components/billing/AdminDashboardModal';
import CinematicReelModal from './components/CinematicReel/CinematicReelModal';
import GlobalAmbientCanvas from './components/AmbientBackground/GlobalAmbientCanvas';
import { aiApi } from './api/aiApi';
import { AiAssistantPanel } from './components/AiAssistant/AiAssistantPanel';
import { ProductivityChart } from './components/ProductivityChart/ProductivityChart';
import { useDeleteTask, useCreateTask, TASK_KEYS } from './hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import { useTaskSocket } from './hooks/useTaskSocket';
import { fadeIn } from './animations/motionVariants';
import styles from './App.module.css';

/* ── Full-screen session check spinner ── */
function SessionLoader() {
  return (
    <motion.div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:'#f8fafc', flexDirection:'column', gap:'0.75rem' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        style={{ display:'flex', color:'#4f46e5' }}>
        <Loader2 size={32} />
      </motion.div>
      <p style={{ color:'#64748b', fontSize:'0.9rem', fontFamily:'Inter, sans-serif' }}>Loading TaskFlow…</p>
    </motion.div>
  );
}

/* ── Main dashboard ── */
function Dashboard() {
  const qc           = useQueryClient();
  const deleteTask   = useDeleteTask();
  const createTask   = useCreateTask();

  const [showForm,       setShowForm]       = useState(false);
  const [editingTask,    setEditingTask]    = useState(null);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('taskflow_sidebar_collapsed') === 'true');
  const [showSettings,   setShowSettings]   = useState(false);
  const [showAi,         setShowAi]         = useState(false);
  const [wsConnected,    setWsConnected]    = useState(false);
  const [selectedStatus,   setSelectedStatus]   = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [globalSearch,     setGlobalSearch]     = useState('');
  const [selectedTask,     setSelectedTask]     = useState(null);
  const [showPalette,      setShowPalette]      = useState(false);
  const [showStatus,       setShowStatus]       = useState(false);
  const [showPomodoro,     setShowPomodoro]     = useState(false);
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);
  const [showDailyPlanner, setShowDailyPlanner] = useState(false);
  const [showBreakdown,    setShowBreakdown]    = useState(false);
  const [showVoiceModal,   setShowVoiceModal]   = useState(false);
  const [voiceParsedData,  setVoiceParsedData]  = useState(null);
  const [showVoicePreview, setShowVoicePreview] = useState(false);
  const [showFocusMode,    setShowFocusMode]    = useState(false);
  const [showTemplates,    setShowTemplates]    = useState(false);
  const [showHabits,       setShowHabits]       = useState(false);
  const [showGoals,        setShowGoals]        = useState(false);
  const [showTimeBlocking, setShowTimeBlocking] = useState(false);
  const [showGamification, setShowGamification] = useState(false);
  const [showTeamModal,    setShowTeamModal]    = useState(false);
  const [showShareModal,   setShowShareModal]   = useState(false);
  const [projectToShare,   setProjectToShare]   = useState(null);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAdminModal,   setShowAdminModal]   = useState(false);
  const [showCinemaReel,   setShowCinemaReel]   = useState(false);
  const [pomodoroTaskId,   setPomodoroTaskId]   = useState(null);
  const [viewMode,         setViewMode]         = useState('list'); // 'list' | 'board' | 'calendar'

  // Global Pomodoro open event listener
  useEffect(() => {
    const handleOpenPomodoro = (e) => {
      setPomodoroTaskId(e.detail?.taskId || null);
      setShowPomodoro(true);
    };
    window.addEventListener('taskflow:open-pomodoro', handleOpenPomodoro);
    return () => window.removeEventListener('taskflow:open-pomodoro', handleOpenPomodoro);
  }, []);

  // Global Weekly Summary open event listener
  useEffect(() => {
    const handleOpenWeekly = () => setShowWeeklySummary(true);
    window.addEventListener('taskflow:open-weekly-summary', handleOpenWeekly);
    return () => window.removeEventListener('taskflow:open-weekly-summary', handleOpenWeekly);
  }, []);

  // Global Daily Planner open event listener
  useEffect(() => {
    const handleOpenPlanner = () => setShowDailyPlanner(true);
    window.addEventListener('taskflow:open-daily-planner', handleOpenPlanner);
    return () => window.removeEventListener('taskflow:open-daily-planner', handleOpenPlanner);
  }, []);

  // Global Voice Task Input open event listener
  useEffect(() => {
    const handleOpenVoice = () => setShowVoiceModal(true);
    window.addEventListener('taskflow:open-voice-task', handleOpenVoice);
    return () => window.removeEventListener('taskflow:open-voice-task', handleOpenVoice);
  }, []);

  // Global Goal Breakdown open event listener
  useEffect(() => {
    const handleOpenBreakdown = () => setShowBreakdown(true);
    window.addEventListener('taskflow:open-breakdown', handleOpenBreakdown);
    return () => window.removeEventListener('taskflow:open-breakdown', handleOpenBreakdown);
  }, []);

  // Global Focus Mode open event listener
  useEffect(() => {
    const handleOpenFocus = () => setShowFocusMode(true);
    window.addEventListener('taskflow:open-focus-mode', handleOpenFocus);
    return () => window.removeEventListener('taskflow:open-focus-mode', handleOpenFocus);
  }, []);

  // Global Productivity Suite open event listeners
  useEffect(() => {
    const onTemplates = () => setShowTemplates(true);
    const onHabits = () => setShowHabits(true);
    const onGoals = () => setShowGoals(true);
    const onTimeBlocking = () => setShowTimeBlocking(true);
    const onGamification = () => setShowGamification(true);
    const onTeam = () => setShowTeamModal(true);
    const onIntegrations = () => setShowIntegrations(true);
    const onPricing = () => setShowPricingModal(true);
    const onAdmin = () => setShowAdminModal(true);
    const onCinemaReel = () => setShowCinemaReel(true);
    const onShareProject = (e) => {
      setProjectToShare(e.detail?.category || null);
      setShowShareModal(true);
    };

    window.addEventListener('taskflow:open-templates', onTemplates);
    window.addEventListener('taskflow:open-habits', onHabits);
    window.addEventListener('taskflow:open-goals', onGoals);
    window.addEventListener('taskflow:open-time-blocking', onTimeBlocking);
    window.addEventListener('taskflow:open-gamification', onGamification);
    window.addEventListener('taskflow:open-team', onTeam);
    window.addEventListener('taskflow:open-integrations', onIntegrations);
    window.addEventListener('taskflow:open-pricing', onPricing);
    window.addEventListener('taskflow:open-admin', onAdmin);
    window.addEventListener('taskflow:open-cinema-reel', onCinemaReel);
    window.addEventListener('taskflow:open-share-project', onShareProject);

    return () => {
      window.removeEventListener('taskflow:open-templates', onTemplates);
      window.removeEventListener('taskflow:open-habits', onHabits);
      window.removeEventListener('taskflow:open-goals', onGoals);
      window.removeEventListener('taskflow:open-time-blocking', onTimeBlocking);
      window.removeEventListener('taskflow:open-gamification', onGamification);
      window.removeEventListener('taskflow:open-team', onTeam);
      window.removeEventListener('taskflow:open-integrations', onIntegrations);
      window.removeEventListener('taskflow:open-pricing', onPricing);
      window.removeEventListener('taskflow:open-admin', onAdmin);
      window.removeEventListener('taskflow:open-cinema-reel', onCinemaReel);
      window.removeEventListener('taskflow:open-share-project', onShareProject);
    };
  }, []);

  const handleVoiceTranscript = async (speechText) => {
    const toastId = toast.loading('AI is parsing spoken task details…');
    try {
      const data = await aiApi.parseSmartTask(speechText);
      toast.success('Task details parsed! Review before saving.', { id: toastId });
      setVoiceParsedData(data);
      setShowVoicePreview(true);
    } catch (err) {
      toast.error('Failed to parse spoken task with AI', { id: toastId });
    }
  };

  // Global Ctrl+K / Cmd+K Command Palette listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowPalette(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // WebSocket connection — updates React Query cache on events
  useTaskSocket(useCallback(({ event, payload }) => {
    if (event === 'STATUS_CHANGED') {
      toast(`⚡ Task "${payload?.title}" moved to ${payload?.status?.replace('_', ' ')}`, {
        duration: 3000,
        icon: '🔄',
      });
      setWsConnected(true);
    }
  }, []));

  const handleCreateClick  = () => { setEditingTask(null); setShowForm(true); };
  const handleEditClick    = (task) => { setEditingTask(task); setShowForm(true); };
  const handleDeleteClick  = (id) => setDeleteTarget(id);

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await deleteTask.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleRefresh = () => qc.invalidateQueries({ queryKey: TASK_KEYS.all });

  // Called from AI modal — bulk-creates tasks
  const handleAddAiTasks = async (tasks) => {
    for (const t of tasks) {
      await createTask.mutateAsync(t);
    }
    toast.success(`✅ Added ${tasks.length} task${tasks.length !== 1 ? 's' : ''} from AI breakdown`);
  };

  const handleToggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('taskflow_sidebar_collapsed', next);
      return next;
    });
  };

  return (
    <motion.div className={`${styles.layout} ${sidebarOpen ? styles.sidebarOpen : ''} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}
      variants={fadeIn} initial="hidden" animate="visible">
      <Toaster position="top-right" toastOptions={{
        duration: 3500,
        style: { fontFamily:'Inter, sans-serif', fontSize:'0.875rem', borderRadius:'10px',
                 boxShadow:'0 8px 30px rgba(0,0,0,0.12)', border:'1px solid #e2e8f0' },
        success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
      }} />

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={styles.sidebar}>
        <Sidebar
          activeFilter={selectedStatus}
          onFilterChange={setSelectedStatus}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          viewMode={viewMode}
          onViewChange={setViewMode}
          onOpenStatus={() => setShowStatus(true)}
          onOpenPomodoro={() => { setPomodoroTaskId(null); setShowPomodoro(true); }}
          onOpenWeeklySummary={() => setShowWeeklySummary(true)}
          onOpenDailyPlanner={() => setShowDailyPlanner(true)}
          onSettingsClick={() => setShowSettings(true)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebarCollapse}
        />
      </div>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <TopBar
            search={globalSearch}
            onSearchChange={setGlobalSearch}
            onRefresh={handleRefresh}
            onCreateClick={handleCreateClick}
            wsConnected={wsConnected}
            onOpenStatus={() => setShowStatus(true)}
            onOpenPomodoro={() => { setPomodoroTaskId(null); setShowPomodoro(true); }}
            onOpenWeeklySummary={() => setShowWeeklySummary(true)}
            onOpenDailyPlanner={() => setShowDailyPlanner(true)}
            mobileMenuBtn={
              <motion.button className={styles.mobileMenuBtn}
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu" whileTap={{ scale: 0.92 }}>
                <AnimatePresence mode="wait" initial={false}>
                  {sidebarOpen
                    ? <motion.span key="x" initial={{ rotate:-90, opacity:0 }} animate={{ rotate:0, opacity:1 }} exit={{ rotate:90, opacity:0 }} transition={{ duration:0.15 }}><X size={18} /></motion.span>
                    : <motion.span key="m" initial={{ rotate:90, opacity:0 }} animate={{ rotate:0, opacity:1 }} exit={{ rotate:-90, opacity:0 }} transition={{ duration:0.15 }}><Menu size={18} /></motion.span>}
                </AnimatePresence>
              </motion.button>
            }
          />
        </div>

        <div className={styles.content}>
          <StatsBar onFilterChange={setSelectedStatus} />
          <ProductivityChart />
          <div className={styles.aiBreakdownBar}>
            <button
              className={styles.aiBtn}
              onClick={() => setShowDailyPlanner(true)}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                marginRight: '0.5rem'
              }}
            >
              📅 Plan my day with AI
            </button>
            <button className={styles.aiBtn} onClick={() => setShowBreakdown(true)}>
              ✨ Break down a goal with AI
            </button>
          </div>
          <SmartTaskBar />
          <TaskWorkspace
            status={selectedStatus}
            onStatusChange={setSelectedStatus}
            categoryId={selectedCategory}
            onClearCategory={() => setSelectedCategory(null)}
            globalSearch={globalSearch}
            onClearSearch={() => setGlobalSearch('')}
            viewMode={viewMode}
            onViewChange={setViewMode}
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            onSelectTask={(task) => setSelectedTask(task)}
            onCreateClick={handleCreateClick}
          />
        </div>
      </div>

      {/* Task Detail Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <TaskForm key="task-form" task={editingTask} onClose={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTarget && (
          <ConfirmDialog key="confirm-dialog"
            message="This task will be permanently deleted. This action cannot be undone."
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal key="settings" onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {showAi && (
        <AiAssistantPanel
          onClose={() => setShowAi(false)}
        />
      )}

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={showPalette}
        onClose={() => setShowPalette(false)}
        onCreateTask={handleCreateClick}
        onOpenAi={() => setShowAi(true)}
        onOpenSettings={() => setShowSettings(true)}
        onSelectStatus={(status) => setSelectedStatus(status)}
        onSelectTask={(task) => setSelectedTask(task)}
        onSwitchView={(mode) => setViewMode(mode)}
        onOpenStatus={() => setShowStatus(true)}
      />

      {/* System Status & Developer Links Modal */}
      <SystemStatusModal
        isOpen={showStatus}
        onClose={() => setShowStatus(false)}
        wsConnected={wsConnected}
      />

      {/* Pomodoro Focus Timer Modal */}
      <PomodoroModal
        isOpen={showPomodoro}
        onClose={() => {
          setShowPomodoro(false);
          setPomodoroTaskId(null);
        }}
        defaultTaskId={pomodoroTaskId}
      />

      {/* Weekly AI Performance Digest Modal */}
      <WeeklySummaryModal
        isOpen={showWeeklySummary}
        onClose={() => setShowWeeklySummary(false)}
      />

      {/* AI Daily Planner Modal */}
      <DailyPlannerModal
        isOpen={showDailyPlanner}
        onClose={() => setShowDailyPlanner(false)}
        onSelectTask={(task) => setSelectedTask(task)}
      />

      {/* Global Voice Speech-to-Task Input Modal */}
      <VoiceTaskModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        onTranscriptReady={handleVoiceTranscript}
      />

      {/* Voice Parsed Review Modal */}
      <SmartTaskPreviewModal
        isOpen={showVoicePreview}
        onClose={() => {
          setShowVoicePreview(false);
          setVoiceParsedData(null);
        }}
        parsedData={voiceParsedData}
      />

      {/* AI Overdue Task Rescue Modal */}
      <OverdueRescueModal />

      {/* Upgraded AI Goal Breakdown & Subtask Generator Modal */}
      <AiBreakdownModal
        isOpen={showBreakdown}
        onClose={() => setShowBreakdown(false)}
      />

      {/* Focus Mode: distraction-free top 3 tasks */}
      <FocusMode
        isOpen={showFocusMode}
        onClose={() => setShowFocusMode(false)}
      />

      {/* Task Templates & Workflows Modal (Step 4.3) */}
      <TaskTemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
      />

      {/* Daily Habit Tracker & Streaks Modal (Step 4.4) */}
      <HabitTrackerModal
        isOpen={showHabits}
        onClose={() => setShowHabits(false)}
      />

      {/* Strategic Goals & OKRs Modal (Step 4.5) */}
      <GoalsModal
        isOpen={showGoals}
        onClose={() => setShowGoals(false)}
      />

      {/* Daily Time Blocking Timeline Modal (Step 4.6) */}
      <TimeBlockingModal
        isOpen={showTimeBlocking}
        onClose={() => setShowTimeBlocking(false)}
      />

      {/* Gamification, Badges & Weekly Leaderboard Modal (Step 5) */}
      <GamificationModal
        isOpen={showGamification}
        onClose={() => setShowGamification(false)}
      />

      {/* Team & Collaboration Modal (Step 6.1 & 6.5) */}
      <TeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
      />

      {/* Share Project Public Link Modal (Step 6.3) */}
      <ShareProjectModal
        isOpen={showShareModal}
        category={projectToShare}
        onClose={() => {
          setShowShareModal(false);
          setProjectToShare(null);
        }}
        onCategoryUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        }}
      />

      {/* Integrations & Developer APIs Modal (Step 7) */}
      <IntegrationsModal
        isOpen={showIntegrations}
        onClose={() => setShowIntegrations(false)}
      />

      {/* Pricing & Subscription Modal (Step 9) */}
      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
      />

      {/* Workspace Admin Dashboard Modal (Step 9) */}
      <AdminDashboardModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
      />

      {/* Cinematic Commercial Keynote Reel Modal */}
      <CinematicReelModal
        isOpen={showCinemaReel}
        onClose={() => setShowCinemaReel(false)}
      />

      {/* Keep breakdown modal accessible via a dedicated trigger inside AI panel if needed */}
    </motion.div>
  );
}

/* ── Root — auth gate ── */
function App() {
  // Direct public view for shared project URLs
  const pathname = window.location.pathname;
  if (pathname.startsWith('/shared/projects/')) {
    const token = pathname.replace('/shared/projects/', '').split('/')[0];
    return <PublicProjectView shareToken={token} />;
  }

  const { user, checking, demoLogin } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    try {
      await demoLogin();
      toast.success('🚀 Logged into Live Demo Account (Alex Rivera)');
    } catch (err) {
      toast.error('Failed to initialize demo account. Please try again.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <>
      {/* Whole-website continuous ambient particle & cosmic mesh animation */}
      <GlobalAmbientCanvas />

      <AnimatePresence mode="wait">
        {checking ? (
          <SessionLoader key="loader" />
        ) : !user ? (
          showAuthModal ? (
            <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <AuthPage
                initialMode={authMode}
                onBackToLanding={() => setShowAuthModal(false)}
                onDemoLogin={handleLaunchDemo}
              />
            </motion.div>
          ) : (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
              <LandingPage
                onOpenAuth={(mode) => {
                  setAuthMode(mode || 'login');
                  setShowAuthModal(true);
                }}
                onLaunchDemo={handleLaunchDemo}
                demoLoading={demoLoading}
              />
            </motion.div>
          )
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            style={{ width: '100%', minHeight: '100vh', position: 'relative', zIndex: 1 }}
          >
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
