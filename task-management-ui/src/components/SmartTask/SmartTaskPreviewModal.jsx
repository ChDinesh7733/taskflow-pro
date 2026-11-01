import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Sparkles, Calendar, Tag, AlertCircle, CheckCircle2, Folder, Clock, Info } from 'lucide-react';
import { useCreateTask } from '../../hooks/useTasks';
import { useCategories } from '../../hooks/useCategories';
import { aiApi } from '../../api/aiApi';
import toast from 'react-hot-toast';
import styles from './SmartTaskPreviewModal.module.css';

const PRIORITIES = [
  { value: 'LOW', label: 'Low', color: '#64748b' },
  { value: 'MEDIUM', label: 'Medium', color: '#eab308' },
  { value: 'HIGH', label: 'High', color: '#f97316' },
  { value: 'URGENT', label: 'Urgent', color: '#e11d48' },
];

export default function SmartTaskPreviewModal({ isOpen, onClose, parsedData }) {
  const createTaskMutation = useCreateTask();
  const { data: categories = [] } = useCategories();

  const [title, setTitle] = useState(parsedData?.title || '');
  const [description, setDescription] = useState(parsedData?.description || '');
  const [priority, setPriority] = useState(parsedData?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(parsedData?.dueDate || '');
  const [tags, setTags] = useState(parsedData?.tags || '');
  const [categoryId, setCategoryId] = useState('');
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Debounced duplicate detection
  React.useEffect(() => {
    if (!title || title.trim().length < 3) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await aiApi.checkDuplicate(title.trim());
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
  }, [title]);

  // Sync state if parsedData changes
  React.useEffect(() => {
    if (parsedData) {
      setTitle(parsedData.title || '');
      setDescription(parsedData.description || '');
      setPriority(parsedData.priority || 'MEDIUM');
      setDueDate(parsedData.dueDate || '');
      setTags(parsedData.tags || '');
    }
  }, [parsedData]);

  if (!isOpen || !parsedData) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Creating smart task...');
    try {
      await createTaskMutation.mutateAsync({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        tags: tags.trim() || undefined,
        categoryId: categoryId || undefined,
      });
      toast.success('Smart task created successfully! 🎉', { id: toastId });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to create task', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

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
            <div className={styles.iconWrap}>
              <Sparkles size={18} color="#4f46e5" />
            </div>
            <div>
              <h3>Review & Save Smart Task</h3>
              <p>AI automatically extracted these fields. Edit anything before saving.</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Original input banner */}
        {parsedData.rawInput && (
          <div className={styles.rawBanner}>
            <span className={styles.rawLabel}>Original text:</span>
            <span className={styles.rawText}>"{parsedData.rawInput}"</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} className={styles.form}>
          {/* Title */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              Task Title <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.input}
              placeholder="e.g. Finish quarterly project report"
              required
            />
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
          </div>

          {/* Row: Priority & Due Date */}
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Clock size={13} /> Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className={styles.select}
              >
                {PRIORITIES.map(p => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Calendar size={13} /> Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          {/* Row: Tags & Project */}
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Tag size={13} /> Labels / Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className={styles.input}
                placeholder="e.g. finance, urgent, devops"
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <Folder size={13} /> Project / Category
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className={styles.select}
              >
                <option value="">No Project (General)</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Notes / Description (Optional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Add extra context or details..."
              rows={3}
            />
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              <CheckCircle2 size={15} />
              <span>{saving ? 'Saving Task…' : 'Save Task to Workspace'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
