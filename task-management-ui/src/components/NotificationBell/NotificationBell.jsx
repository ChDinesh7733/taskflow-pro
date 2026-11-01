import { useState, useRef, useEffect } from 'react';
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '../../hooks/useNotifications';
import styles from './NotificationBell.module.css';

export function NotificationBell() {
  const [open, setOpen]       = useState(false);
  const dropRef               = useRef(null);
  const { data: count = 0 }   = useUnreadCount();
  const { data: notifs = [] } = useNotifications();
  const markRead    = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = (id) => {
    markRead.mutate(id);
  };

  return (
    <div className={styles.wrapper} ref={dropRef}>
      <button
        className={styles.bell}
        onClick={() => setOpen(o => !o)}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span className={styles.badge}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.dropHeader}>
            <span>Notifications</span>
            {count > 0 && (
              <button
                className={styles.markAllBtn}
                onClick={() => markAllRead.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {notifs.length === 0 ? (
              <div className={styles.empty}>🎉 You're all caught up!</div>
            ) : (
              notifs.slice(0, 20).map(n => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                  onClick={() => !n.read && handleMarkRead(n.id)}
                >
                  <span className={styles.typeIcon}>{typeIcon(n.type)}</span>
                  <div className={styles.itemBody}>
                    <p className={styles.message}>{n.message}</p>
                    <span className={styles.time}>{formatTime(n.createdAt)}</span>
                  </div>
                  {!n.read && <span className={styles.dot} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function typeIcon(type) {
  if (type === 'OVERDUE')  return '🔴';
  if (type === 'DUE_SOON') return '🟡';
  return '🔵';
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return d.toLocaleDateString();
}
