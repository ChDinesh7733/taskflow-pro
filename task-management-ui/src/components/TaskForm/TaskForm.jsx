import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Plus, Pencil, Flag, Calendar, AlertCircle,
  Info, Tag, ChevronDown, Loader2,
} from 'lucide-react';
import { GlowButton } from '../ui/GlowButton';
import { overlayVariants, modalVariants } from '../../animations/motionVariants';
import { useCreateTask, useUpdateTask } from '../../hooks/useTasks';
import { useCategories } from '../../hooks/useCategories';
import { aiApi } from '../../api/aiApi';
import styles from './TaskForm.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a YYYY-MM-DD string (from <input type="date">) to ISO date string */
const toISO = (val) => (val && val.trim() ? val.trim() : null);

/** LocalDate string (YYYY-MM-DD) from a TaskResponse field */
const fromDate = (d) => (d ? (typeof d === 'string' ? d.substring(0, 10) : d) : '');

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z
  .object({
    title: z
      .string()
      .min(1, 'Task title is required')
      .max(255, 'Title must be 255 characters or less'),
    description: z
      .string()
      .max(1000, 'Description must be 1000 characters or less')
      .optional()
      .or(z.literal('')),
    priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    startDate:   z.string().optional().or(z.literal('')),
    dueDate:     z.string().optional().or(z.literal('')),
    tags:        z.string().optional().or(z.literal('')),
    assigneeName:z.string().optional().or(z.literal('')),
    categoryId:  z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.dueDate && data.dueDate < data.startDate) {
      ctx.addIssue({
        path: ['dueDate'],
        code: z.ZodIssueCode.custom,
        message: 'Due date must be on or after the start date',
      });
    }
  });

// ─── Priority pill config ─────────────────────────────────────────────────────

const PRIORITIES = [
  { value: 'LOW',    label: 'Low',    color: '#059669', bg: 'rgba(5,150,105,0.12)',   ring: 'rgba(5,150,105,0.35)'  },
  { value: 'MEDIUM', label: 'Medium', color: '#d97706', bg: 'rgba(217,119,6,0.12)',   ring: 'rgba(217,119,6,0.35)'  },
  { value: 'HIGH',   label: 'High',   color: '#dc2626', bg: 'rgba(220,38,38,0.12)',   ring: 'rgba(220,38,38,0.35)'  },
  { value: 'URGENT', label: 'Urgent', color: '#9333ea', bg: 'rgba(147,51,234,0.12)',  ring: 'rgba(147,51,234,0.35)' },
];

// ─── Small components ─────────────────────────────────────────────────────────

const FieldError = ({ msg }) =>
  msg ? (
    <motion.p
      className={styles.errorMsg}
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <AlertCircle size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
      {msg}
    </motion.p>
  ) : null;

/** Simple confirmation dialog for "Discard changes?" */
const DiscardDialog = ({ onConfirm, onCancel }) => (
  <motion.div
    className={styles.discardOverlay}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="discard-title"
  >
    <motion.div
      className={styles.discardBox}
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1,    opacity: 1 }}
      exit={{    scale: 0.92, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
    >
      <p id="discard-title" className={styles.discardTitle}>Discard changes?</p>
      <p className={styles.discardBody}>You have unsaved changes. Are you sure you want to close?</p>
      <div className={styles.discardActions}>
        <button className={styles.discardKeep} onClick={onCancel} autoFocus>
          Keep editing
        </button>
        <button className={styles.discardConfirm} onClick={onConfirm}>
          Discard
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const TaskForm = ({ task, onClose }) => {
  const isEdit = Boolean(task);
  const [showDiscard, setShowDiscard] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title:        task?.title        ?? '',
      description:  task?.description  ?? '',
      priority:     task?.priority     ?? 'MEDIUM',
      startDate:    fromDate(task?.startDate),
      dueDate:      fromDate(task?.dueDate),
      tags:         task?.tags         ?? '',
      assigneeName: task?.assigneeName ?? '',
      categoryId:   task?.categoryId   ?? '',
    },
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: categories = [] } = useCategories();

  // ── Watched values ──────────────────────────────────────────────────────────
  const titleVal    = watch('title');
  const startDate   = watch('startDate');
  const dueDate     = watch('dueDate');
  const priorityVal = watch('priority');

  const isOverdue =
    dueDate && !isEdit && new Date(dueDate) < new Date(new Date().toDateString());

  const [duplicateWarning, setDuplicateWarning] = useState(null);

  useEffect(() => {
    if (isEdit || !titleVal || titleVal.trim().length < 3) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await aiApi.checkDuplicate(titleVal.trim());
        if (res && res.isDuplicate) {
          setDuplicateWarning(res);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        // quiet ignore
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [titleVal, isEdit]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const onSubmit = async (values) => {
    const payload = {
      title:        values.title.trim(),
      description:  values.description?.trim() || null,
      priority:     values.priority,
      startDate:    toISO(values.startDate),
      dueDate:      toISO(values.dueDate),
      tags:         values.tags?.trim() || null,
      assigneeName: values.assigneeName?.trim() || null,
      categoryId:   values.categoryId || null,
    };

    if (isEdit) {
      await updateTask.mutateAsync({ id: task.id, payload });
    } else {
      await createTask.mutateAsync(payload);
    }
    onClose();
  };

  // ── "Safe close" — show discard dialog if form is dirty ────────────────────
  const handleClose = useCallback(() => {
    if (isDirty && !isSubmitting) {
      setShowDiscard(true);
    } else {
      onClose();
    }
  }, [isDirty, isSubmitting, onClose]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose, handleSubmit, isSubmitting]);   // eslint-disable-line

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isCreateDisabled = (!titleVal?.trim() || isSubmitting);
  const activePriority   = PRIORITIES.find(p => p.value === priorityVal) ?? PRIORITIES[1];

  return (
    <>
      <motion.div
        className={styles.overlay}
        onClick={handleClose}
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? 'Edit task' : 'Create new task'}
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <div className={styles.headerIcon}>
                {isEdit ? <Pencil size={16} color="#fff" /> : <Plus size={16} color="#fff" />}
              </div>
              <div>
                <h2 className={styles.title}>
                  {isEdit ? 'Edit Task' : 'Create New Task'}
                </h2>
                <p className={styles.subtitle}>
                  {isEdit
                    ? 'Update task details below'
                    : 'Fill in the details to add a new task · Ctrl+Enter to submit'}
                </p>
              </div>
            </div>
            <button
              className={styles.closeBtn}
              onClick={handleClose}
              aria-label="Close modal"
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          {/* ── Form ───────────────────────────────────────────────────── */}
          <form
            className={styles.form}
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            aria-label="Task form"
          >
            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tf-title">
                Task Title <span className={styles.required} aria-hidden="true">*</span>
              </label>
              <input
                id="tf-title"
                type="text"
                autoFocus
                className={`${styles.input} ${errors.title ? styles.hasError : ''}`}
                placeholder="e.g. Design landing page layout"
                {...register('title')}
                disabled={isSubmitting}
                maxLength={255}
                aria-required="true"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'tf-title-err' : undefined}
              />
              <AnimatePresence>
                {errors.title && (
                  <FieldError msg={errors.title.message} />
                )}
              </AnimatePresence>
              {duplicateWarning && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Info size={14} style={{ flexShrink: 0, color: '#d97706' }} />
                  <span>
                    <strong>Possible Duplicate:</strong> Similar task "{duplicateWarning.similarTaskTitle}" already exists ({Math.round(duplicateWarning.similarityScore * 100)}% match, {duplicateWarning.similarTaskStatus}).
                  </span>
                </div>
              )}
              <p className={styles.charCount} aria-live="polite">
                {titleVal.length} / 255
              </p>
            </div>

            {/* Description */}
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tf-desc">
                Description{' '}
                <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="tf-desc"
                rows={3}
                className={`${styles.textarea} ${errors.description ? styles.hasError : ''}`}
                placeholder="Add more details about this task…"
                {...register('description')}
                disabled={isSubmitting}
                maxLength={1000}
                aria-invalid={!!errors.description}
              />
              <AnimatePresence>
                {errors.description && (
                  <FieldError msg={errors.description.message} />
                )}
              </AnimatePresence>
            </div>

            {/* Priority — accessible radio group */}
            <div className={styles.field}>
              <span className={styles.label} id="tf-priority-label">
                <Flag size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                Priority
              </span>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <div
                    className={styles.priorityGroup}
                    role="radiogroup"
                    aria-labelledby="tf-priority-label"
                  >
                    {PRIORITIES.map(({ value, label, color, bg, ring }) => {
                      const checked = field.value === value;
                      return (
                        <label
                          key={value}
                          className={`${styles.priorityBtn} ${checked ? styles.priorityActive : ''}`}
                          style={checked ? { background: bg, color, borderColor: color, '--ring': ring } : {}}
                        >
                          <input
                            type="radio"
                            name="priority"
                            value={value}
                            checked={checked}
                            onChange={() => field.onChange(value)}
                            disabled={isSubmitting}
                            className={styles.srOnly}
                            aria-label={`Priority: ${label}`}
                          />
                          <span
                            className={styles.priorityDot}
                            style={{ background: color }}
                            aria-hidden="true"
                          />
                          {label}
                        </label>
                      );
                    })}
                  </div>
                )}
              />
            </div>

            {/* Category */}
            {categories.length > 0 && (
              <div className={styles.field}>
                <label className={styles.label} htmlFor="tf-category">
                  <Tag size={13} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                  Category{' '}
                  <span className={styles.optional}>(optional)</span>
                </label>
                <div className={styles.selectWrapper}>
                  <select
                    id="tf-category"
                    className={styles.select}
                    {...register('categoryId')}
                    disabled={isSubmitting}
                    aria-label="Select category"
                  >
                    <option value="">— No category —</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className={styles.selectArrow} aria-hidden="true" />
                </div>
              </div>
            )}

            {/* Dates */}
            <div className={styles.dateRow}>
              {/* Start Date */}
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="tf-start">
                  <Calendar size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                  Start Date
                </label>
                <input
                  id="tf-start"
                  type="date"
                  className={`${styles.input} ${errors.startDate ? styles.hasError : ''}`}
                  {...register('startDate')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.startDate}
                />
                <AnimatePresence>
                  {errors.startDate && <FieldError msg={errors.startDate.message} />}
                </AnimatePresence>
              </div>

              {/* Due Date */}
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="tf-due">
                  <Calendar size={12} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                  Due Date
                  {isOverdue && (
                    <span
                      className={styles.overdueTag}
                      role="status"
                      aria-label="This date is in the past"
                    >
                      ⚠ Overdue
                    </span>
                  )}
                </label>
                <input
                  id="tf-due"
                  type="date"
                  className={`${styles.input} ${
                    errors.dueDate || isOverdue ? styles.hasError : ''
                  }`}
                  {...register('dueDate')}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.dueDate}
                />
                <AnimatePresence>
                  {errors.dueDate && <FieldError msg={errors.dueDate.message} />}
                </AnimatePresence>
              </div>
            </div>

            {/* Assignee & Tags */}
            <div className={styles.dateRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="tf-assignee">
                  Assignee <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="tf-assignee"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. Sarah Connor"
                  {...register('assigneeName')}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label} htmlFor="tf-tags">
                  Tags <span className={styles.optional}>(comma-separated)</span>
                </label>
                <input
                  id="tf-tags"
                  type="text"
                  className={styles.input}
                  placeholder="e.g. backend, urgent, v1"
                  {...register('tags')}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Helper text */}
            {(startDate || dueDate) && (
              <motion.p
                className={styles.dateHelper}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Info size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }} />
                {startDate
                  ? 'Task starts automatically on the start date.'
                  : 'No start date set — task is available immediately.'}
              </motion.p>
            )}

            {/* Footer */}
            <div className={styles.footer}>
              <GlowButton
                type="button"
                variant="secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </GlowButton>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isCreateDisabled}
                aria-disabled={isCreateDisabled}
                aria-label={
                  isSubmitting
                    ? (isEdit ? 'Saving task…' : 'Creating task…')
                    : (isEdit ? 'Save changes' : 'Create task')
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2
                      size={15}
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                    {isEdit ? 'Saving…' : 'Creating…'}
                  </>
                ) : (
                  <>
                    <span
                      className={styles.priorityDot}
                      style={{ background: activePriority.color, width: 8, height: 8 }}
                      aria-hidden="true"
                    />
                    {isEdit ? 'Save Changes' : 'Create Task'}
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      {/* Discard confirmation */}
      <AnimatePresence>
        {showDiscard && (
          <DiscardDialog
            onConfirm={onClose}
            onCancel={() => setShowDiscard(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default TaskForm;
