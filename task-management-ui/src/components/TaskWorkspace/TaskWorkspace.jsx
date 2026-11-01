import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, SlidersHorizontal, ChevronLeft, ChevronRight, LayoutList, LayoutGrid, Calendar as CalendarIcon, Download, Upload, Printer, FolderOpen, Zap } from 'lucide-react';
import TaskCard from '../TaskCard/TaskCard';
import KanbanBoard from '../KanbanBoard/KanbanBoard';
import CalendarView from '../CalendarView/CalendarView';
import UploadedFilesSection from '../UploadedFilesSection/UploadedFilesSection';
import BulkActionBar from '../BulkActionBar/BulkActionBar';
import { GlowButton } from '../ui/GlowButton';
import { StatusTooltip } from '../ui/StatusTooltip';
import { fadeUp, staggerContainer, staggerItem } from '../../animations/motionVariants';
import { useTaskList, useCreateTask } from '../../hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import taskApi from '../../api/taskApi';
import toast from 'react-hot-toast';
import styles from './TaskWorkspace.module.css';

/* ── Constants ── */
const STATUS_TABS = [
  { id: null,          label: 'All Tasks',   status: 'MY_TASKS' },
  { id: 'TODO',        label: 'To Do',       status: 'TODO' },
  { id: 'IN_PROGRESS', label: 'In Progress', status: 'IN_PROGRESS' },
  { id: 'IN_REVIEW',   label: 'In Review',   status: 'IN_REVIEW' },
  { id: 'DONE',        label: 'Done',        status: 'DONE' },
  { id: 'CANCELLED',   label: 'Cancelled',   status: 'CANCELLED' },
];

const SORTS = [
  { id: 'createdAt', dir: 'DESC', label: 'Newest First' },
  { id: 'createdAt', dir: 'ASC',  label: 'Oldest First' },
  { id: 'dueDate',   dir: 'ASC',  label: 'Due Date' },
  { id: 'priority',  dir: 'ASC',  label: 'By Priority' },
  { id: 'title',     dir: 'ASC',  label: 'Title A–Z' },
];

const PAGE_SIZE = 12;

/* ── Skeleton ── */
const SkeletonCard = () => (
  <div className={styles.skeleton}>
    <div className={styles.skeletonAccent} />
    <div className={styles.skeletonBody}>
      <div className={styles.skeletonBadge} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonText} />
      <div className={styles.skeletonFooter} />
    </div>
  </div>
);

/* ── Empty state ── */
const EmptyState = ({ hasFilter, onClear, onCreate, onSeedDemo }) => (
  <motion.div className={styles.empty} variants={fadeUp} initial="hidden" animate="visible">
    <motion.div className={styles.emptyIcon}
      animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#eef2ff"/>
        <path d="M14 18h20M14 24h14M14 30h8" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="36" cy="32" r="6" fill="#4f46e5"/>
        <path d="M33 32l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.div>
    <h3 className={styles.emptyTitle}>{hasFilter ? 'No matching tasks' : 'Your workspace is clear'}</h3>
    <p className={styles.emptyText}>
      {hasFilter
        ? "Try adjusting your search or filters."
        : 'Create your first task or load the full sample workspace with one click.'}
    </p>
    <div className={styles.emptyActions}>
      {hasFilter && <GlowButton variant="secondary" onClick={onClear}>Reset Filters</GlowButton>}
      <GlowButton variant="primary" onClick={onCreate}>
        <Plus size={15} /> Create {hasFilter ? 'New' : 'First'} Task
      </GlowButton>
      {!hasFilter && onSeedDemo && (
        <button
          type="button"
          onClick={onSeedDemo}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.55rem 1.1rem',
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '0.825rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
          }}
        >
          <Zap size={14} /> Load Full Sample Workspace
        </button>
      )}
    </div>
  </motion.div>
);

/* ── Debounce hook ── */
function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ── Main workspace ── */
const TaskWorkspace = ({
  status: propStatus = null,
  onStatusChange,
  categoryId = null,
  onClearCategory = () => {},
  globalSearch = '',
  onClearSearch = () => {},
  viewMode: propViewMode = 'list',
  onViewChange,
  onEdit,
  onDelete,
  onSelectTask,
  onCreateClick
}) => {
  const qc = useQueryClient();
  const { demoLogin } = useAuth();
  const [internalStatus, setInternalStatus] = useState(null);
  const status = onStatusChange ? propStatus : internalStatus;
  const setStatus = onStatusChange || setInternalStatus;

  const [sortIdx,  setSortIdx]  = useState(0);
  const [showSort, setShowSort] = useState(false);
  const [page,     setPage]     = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [internalViewMode, setInternalViewMode] = useState('list');
  const viewMode = onViewChange ? propViewMode : internalViewMode;
  const setViewMode = onViewChange || setInternalViewMode;

  const debouncedSearch = useDebounced(globalSearch);
  const sort = SORTS[sortIdx];

  const handleSeedDemo = async () => {
    try {
      const toastId = toast.loading('Loading sample workspace...');
      await demoLogin();
      await qc.invalidateQueries();
      toast.success('Sample workspace loaded with 33 tasks!', { id: toastId });
    } catch {
      toast.error('Failed to load sample workspace');
    }
  };

  // Reset to page 0 on filter change
  useEffect(() => {
    setPage(0);
    setSelectedTaskIds([]);
  }, [status, debouncedSearch, sortIdx, categoryId]);

  const handleToggleSelect = (taskId) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map(t => t.id));
    }
  };

  const filters = {
    status:     status || undefined,
    categoryId: categoryId || undefined,
    search:     debouncedSearch || undefined,
    sortBy:     sort.id,
    direction:  sort.dir,
    page:       viewMode === 'list' ? page : 0,
    size:       viewMode === 'list' ? PAGE_SIZE : 100,
  };

  const { data, isLoading, isFetching, isError, error, refetch } = useTaskList(filters);

  const tasks        = data?.content      ?? [];
  const totalPages   = data?.totalPages   ?? 0;
  const totalElements= data?.totalElements ?? 0;
  const hasFilter    = status || debouncedSearch || categoryId;

  const csvFileInputRef = useRef(null);
  const pdfFileInputRef = useRef(null);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleUploadCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Uploading "${file.name}" to backend store...`);
    try {
      const res = await taskApi.uploadCsv(file);
      toast.success(res.message || `CSV file "${file.name}" uploaded successfully! 🎉`, { id: toastId, duration: 4000 });
      refetch();
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['task-stats'] });
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to upload CSV file';
      toast.error(errMsg, { id: toastId });
    } finally {
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    }
  };

  const handleUploadPDF = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Uploading "${file.name}" to backend store...`);
    try {
      const res = await taskApi.uploadPdf(file);
      toast.success(res.message || `PDF file "${file.name}" uploaded and stored successfully in backend! 📄`, { id: toastId, duration: 4000 });
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to upload PDF file';
      toast.error(errMsg, { id: toastId });
    } finally {
      if (pdfFileInputRef.current) pdfFileInputRef.current.value = '';
    }
  };

  const handleExportCSV = async () => {
    try {
      toast.loading('Exporting CSV from server...', { id: 'csv-export' });
      await taskApi.exportCsv();
      toast.success('Tasks CSV downloaded successfully!', { id: 'csv-export' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to export CSV', { id: 'csv-export' });
    }
  };

  const handleExportPDF = async () => {
    try {
      toast.loading('Generating PDF report...', { id: 'pdf-export' });
      await taskApi.exportPdf();
      toast.success('PDF report ready! Opening in preview tab.', { id: 'pdf-export' });
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to export PDF', { id: 'pdf-export' });
    }
  };

  const clearFilters = () => {
    setStatus(null);
    onClearSearch();
    onClearCategory();
    setPage(0);
  };

  return (
    <motion.section className={styles.workspace} variants={fadeUp} initial="hidden" animate="visible">
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <StatusTooltip status="MY_TASKS" placement="bottom">
            <h2 className={styles.heading} style={{ cursor: 'help' }} tabIndex={0}>
              My Tasks
            </h2>
          </StatusTooltip>
          <span className={styles.count}>{totalElements} task{totalElements !== 1 ? 's' : ''}</span>
          <AnimatePresence>
            {isFetching && !isLoading && (
              <motion.span className={styles.refreshingBadge}
                initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                Syncing…
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* File Tools: CSV Upload, PDF Upload, and Export Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', position: 'relative' }}>
          {/* CSV Upload Button */}
          <button
            type="button"
            className={styles.sortBtn}
            onClick={() => csvFileInputRef.current?.click()}
            title="Open File Explorer to upload and store a CSV file in backend"
          >
            <Upload size={12} />
            <span>CSV</span>
          </button>
          <input
            type="file"
            ref={csvFileInputRef}
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={handleUploadCSV}
          />

          {/* PDF Upload Button */}
          <button
            type="button"
            className={styles.sortBtn}
            onClick={() => pdfFileInputRef.current?.click()}
            title="Open File Explorer to upload and store a PDF document in backend"
          >
            <Upload size={12} />
            <span>PDF</span>
          </button>
          <input
            type="file"
            ref={pdfFileInputRef}
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={handleUploadPDF}
          />

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={styles.sortBtn}
              onClick={() => setShowExportMenu(prev => !prev)}
              title="Export tasks to CSV or PDF"
            >
              <Download size={12} />
              <span>Export</span>
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  className={styles.sortDropdown}
                  style={{ right: 0, left: 'auto', minWidth: '150px' }}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    className={styles.sortOption}
                    onClick={() => { setShowExportMenu(false); handleExportCSV(); }}
                  >
                    Download CSV
                  </button>
                  <button
                    className={styles.sortOption}
                    onClick={() => { setShowExportMenu(false); handleExportPDF(); }}
                  >
                    Download PDF Report
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Status tabs */}
        <div className={styles.tabs}>
          {STATUS_TABS.map(({ id, label, status: statusKey }) => (
            <StatusTooltip key={label} status={statusKey} placement="bottom">
              <button
                className={`${styles.tab} ${status === id ? styles.tabActive : ''}`}
                onClick={() => setStatus(id)}
              >
                {label}
                {status === id && <motion.span className={styles.tabUnderline} layoutId="workspace-tab" />}
              </button>
            </StatusTooltip>
          ))}
        </div>

        {/* Toolbar Right: Active Search Badge + Sort + Clear Filters */}
        <div className={styles.toolbarRight}>
          <AnimatePresence>
            {debouncedSearch && (
              <motion.div
                className={styles.searchIndicator}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Search size={12} />
                <span>"{debouncedSearch}"</span>
                <button
                  onClick={onClearSearch}
                  className={styles.clearSearchBadgeBtn}
                  aria-label="Clear search filter"
                >
                  <X size={11} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View Toggle: List / Board */}
          <div className={styles.viewToggle}>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <LayoutList size={13} />
              <span>List</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'board' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('board')}
              title="Board View"
            >
              <LayoutGrid size={13} />
              <span>Board</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'calendar' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('calendar')}
              title="Calendar View"
            >
              <CalendarIcon size={13} />
              <span>Calendar</span>
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'files' ? styles.viewBtnActive : ''}`}
              onClick={() => setViewMode('files')}
              title="Backend File Storage & Uploaded Documents"
            >
              <FolderOpen size={13} />
              <span>Files</span>
            </button>
          </div>

          {viewMode === 'list' && tasks.length > 0 && (
            <button
              type="button"
              className={styles.sortBtn}
              onClick={handleToggleSelectAll}
              title={selectedTaskIds.length === tasks.length ? 'Deselect all' : 'Select all visible tasks'}
            >
              <input
                type="checkbox"
                checked={selectedTaskIds.length > 0 && selectedTaskIds.length === tasks.length}
                readOnly
                style={{ cursor: 'pointer', width: '13px', height: '13px', accentColor: '#4f46e5' }}
              />
              <span>{selectedTaskIds.length > 0 ? `${selectedTaskIds.length} Selected` : 'Select All'}</span>
            </button>
          )}

          <div className={styles.sortWrap}>
            <button className={styles.sortBtn} onClick={() => setShowSort(v => !v)} title="Sort">
              <SlidersHorizontal size={14} />
              <span>{sort.label}</span>
            </button>
            <AnimatePresence>
              {showSort && (
                <motion.div className={styles.sortDropdown}
                  initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.18, ease: [0.22,1,0.36,1] }}>
                  {SORTS.map(({ label }, i) => (
                    <button key={label}
                      className={`${styles.sortOption} ${sortIdx === i ? styles.sortActive : ''}`}
                      onClick={() => { setSortIdx(i); setShowSort(false); }}>
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {hasFilter && (
              <motion.button className={styles.clearFiltersBtn} onClick={clearFilters}
                initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                <X size={13} /><span>Clear</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Task grid or Kanban Board or Files or Error state or Loading */}
      {viewMode === 'files' ? (
        <UploadedFilesSection
          onUploadCsv={handleUploadCSV}
          onUploadPdf={handleUploadPDF}
        />
      ) : isError ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Could not load tasks</p>
          <p className={styles.emptyText}>{error?.message || 'A network error occurred.'}</p>
          <GlowButton variant="secondary" onClick={() => refetch()}>Try Again</GlowButton>
        </div>
      ) : isLoading ? (
        <div className={styles.loadingState}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : viewMode === 'board' ? (
        <div style={{ padding: '1.25rem' }}>
          <KanbanBoard
            tasks={tasks}
            onSelectTask={onSelectTask}
            onCreateInStatus={(colStatus) => {
              if (onCreateClick) onCreateClick(colStatus);
            }}
          />
        </div>
      ) : viewMode === 'calendar' ? (
        <CalendarView
          tasks={tasks}
          onSelectTask={onSelectTask}
          onCreateTaskWithDate={(dateStr) => {
            if (onCreateClick) onCreateClick(dateStr);
          }}
        />
      ) : tasks.length === 0 ? (
        <EmptyState hasFilter={hasFilter} onClear={clearFilters} onCreate={onCreateClick} onSeedDemo={handleSeedDemo} />
      ) : (
        <motion.div className={styles.grid} variants={staggerContainer} initial="hidden" animate="visible">
          <AnimatePresence mode="popLayout">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onDelete={onDelete}
                onSelect={onSelectTask}
                isSelected={selectedTaskIds.includes(task.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Pagination (only in list view) */}
      {viewMode === 'list' && totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft size={16} />
          </button>
          <span className={styles.pageInfo}>Page {page + 1} of {totalPages}</span>
          <button className={styles.pageBtn} disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {/* Floating Bulk Action Bar (Step 8.1) */}
      <BulkActionBar
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
      />
    </motion.section>
  );
};

export default TaskWorkspace;
