import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Trash2, Flag, ArrowRight, X, Folder } from 'lucide-react';
import { useBulkStatus, useBulkPriority, useBulkDelete, useBulkCategory } from '../../hooks/useTasks';
import { useCategories } from '../../hooks/useCategories';
import { triggerConfetti } from '../../utils/confetti';
import styles from './BulkActionBar.module.css';

export default function BulkActionBar({
  selectedTaskIds = [],
  onClearSelection = () => {}
}) {
  const bulkStatusMutation = useBulkStatus();
  const bulkPriorityMutation = useBulkPriority();
  const bulkDeleteMutation = useBulkDelete();
  const bulkCategoryMutation = useBulkCategory();
  const { data: categories = [] } = useCategories();

  if (!selectedTaskIds || selectedTaskIds.length === 0) return null;

  const count = selectedTaskIds.length;

  const handleMarkComplete = () => {
    triggerConfetti();
    bulkStatusMutation.mutate(
      { taskIds: selectedTaskIds, status: 'DONE' },
      { onSuccess: onClearSelection }
    );
  };

  const handleStatusChange = (e) => {
    const status = e.target.value;
    if (!status) return;
    if (status === 'DONE') triggerConfetti();
    bulkStatusMutation.mutate(
      { taskIds: selectedTaskIds, status },
      { onSuccess: onClearSelection }
    );
  };

  const handlePriorityChange = (e) => {
    const priority = e.target.value;
    if (!priority) return;
    bulkPriorityMutation.mutate(
      { taskIds: selectedTaskIds, priority },
      { onSuccess: onClearSelection }
    );
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    const categoryId = val === 'none' ? null : val;
    bulkCategoryMutation.mutate(
      { taskIds: selectedTaskIds, categoryId },
      { onSuccess: onClearSelection }
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete ${count} selected task${count > 1 ? 's' : ''}? This action cannot be undone.`)) return;
    bulkDeleteMutation.mutate(selectedTaskIds, { onSuccess: onClearSelection });
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.bulkBar}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      >
        <div className={styles.countBadge}>
          <span className={styles.countNum}>{count}</span>
          <span className={styles.countLabel}>{count === 1 ? 'task selected' : 'tasks selected'}</span>
        </div>

        <div className={styles.divider} />

        {/* Mark Done */}
        <button
          className={styles.completeBtn}
          onClick={handleMarkComplete}
          disabled={bulkStatusMutation.isPending}
          title="Mark selected tasks as Done"
        >
          <Check size={14} />
          <span>Mark Complete</span>
        </button>

        {/* Set Status */}
        <div className={styles.selectWrapper}>
          <select
            defaultValue=""
            onChange={handleStatusChange}
            className={styles.bulkSelect}
            title="Change status for selected"
          >
            <option value="" disabled>Status ▾</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Set Priority */}
        <div className={styles.selectWrapper}>
          <select
            defaultValue=""
            onChange={handlePriorityChange}
            className={styles.bulkSelect}
            title="Change priority for selected"
          >
            <option value="" disabled>Priority ▾</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Assign Project */}
        {categories.length > 0 && (
          <div className={styles.selectWrapper}>
            <select
              defaultValue=""
              onChange={handleCategoryChange}
              className={styles.bulkSelect}
              title="Move to project"
            >
              <option value="" disabled>Project ▾</option>
              <option value="none">No Project</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Delete */}
        <button
          className={styles.deleteBtn}
          onClick={handleDelete}
          disabled={bulkDeleteMutation.isPending}
          title="Delete selected tasks"
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>

        <div className={styles.divider} />

        {/* Deselect */}
        <button
          className={styles.clearBtn}
          onClick={onClearSelection}
          title="Deselect all"
        >
          <X size={15} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
