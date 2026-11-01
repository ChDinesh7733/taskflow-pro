import React, { useState, useEffect } from 'react';
import productivityApi from '../../api/productivityApi';
import { useTaskList } from '../../hooks/useTasks';
import { triggerConfetti } from '../../utils/confetti';
import { Clock, Calendar, Plus, X, Trash2, ArrowRight, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './TimeBlockingModal.module.css';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

export default function TimeBlockingModal({ isOpen, onClose }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [blockedTasks, setBlockedTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Available tasks to block
  const { data: taskData, refetch: refetchTaskList } = useTaskList({ size: 100 });
  const allTasks = taskData?.content || [];
  const activeTasks = allTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED');

  useEffect(() => {
    if (isOpen) {
      loadTimeBlocks();
    }
  }, [isOpen, selectedDate]);

  const loadTimeBlocks = async () => {
    try {
      setLoading(true);
      const data = await productivityApi.getTimeBlocks(selectedDate);
      setBlockedTasks(data || []);
    } catch (err) {
      console.error('Failed to load time blocks:', err);
      toast.error('Failed to load time blocks');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockTask = async (task, slot) => {
    const endSlot = calculateEndTime(slot);
    try {
      await productivityApi.setTimeBlock(task.id, {
        date: selectedDate,
        startTime: slot,
        endTime: endSlot
      });

      toast.success(`Blocked "${task.title}" at ${slot} - ${endSlot} ⏰`);
      loadTimeBlocks();
      refetchTaskList();
    } catch (err) {
      toast.error('Failed to set time block: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleClearBlock = async (taskId) => {
    try {
      await productivityApi.clearTimeBlock(taskId);
      toast.success('Time block cleared');
      loadTimeBlocks();
      refetchTaskList();
    } catch (err) {
      toast.error('Failed to clear time block');
    }
  };

  const calculateEndTime = (start) => {
    const [h, m] = start.split(':').map(Number);
    const endH = String(h + 1).padStart(2, '0');
    return `${endH}:${String(m).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>⏱️</div>
            <div>
              <h2 className={styles.headerTitle}>Daily Time Blocking Timeline</h2>
              <p className={styles.headerSubtitle}>
                Schedule tasks into focused calendar slots to protect deep work time and avoid multitasking
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* Timeline View */}
          <div className={styles.timelinePane}>
            <div className={styles.datePickerBar}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Schedule Date:</span>
              <input
                type="date"
                className={styles.dateInput}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>

            <div className={styles.timelineSlots}>
              {TIME_SLOTS.map(slot => {
                const blocked = blockedTasks.find(t => t.timeBlockStart === slot);
                return (
                  <div key={slot} className={styles.slotRow}>
                    <div className={styles.slotTime}>{slot}</div>
                    <div className={`${styles.slotContent} ${blocked ? styles.slotContentActive : ''}`}>
                      {blocked ? (
                        <>
                          <div>
                            <span className={styles.blockedTaskTitle}>{blocked.title}</span>
                            <span className={styles.blockedTaskTime}>({blocked.timeBlockStart} – {blocked.timeBlockEnd})</span>
                          </div>
                          <button
                            className={styles.clearBtn}
                            onClick={() => handleClearBlock(blocked.id)}
                            title="Remove from slot"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span className={styles.emptySlotHint}>Open focus slot</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unscheduled Active Tasks */}
          <div className={styles.unscheduledPane}>
            <div>
              <h3 className={styles.unscheduledTitle}>Active Deliverables</h3>
              <p className={styles.unscheduledSubtitle}>Assign to open timeline slot</p>
            </div>

            <div className={styles.unscheduledList}>
              {activeTasks.slice(0, 15).map(task => (
                <div key={task.id} className={styles.taskItem}>
                  <p className={styles.taskItemTitle}>{task.title}</p>
                  <div className={styles.taskItemActions}>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      {task.priority} • {task.dueDate ? `Due ${task.dueDate}` : 'No date'}
                    </span>
                    <select
                      style={{ fontSize: '0.725rem', padding: '0.2rem', borderRadius: '0.3rem', border: '1px solid #cbd5e1' }}
                      defaultValue=""
                      onChange={e => {
                        if (e.target.value) {
                          handleBlockTask(task, e.target.value);
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="" disabled>+ Block Slot</option>
                      {TIME_SLOTS.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
