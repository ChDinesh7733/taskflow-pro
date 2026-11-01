import React, { useState, useEffect } from 'react';
import styles from './ShareProjectModal.module.css';
import { collaborationApi } from '../../api/collaborationApi';

export default function ShareProjectModal({ isOpen, onClose, category, onCategoryUpdated }) {
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (category) {
      setIsPublic(Boolean(category.isPublic));
      setShareToken(category.shareToken || '');
      setCopied(false);
      setError(null);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const shareUrl = shareToken
    ? `${window.location.origin}/shared/projects/${shareToken}`
    : '';

  const handleToggleShare = async () => {
    setLoading(true);
    setError(null);
    try {
      if (isPublic) {
        const res = await collaborationApi.revokeShareProject(category.id);
        setIsPublic(false);
        if (onCategoryUpdated) {
          onCategoryUpdated({ ...category, isPublic: false, shareToken: res.shareToken });
        }
      } else {
        const res = await collaborationApi.shareProject(category.id);
        setIsPublic(true);
        setShareToken(res.shareToken);
        if (onCategoryUpdated) {
          onCategoryUpdated({ ...category, isPublic: true, shareToken: res.shareToken });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to update public share settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePreview = () => {
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.icon}>🔗</span>
            <div>
              <h2>Share Project</h2>
              <div className={styles.projectTag}>
                <span className={styles.colorDot} style={{ backgroundColor: category.color || '#4f46e5' }} />
                <span>{category.name}</span>
              </div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.content}>
          <div className={styles.toggleRow}>
            <div>
              <div className={styles.toggleLabel}>Public Read-Only Link</div>
              <div className={styles.toggleSub}>
                Anyone with this link can view this project and its tasks in real time without creating an account.
              </div>
            </div>
            <button
              className={`${styles.toggleSwitch} ${isPublic ? styles.toggleOn : ''}`}
              onClick={handleToggleShare}
              disabled={loading}
              title={isPublic ? 'Revoke link' : 'Enable link'}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {isPublic && (
            <div className={styles.linkCard}>
              <label className={styles.linkLabel}>Shareable URL</label>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className={styles.urlInput}
                />
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copiedBtn : ''}`}
                  onClick={handleCopy}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
                <button className={styles.previewBtn} onClick={handlePreview} title="Open shared preview">
                  ↗
                </button>
              </div>
              <div className={styles.securityHint}>
                🔒 Read-only view. Viewers cannot edit, delete, or create tasks in this project.
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
