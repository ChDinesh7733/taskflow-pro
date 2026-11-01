import React, { useState, useEffect } from 'react';
import styles from './PublicProjectView.module.css';
import { collaborationApi } from '../../api/collaborationApi';

export default function PublicProjectView({ shareToken }) {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPublicProject();
  }, [shareToken]);

  const loadPublicProject = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await collaborationApi.getPublicProject(shareToken);
      setProject(data);
    } catch (err) {
      console.error(err);
      setError('This project is private or the share link has expired/been revoked.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner} />
        <p>Loading shared project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.errorWrapper}>
        <span className={styles.errorIcon}>🔒</span>
        <h2>Project Unavailable</h2>
        <p>{error || 'Project not found.'}</p>
        <a href="/" className={styles.homeLink}>Go to TaskFlow Pro Home</a>
      </div>
    );
  }

  const columns = [
    { key: 'TODO', label: 'To Do', color: '#64748b' },
    { key: 'IN_PROGRESS', label: 'In Progress', color: '#3b82f6' },
    { key: 'IN_REVIEW', label: 'In Review', color: '#eab308' },
    { key: 'DONE', label: 'Done', color: '#10b981' }
  ];

  return (
    <div className={styles.container}>
      {/* SaaS Branding Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.logoSquare}>⚡</div>
          <span className={styles.brandName}>TaskFlow <span className={styles.brandPro}>Pro</span></span>
          <span className={styles.viewBadge}>Read-Only Public View</span>
        </div>
        <div className={styles.topActions}>
          <a href="/" className={styles.ctaBtn}>
            Try TaskFlow Free →
          </a>
        </div>
      </header>

      {/* Project Banner */}
      <div className={styles.projectHeader}>
        <div className={styles.projectTitleRow}>
          <div
            className={styles.projectColorPill}
            style={{ backgroundColor: project.color || '#4f46e5' }}
          />
          <h1 className={styles.projectName}>{project.name}</h1>
        </div>
        <div className={styles.projectMeta}>
          <span>👤 Shared by <strong>{project.ownerName}</strong></span>
          <span>•</span>
          <span>📋 {project.tasks.length} Deliverables</span>
          <span>•</span>
          <span className={styles.liveSyncTag}>● Live View</span>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <main className={styles.board}>
        {columns.map(col => {
          const colTasks = project.tasks.filter(t => (t.status || 'TODO') === col.key);
          return (
            <div key={col.key} className={styles.column}>
              <div className={styles.columnHeader}>
                <div className={styles.colTitleWrapper}>
                  <span className={styles.colDot} style={{ backgroundColor: col.color }} />
                  <span className={styles.colTitle}>{col.label}</span>
                </div>
                <span className={styles.colCount}>{colTasks.length}</span>
              </div>

              <div className={styles.cardList}>
                {colTasks.length === 0 ? (
                  <div className={styles.emptyCol}>No tasks</div>
                ) : (
                  colTasks.map(task => (
                    <div key={task.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <span className={`${styles.priorityBadge} ${styles['priority_' + (task.priority || 'MEDIUM').toLowerCase()]}`}>
                          {task.priority || 'MEDIUM'}
                        </span>
                        {task.dueDate && (
                          <span className={styles.cardDue}>
                            📅 {task.dueDate}
                          </span>
                        )}
                      </div>
                      <h4 className={styles.cardTitle}>{task.title}</h4>
                      {task.description && (
                        <p className={styles.cardDesc}>{task.description}</p>
                      )}
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div className={styles.subtasksBox}>
                          <span className={styles.subtaskHeader}>Subtasks ({task.subtasks.length})</span>
                          <ul className={styles.subtasksList}>
                            {task.subtasks.map((st, i) => (
                              <li key={i}>✓ {st}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </main>

      {/* Conversion Banner Footer */}
      <footer className={styles.footerBanner}>
        <div className={styles.footerContent}>
          <h3>Supercharge your productivity with TaskFlow Pro</h3>
          <p>Join thousands of high-performing teams managing tasks, AI planning, and Pomodoro focus workflows.</p>
        </div>
        <a href="/" className={styles.footerCta}>Get Started for Free</a>
      </footer>
    </div>
  );
}
