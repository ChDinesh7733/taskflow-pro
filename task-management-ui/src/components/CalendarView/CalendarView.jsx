import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus } from 'lucide-react';
import styles from './CalendarView.module.css';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_COLORS = {
  TODO:        { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  IN_PROGRESS: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
  IN_REVIEW:   { bg: '#ede9fe', text: '#5b21b6', border: '#8b5cf6' },
  DONE:        { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  CANCELLED:   { bg: '#f3f4f6', text: '#4b5563', border: '#9ca3af' },
};

export function CalendarView({ tasks = [], onSelectTask, onCreateTaskWithDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month navigation
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute calendar days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const dateObj = new Date(year, month - 1, d);
    calendarDays.push({
      date: dateObj,
      dayNum: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }

  // Current month days
  const todayStr = new Date().toISOString().substring(0, 10);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({
      date: dateObj,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      dateString,
    });
  }

  // Next month leading days to complete week (total multiple of 7)
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const dateObj = new Date(year, month + 1, d);
    calendarDays.push({
      date: dateObj,
      dayNum: d,
      isCurrentMonth: false,
      dateString: dateObj.toISOString().substring(0, 10),
    });
  }

  // Group tasks by dueDate
  const tasksByDate = {};
  const unscheduledTasks = [];

  tasks.forEach(task => {
    if (task.dueDate) {
      const d = task.dueDate.substring(0, 10);
      if (!tasksByDate[d]) tasksByDate[d] = [];
      tasksByDate[d].push(task);
    } else {
      unscheduledTasks.push(task);
    }
  });

  return (
    <div className={styles.calendarContainer}>
      {/* Header */}
      <div className={styles.calendarHeader}>
        <h3 className={styles.monthTitle}>{monthName}</h3>
        <div className={styles.navControls}>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
          <button className={styles.navBtn} onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <button className={styles.navBtn} onClick={nextMonth} aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className={styles.calendarGrid}>
        {/* Weekday headers */}
        {WEEKDAYS.map(w => (
          <div key={w} className={styles.weekdayHeader}>{w}</div>
        ))}

        {/* Days */}
        {calendarDays.map((cell, idx) => {
          const dayTasks = tasksByDate[cell.dateString] || [];

          return (
            <div
              key={idx}
              className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.otherMonth : ''}`}
              onDoubleClick={() => onCreateTaskWithDate && onCreateTaskWithDate(cell.dateString)}
            >
              <div className={styles.dayHeader}>
                <span className={`${styles.dayNumber} ${cell.isToday ? styles.todayNumber : ''}`}>
                  {cell.dayNum}
                </span>
                {cell.isCurrentMonth && onCreateTaskWithDate && (
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                    onClick={() => onCreateTaskWithDate(cell.dateString)}
                    title={`Add task for ${cell.dateString}`}
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              <div className={styles.tasksList}>
                {dayTasks.map(t => {
                  const style = STATUS_COLORS[t.status] || STATUS_COLORS.TODO;
                  return (
                    <div
                      key={t.id}
                      className={styles.taskPill}
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderLeftColor: style.border,
                      }}
                      title={`${t.title} (${t.status})`}
                      onClick={() => onSelectTask && onSelectTask(t)}
                    >
                      {t.title}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled Tasks */}
      {unscheduledTasks.length > 0 && (
        <div className={styles.unscheduledSection}>
          <div className={styles.unscheduledTitle}>
            <Clock size={14} /> Unscheduled Tasks ({unscheduledTasks.length})
          </div>
          <div className={styles.unscheduledRow}>
            {unscheduledTasks.map(t => {
              const style = STATUS_COLORS[t.status] || STATUS_COLORS.TODO;
              return (
                <div
                  key={t.id}
                  className={styles.taskPill}
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    borderLeftColor: style.border,
                    maxWidth: 220,
                  }}
                  onClick={() => onSelectTask && onSelectTask(t)}
                  title={t.title}
                >
                  {t.title}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
