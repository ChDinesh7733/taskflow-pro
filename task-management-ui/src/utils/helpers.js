/**
 * Utility helpers for the Task Management UI.
 */

/**
 * Returns badge styles based on task status.
 */
export const getStatusConfig = (status) => {
  const configs = {
    PENDING: {
      label: 'Pending',
      bg: 'var(--pending-bg)',
      color: 'var(--pending)',
      dot: '#d97706',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      bg: 'var(--in-progress-bg)',
      color: 'var(--in-progress)',
      dot: '#2563eb',
    },
    COMPLETED: {
      label: 'Completed',
      bg: 'var(--completed-bg)',
      color: 'var(--completed)',
      dot: '#059669',
    },
  };
  return configs[status] || configs.PENDING;
};

/**
 * Formats a LocalDateTime string from the API into a readable format.
 * @param {string} dateStr - ISO-8601 LocalDateTime
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Calculates relative time like "2 minutes ago".
 * @param {string} dateStr
 */
export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
};

/**
 * Returns time remaining until scheduledStartTime.
 * @param {string} dateStr
 */
export const timeUntilStart = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const target = new Date(dateStr);
  const diffMs = target - now;
  if (diffMs <= 0) return 'Overdue';
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  if (diffMin < 1) return `${diffSec}s remaining`;
  if (diffHr < 1) return `${diffMin}m remaining`;
  return `${diffHr}h ${diffMin % 60}m remaining`;
};
