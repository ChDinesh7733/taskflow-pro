import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Clock, Flag, User, Tag, Calendar, FileText,
  MessageSquare, History, Paperclip, Send, UploadCloud, Trash2, ExternalLink, Timer
} from 'lucide-react';
import { useUpdateTask, useChangeStatus, useTaskComments, useAddComment, useTaskActivity } from '../../hooks/useTasks';
import { SubtaskPanel } from '../SubtaskPanel/SubtaskPanel';
import { triggerConfetti } from '../../utils/confetti';
import { collaborationApi } from '../../api/collaborationApi';
import toast from 'react-hot-toast';
import styles from './TaskDetailDrawer.module.css';

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'To Do', color: '#d97706', bg: '#fef3c7' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: '#2563eb', bg: '#dbeafe' },
  { value: 'IN_REVIEW', label: 'In Review', color: '#7c3aed', bg: '#ede9fe' },
  { value: 'DONE', label: 'Done', color: '#059669', bg: '#d1fae5' },
  { value: 'CANCELLED', label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' },
];

const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: '#059669' },
  { value: 'MEDIUM', label: 'Medium', color: '#d97706' },
  { value: 'HIGH', label: 'High', color: '#dc2626' },
  { value: 'URGENT', label: 'Urgent', color: '#9333ea' },
];

export function TaskDetailDrawer({ task, isOpen, onClose }) {
  if (!isOpen || !task) return null;

  const updateMutation = useUpdateTask();
  const changeStatusMutation = useChangeStatus();
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(task.id);
  const addCommentMutation = useAddComment(task.id);
  const { data: activityLogs = [], isLoading: activityLoading } = useTaskActivity(task.id);

  // Editable local state
  const [title, setTitle] = useState(task.title || '');
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.substring(0, 10) : '');
  const [assigneeName, setAssigneeName] = useState(task.assigneeName || '');
  const [tags, setTags] = useState(() => {
    if (!task.tags) return [];
    return typeof task.tags === 'string' ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  });
  const [newTagInput, setNewTagInput] = useState('');
  const [activeTab, setActiveTab] = useState('subtasks'); // 'subtasks' | 'comments' | 'activity' | 'attachments'
  const [commentText, setCommentText] = useState('');
  const [attachments, setAttachments] = useState([
    { id: '1', name: 'Specification_v1.pdf', size: '2.4 MB', date: 'Oct 26' },
  ]);

  // Collaboration: live presence & teammates
  const [viewers, setViewers] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');

  const fileInputRef = useRef(null);

  // Sync state when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
      setAssigneeName(task.assigneeName || '');
      setTags(task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []);

      // Live presence heartbeat
      collaborationApi.heartbeatPresence(task.id).then(setViewers).catch(() => {});
      const pInterval = setInterval(() => {
        collaborationApi.heartbeatPresence(task.id).then(setViewers).catch(() => {});
      }, 20000);

      // Load teammates for assignment & @mentions
      collaborationApi.getMembers().then(setTeammates).catch(() => {});

      return () => clearInterval(pInterval);
    }
  }, [task]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Status transition
  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    if (newStatus === 'DONE') {
      triggerConfetti();
    }
    changeStatusMutation.mutate({ id: task.id, status: newStatus });
  };

  // Add tag
  const handleAddTag = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && newTagInput.trim()) {
      e.preventDefault();
      const val = newTagInput.trim().replace(/^#/, '');
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setNewTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  // Mentions
  const handleCommentChange = (e) => {
    const val = e.target.value;
    setCommentText(val);

    const lastWord = val.split(/\s+/).pop();
    if (lastWord && lastWord.startsWith('@')) {
      setShowMentionMenu(true);
      setMentionFilter(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (tm) => {
    const words = commentText.split(/\s+/);
    words.pop();
    words.push(`@${tm.name} `);
    setCommentText(words.join(' '));
    setShowMentionMenu(false);
  };

  const renderCommentContent = (content) => {
    if (!content) return '';
    const parts = content.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className={styles.mentionHighlight}>{part}</span>;
      }
      return part;
    });
  };

  // Post comment
  const handlePostComment = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim(), {
      onSuccess: () => {
        setCommentText('');
        setShowMentionMenu(false);
      },
    });
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newFiles = files.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      date: 'Just now',
    }));
    setAttachments(prev => [...prev, ...newFiles]);
    toast.success(`Attached ${files.length} file${files.length > 1 ? 's' : ''}`);
  };

  // Save changes
  const handleSave = () => {
    updateMutation.mutate({
      id: task.id,
      payload: {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        dueDate: dueDate || null,
        assigneeName: assigneeName.trim() || null,
        tags: tags.length ? tags.join(', ') : null,
      },
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const currStatus = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0];

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
          className={styles.drawer}
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <span className={styles.idBadge}>#{task.id?.substring(0, 8)}</span>
              <select
                className={styles.statusSelect}
                value={task.status}
                onChange={handleStatusChange}
                style={{
                  background: currStatus.bg,
                  color: currStatus.color,
                  borderColor: currStatus.color,
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.iconBtn}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('taskflow:open-pomodoro', { detail: { taskId: task.id } }));
                }}
                title="Start Pomodoro Focus on this task"
                style={{ color: '#db2777' }}
              >
                <Timer size={17} />
              </button>
              <button className={styles.iconBtn} onClick={onClose} aria-label="Close drawer">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Live Collaborators Presence */}
          {viewers.length > 0 && (
            <div className={styles.viewersBadge}>
              <span className={styles.viewersPulse} />
              <span>
                👁️ {viewers.length} {viewers.length === 1 ? 'person viewing now' : 'people viewing now'}
              </span>
              <div className={styles.viewerAvatars}>
                {viewers.map(v => (
                  <img
                    key={v.userId}
                    src={v.avatarUrl}
                    alt={v.name}
                    title={`${v.name} (${v.email})`}
                    className={styles.miniAvatar}
                    onError={e => {
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(v.name)}&background=6366f1&color=fff`;
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Body */}
          <div className={styles.content}>
            {/* Title Area */}
            <div className={styles.titleArea}>
              <input
                className={styles.titleInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title..."
              />
            </div>

            {/* Meta Grid */}
            <div className={styles.metaGrid}>
              {/* Priority */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}><Flag size={12} /> Priority</span>
                <select
                  className={styles.selectInput}
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}><Calendar size={12} /> Due Date</span>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              {/* Assignee */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}><User size={12} /> Assignee</span>
                <input
                  type="text"
                  className={styles.textInput}
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  list="teammates-assignee-list"
                  placeholder="Assign to teammate..."
                />
                <datalist id="teammates-assignee-list">
                  {teammates.map(tm => (
                    <option key={tm.id} value={tm.name}>{tm.name} ({tm.role}) - {tm.email}</option>
                  ))}
                </datalist>
              </div>

              {/* Tags / Labels */}
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}><Tag size={12} /> Tags / Labels</span>
                <div className={styles.tagsContainer}>
                  {tags.map((t) => (
                    <span key={t} className={styles.tagPill}>
                      #{t}
                      <button
                        type="button"
                        className={styles.removeTagBtn}
                        onClick={() => removeTag(t)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className={styles.addTagInput}
                    placeholder="+ Tag (Enter)"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}><FileText size={14} /> Description</span>
              </div>
              <textarea
                className={styles.descTextarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details, links, or context about this task…"
              />
            </div>

            {/* Sub-sections tabs */}
            <div className={styles.section}>
              <div className={styles.tabNav}>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'subtasks' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('subtasks')}
                >
                  Subtasks
                  {activeTab === 'subtasks' && <motion.div layoutId="drawerTab" className={styles.activeIndicator} />}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'comments' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('comments')}
                >
                  <MessageSquare size={13} /> Comments ({comments.length})
                  {activeTab === 'comments' && <motion.div layoutId="drawerTab" className={styles.activeIndicator} />}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'activity' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('activity')}
                >
                  <History size={13} /> Activity
                  {activeTab === 'activity' && <motion.div layoutId="drawerTab" className={styles.activeIndicator} />}
                </button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'attachments' ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab('attachments')}
                >
                  <Paperclip size={13} /> Files ({attachments.length})
                  {activeTab === 'attachments' && <motion.div layoutId="drawerTab" className={styles.activeIndicator} />}
                </button>
              </div>

              {/* Subtasks Tab */}
              {activeTab === 'subtasks' && (
                <div style={{ marginTop: '0.75rem' }}>
                  <SubtaskPanel taskId={task.id} taskStatus={task.status} />
                </div>
              )}

              {/* Comments Tab */}
              {activeTab === 'comments' && (
                <div className={styles.commentsContainer}>
                  <div className={styles.commentList}>
                    {commentsLoading ? (
                      <p className={styles.emptyNotice}>Loading comments...</p>
                    ) : comments.length === 0 ? (
                      <p className={styles.emptyNotice}>No comments yet. Start the conversation!</p>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} className={styles.commentItem}>
                          <div className={styles.commentMeta}>
                            <span className={styles.commentAuthor}>
                              <User size={12} /> {c.authorName || 'User'}
                            </span>
                            <span className={styles.commentDate}>
                              {new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className={styles.commentBody}>{renderCommentContent(c.content)}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <form className={styles.commentForm} onSubmit={handlePostComment}>
                    <div className={styles.mentionWrapper}>
                      {showMentionMenu && (
                        <div className={styles.mentionMenu}>
                          {teammates
                            .filter(t => t.name.toLowerCase().includes(mentionFilter) || t.email.toLowerCase().includes(mentionFilter))
                            .map(tm => (
                              <div
                                key={tm.id}
                                className={styles.mentionItem}
                                onClick={() => handleSelectMention(tm)}
                              >
                                <img
                                  src={tm.avatarUrl}
                                  alt={tm.name}
                                  className={styles.mentionItemAvatar}
                                  onError={e => {
                                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.name)}&background=6366f1&color=fff`;
                                  }}
                                />
                                <span className={styles.mentionItemName}>{tm.name}</span>
                                <span className={styles.mentionItemRole}>{tm.role}</span>
                              </div>
                            ))}
                        </div>
                      )}
                      <input
                        type="text"
                        className={styles.commentInput}
                        placeholder="Write a comment... (use @ to mention teammates)"
                        value={commentText}
                        onChange={handleCommentChange}
                      />
                    </div>
                    <button
                      type="submit"
                      className={styles.commentSubmitBtn}
                      disabled={!commentText.trim() || addCommentMutation.isPending}
                    >
                      <Send size={13} /> Send
                    </button>
                  </form>
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className={styles.activityStream}>
                  {activityLoading ? (
                    <p className={styles.emptyNotice}>Loading activity...</p>
                  ) : activityLogs.length === 0 ? (
                    <p className={styles.emptyNotice}>No recorded activity yet.</p>
                  ) : (
                    activityLogs.map(a => (
                      <div key={a.id} className={styles.activityItem}>
                        <div className={styles.activityDot} />
                        <div className={styles.activityContent}>
                          <span className={styles.activityActor}>{a.actorName || 'User'} </span>
                          <span>
                            {a.action === 'CREATED' && 'created this task'}
                            {a.action === 'STATUS_CHANGED' && `changed status from ${a.oldValue} to ${a.newValue}`}
                            {a.action === 'UPDATED' && 'updated task details'}
                            {a.action === 'COMMENT_ADDED' && `commented: "${a.newValue}"`}
                            {!['CREATED', 'STATUS_CHANGED', 'UPDATED', 'COMMENT_ADDED'].includes(a.action) && `${a.action.toLowerCase().replace('_', ' ')}: ${a.newValue || ''}`}
                          </span>
                          <div className={styles.activityTime}>
                            {new Date(a.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <div className={styles.attachmentsContainer}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    multiple
                  />
                  <div
                    className={styles.dropzone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud size={24} />
                    <span>Click or drop files to attach to this task</span>
                  </div>

                  <div className={styles.fileList}>
                    {attachments.map(f => (
                      <div key={f.id} className={styles.fileItem}>
                        <div className={styles.fileInfo}>
                          <Paperclip size={14} color="#6366f1" />
                          <span>{f.name}</span>
                          <span className={styles.fileSize}>({f.size})</span>
                        </div>
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => setAttachments(attachments.filter(item => item.id !== f.id))}
                          title="Remove attachment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Save */}
          <div className={styles.footer}>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Check size={16} /> {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
export default TaskDetailDrawer;
