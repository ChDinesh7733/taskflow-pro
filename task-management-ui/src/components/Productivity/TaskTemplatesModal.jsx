import React, { useState, useEffect } from 'react';
import productivityApi from '../../api/productivityApi';
import { useCategories } from '../../hooks/useCategories';
import { triggerConfetti } from '../../utils/confetti';
import {
  FileText, Search, Plus, Check, Play, Sparkles, Folder, Trash2, X, ChevronDown, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './TaskTemplatesModal.module.css';

export default function TaskTemplatesModal({ isOpen, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: categories = [] } = useCategories();

  // Custom template form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [newDesc, setNewDesc] = useState('');
  const [newTasksRaw, setNewTasksRaw] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await productivityApi.getTemplates();
      setTemplates(data || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (template) => {
    setApplyingId(template.id);
    const toastId = toast.loading(`Applying "${template.title}" to workspace...`);
    try {
      const res = await productivityApi.applyTemplate(template.id);
      triggerConfetti();
      toast.success(`🎉 Created ${res.createdCount} tasks from template!`, { id: toastId });
      window.dispatchEvent(new CustomEvent('taskflow:refresh-tasks'));
      onClose();
    } catch (err) {
      toast.error('Failed to apply template: ' + (err.response?.data?.message || err.message), { id: toastId });
    } finally {
      setApplyingId(null);
    }
  };

  const handleCreateCustom = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Template title is required');
      return;
    }

    // Parse lines as tasks
    const lines = newTasksRaw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast.error('Please enter at least one task for this template.');
      return;
    }

    const tasksJson = JSON.stringify(lines.map((l, i) => ({
      title: l,
      priority: i === 0 ? 'HIGH' : 'MEDIUM',
      offsetDays: i + 1,
    })));

    try {
      await productivityApi.createTemplate({
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        tasksJson,
      });

      toast.success('Custom template created successfully! 📋');
      setShowCreateForm(false);
      setNewTitle('');
      setNewDesc('');
      setNewTasksRaw('');
      loadTemplates();
    } catch (err) {
      toast.error('Failed to create template: ' + (err.response?.data?.message || err.message));
    }
  };

  if (!isOpen) return null;

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()) ||
    (t.description && t.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>📋</div>
            <div>
              <h2 className={styles.headerTitle}>Task Templates & Workflows</h2>
              <p className={styles.headerSubtitle}>
                Instant reusable checklists to kickstart projects and operational routines
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={15} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search templates by keyword or category..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button
              className={styles.newTemplateBtn}
              onClick={() => setShowCreateForm(prev => !prev)}
            >
              <Plus size={15} />
              <span>{showCreateForm ? 'Close Form' : 'New Template'}</span>
            </button>
          </div>

          {/* Create Custom Template Form */}
          {showCreateForm && (
            <form onSubmit={handleCreateCustom} className={styles.customForm}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e1b4b', fontSize: '0.95rem' }}>
                Create Reusable Task Template
              </h4>
              <div className={styles.formRow}>
                <input
                  type="text"
                  placeholder="Template Title (e.g. New Employee Onboarding)"
                  className={styles.inputField}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
                <select
                  className={styles.inputField}
                  style={{ width: '160px' }}
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Routine">Routine</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="Brief description or purpose of this workflow..."
                className={styles.inputField}
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
              <textarea
                placeholder="Enter checklist tasks (one per line)..."
                className={styles.textareaField}
                rows={4}
                value={newTasksRaw}
                onChange={e => setNewTasksRaw(e.target.value)}
                required
              />
              <div className={styles.formButtons}>
                <button
                  type="button"
                  style={{ background: '#e2e8f0', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '0.5rem', cursor: 'pointer' }}
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.applyBtn}
                >
                  Save Template
                </button>
              </div>
            </form>
          )}

          {/* Grid of Templates */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading productivity templates...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              No templates matching "{search}".
            </div>
          ) : (
            <div className={styles.templateGrid}>
              {filtered.map(tmpl => {
                let parsedTasks = [];
                try {
                  parsedTasks = JSON.parse(tmpl.tasksJson);
                } catch (e) {
                  parsedTasks = [];
                }

                return (
                  <div key={tmpl.id} className={styles.templateCard}>
                    <div>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>{tmpl.title}</h3>
                        <span className={styles.categoryBadge}>{tmpl.category}</span>
                      </div>
                      <p className={styles.cardDesc}>{tmpl.description}</p>

                      {/* Preview Checklist */}
                      <div className={styles.checklistPreview}>
                        <div className={styles.checklistTitle}>Checklist Preview:</div>
                        {parsedTasks.slice(0, 4).map((task, idx) => (
                          <div key={idx} className={styles.checklistItem}>
                            <Check size={13} className={styles.checkIcon} />
                            <span>{task.title}</span>
                          </div>
                        ))}
                        {parsedTasks.length > 4 && (
                          <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.25rem', fontWeight: 600 }}>
                            + {parsedTasks.length - 4} more checklist items...
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <span className={styles.taskCountLabel}>
                        {parsedTasks.length} task{parsedTasks.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        className={styles.applyBtn}
                        onClick={() => handleApply(tmpl)}
                        disabled={applyingId === tmpl.id}
                      >
                        <CheckCircle2 size={14} />
                        <span>{applyingId === tmpl.id ? 'Applying...' : 'Apply Template'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
