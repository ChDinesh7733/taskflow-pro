import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, Mail, CheckCircle2, AlertTriangle, ArrowRight,
  TrendingUp, Clock, Copy, RefreshCw, Loader2, Bot, Calendar
} from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import toast from 'react-hot-toast';
import styles from './WeeklySummaryModal.module.css';

export default function WeeklySummaryModal({ isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await aiApi.getWeeklySummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load weekly summary:', err);
      setError('Unable to generate AI summary at this time. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendEmail = async () => {
    if (sendingEmail) return;
    setSendingEmail(true);
    try {
      const res = await aiApi.sendWeeklySummaryEmail();
      toast.success(res.message || 'Weekly AI summary sent to your email!');
    } catch (err) {
      toast.error('Failed to dispatch email digest. Please verify email settings.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (!summary) return;
    const text = [
      `# 📊 Weekly TaskFlow AI Performance Digest (${summary.weekRange})`,
      '',
      `**Productivity Score:** ${summary.productivityScore}/100`,
      `**Tasks Completed:** ${summary.completedCount} | **Slipped:** ${summary.slippedCount} | **Focus Logged:** ${summary.focusMinutes} mins`,
      '',
      '## 🟢 What I Finished',
      ...summary.whatIFinished.map(i => `- ${i}`),
      '',
      '## 🟡 What Slipped',
      ...summary.whatSlipped.map(i => `- ${i}`),
      '',
      '## 🟣 What to Focus On Next',
      ...summary.whatToFocusOnNext.map(i => `- ${i}`),
      '',
      '## 💬 Coach Perspective',
      summary.executiveSummary,
    ].join('\n');

    navigator.clipboard.writeText(text);
    toast.success('📋 Summary copied to clipboard as Markdown');
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
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.sparkleIconWrap}>
                <Sparkles size={22} />
              </div>
              <div>
                <div className={styles.titleRow}>
                  <h2 className={styles.title}>Weekly AI Performance Digest</h2>
                  {summary?.weekRange && (
                    <span className={styles.rangeBadge}>{summary.weekRange}</span>
                  )}
                </div>
                <p className={styles.subtitle}>
                  Deep analysis of accomplishments, slipped deadlines, and recommended focus for next week.
                </p>
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>

          {/* Actions Ribbon */}
          <div className={styles.actionsBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.75rem' }}>
              <Bot size={14} color="#4f46e5" />
              <span>AI Coach active • Scheduled every Monday 9:00 AM</span>
            </div>
            <div className={styles.actionsRight}>
              <button
                className={styles.actionBtn}
                onClick={handleCopyMarkdown}
                disabled={loading || !summary}
                title="Copy markdown text"
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>
              <button
                className={styles.actionBtn}
                onClick={fetchSummary}
                disabled={loading}
                title="Regenerate summary"
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                <span>Refresh</span>
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={handleSendEmail}
                disabled={loading || sendingEmail || !summary}
                title="Send summary to your registered email"
              >
                {sendingEmail ? <Loader2 size={13} className="spin" /> : <Mail size={13} />}
                <span>{sendingEmail ? 'Sending…' : 'Email to Me'}</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className={styles.body}>
            {loading ? (
              <div className={styles.loadingBox}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Sparkles size={32} color="#4f46e5" />
                </motion.div>
                <p>Synthesizing your weekly productivity telemetry with AI…</p>
              </div>
            ) : error ? (
              <div className={styles.loadingBox}>
                <AlertTriangle size={32} color="#f59e0b" />
                <p>{error}</p>
                <button className={styles.actionBtn} onClick={fetchSummary}>Try Again</button>
              </div>
            ) : summary ? (
              <>
                {/* 4 Metric Cards */}
                <div className={styles.metricsGrid}>
                  <div className={`${styles.metricCard} ${styles.metricCardGreen}`}>
                    <span className={styles.metricLabel}>Finished</span>
                    <span className={styles.metricVal}>{summary.completedCount}</span>
                    <span className={styles.metricSub}>tasks shipped</span>
                  </div>
                  <div className={`${styles.metricCard} ${styles.metricCardAmber}`}>
                    <span className={styles.metricLabel}>Slipped</span>
                    <span className={styles.metricVal}>{summary.slippedCount}</span>
                    <span className={styles.metricSub}>delayed/overdue</span>
                  </div>
                  <div className={`${styles.metricCard} ${styles.metricCardPink}`}>
                    <span className={styles.metricLabel}>Focus Time</span>
                    <span className={styles.metricVal}>
                      {summary.focusMinutes >= 60
                        ? `${(summary.focusMinutes / 60).toFixed(1)}h`
                        : `${summary.focusMinutes}m`}
                    </span>
                    <span className={styles.metricSub}>deep work logged</span>
                  </div>
                  <div className={`${styles.metricCard} ${styles.metricCardPurple}`}>
                    <span className={styles.metricLabel}>Score</span>
                    <span className={styles.metricVal}>{summary.productivityScore}%</span>
                    <span className={styles.metricSub}>velocity rating</span>
                  </div>
                </div>

                {/* 3 Insight Sections */}
                <div className={styles.sectionsGrid}>
                  {/* What I Finished */}
                  <div className={`${styles.insightCard} ${styles.insightCardFinished}`}>
                    <div className={styles.insightHeader}>
                      <CheckCircle2 size={16} color="#16a34a" />
                      <h3 className={`${styles.insightTitle} ${styles.finishedTitle}`}>What I Finished</h3>
                    </div>
                    <ul className={styles.insightList}>
                      {summary.whatIFinished?.map((item, idx) => (
                        <li key={idx} className={`${styles.insightItem} ${styles.finishedItem}`}>
                          <span className={styles.itemIcon}>✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What Slipped */}
                  <div className={`${styles.insightCard} ${styles.insightCardSlipped}`}>
                    <div className={styles.insightHeader}>
                      <AlertTriangle size={16} color="#d97706" />
                      <h3 className={`${styles.insightTitle} ${styles.slippedTitle}`}>What Slipped</h3>
                    </div>
                    <ul className={styles.insightList}>
                      {summary.whatSlipped?.map((item, idx) => (
                        <li key={idx} className={`${styles.insightItem} ${styles.slippedItem}`}>
                          <span className={styles.itemIcon}>⚠</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What to Focus On Next */}
                  <div className={`${styles.insightCard} ${styles.insightCardNext}`}>
                    <div className={styles.insightHeader}>
                      <ArrowRight size={16} color="#7c3aed" />
                      <h3 className={`${styles.insightTitle} ${styles.nextTitle}`}>What to Focus On Next</h3>
                    </div>
                    <ul className={styles.insightList}>
                      {summary.whatToFocusOnNext?.map((item, idx) => (
                        <li key={idx} className={`${styles.insightItem} ${styles.nextItem}`}>
                          <span className={styles.itemIcon}>→</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Executive Coach Perspective */}
                {summary.executiveSummary && (
                  <div className={styles.coachCard}>
                    <div className={styles.coachAvatar}>
                      <TrendingUp size={18} />
                    </div>
                    <div className={styles.coachContent}>
                      <h4 className={styles.coachTitle}>AI Coach Perspective</h4>
                      <p className={styles.coachText}>{summary.executiveSummary}</p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
