import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Users, DollarSign, CheckCircle2, Clock, Shield,
  Search, UserCheck, UserX, AlertTriangle, Loader2, Sparkles,
  ArrowUpDown, RefreshCw, BarChart3, Award
} from 'lucide-react';
import { billingApi } from '../../api/billingApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './AdminDashboardModal.module.css';

export default function AdminDashboardModal({ isOpen, onClose }) {
  const { user: currentAdmin } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, u] = await Promise.all([
        billingApi.getAdminMetrics(),
        billingApi.getAdminUsers()
      ]);
      setMetrics(m);
      setUsers(u);
    } catch (err) {
      const msg = err.response?.data?.message || 'Access denied or failed to load admin telemetry';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (user.id === currentAdmin?.id) {
      toast.error('You cannot disable your own admin account');
      return;
    }

    const action = user.enabled ? 'suspend' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} user "${user.email}"?`)) {
      return;
    }

    setUpdatingUserId(user.id);
    try {
      const updated = await billingApi.toggleUserStatus(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
      toast.success(`User ${updated.email} is now ${updated.enabled ? 'Active' : 'Suspended'}`);
    } catch (err) {
      toast.error('Failed to update user status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      const updated = await billingApi.updateUserRoleAndPlan(userId, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) {
      toast.error('Failed to change role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handlePlanChange = async (userId, newPlan) => {
    setUpdatingUserId(userId);
    try {
      const updated = await billingApi.updateUserRoleAndPlan(userId, { planTier: newPlan });
      setUsers(prev => prev.map(u => u.id === userId ? updated : u));
      toast.success(`Plan updated to ${newPlan}`);
      // Refresh metrics as MRR changes
      const m = await billingApi.getAdminMetrics();
      setMetrics(m);
    } catch (err) {
      toast.error('Failed to change plan');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.displayName && u.displayName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.badgeRow}>
              <span className={styles.adminBadge}>
                <Shield size={13} />
                ADMINISTRATION & REVENUE
              </span>
              <span className={styles.livePill}>LIVE TELEMETRY</span>
            </div>
            <h2 className={styles.title}>Workspace Admin Dashboard</h2>
            <p className={styles.subtitle}>
              Global overview of active users, deliverables, MRR subscriptions, and role access controls.
            </p>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.refreshBtn}
              onClick={loadData}
              title="Refresh Telemetry"
              disabled={loading}
            >
              <RefreshCw size={15} className={loading ? styles.spinner : ''} />
            </button>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {loading && !metrics ? (
            <div className={styles.loaderWrap}>
              <Loader2 className={styles.spinner} size={32} />
              <p>Aggregating workspace analytics...</p>
            </div>
          ) : (
            <>
              {/* Metrics KPI Cards */}
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                    <Users size={20} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Total Users</span>
                    <strong className={styles.metricValue}>{metrics?.totalUsers ?? 0}</strong>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                    <DollarSign size={20} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Monthly Revenue (MRR)</span>
                    <strong className={styles.metricValue}>${metrics?.monthlyRecurringRevenue ?? 0} <span className={styles.mrrPeriod}>/ mo</span></strong>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Tasks Completed</span>
                    <strong className={styles.metricValue}>{metrics?.completedTasks ?? 0}</strong>
                  </div>
                </div>

                <div className={styles.metricCard}>
                  <div className={styles.metricIconWrap} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                    <Clock size={20} />
                  </div>
                  <div className={styles.metricInfo}>
                    <span className={styles.metricLabel}>Focus Time Logged</span>
                    <strong className={styles.metricValue}>
                      {Math.floor((metrics?.totalPomodoroMinutes ?? 0) / 60)}h {(metrics?.totalPomodoroMinutes ?? 0) % 60}m
                    </strong>
                  </div>
                </div>
              </div>

              {/* User Management Section */}
              <div className={styles.usersSection}>
                <div className={styles.tableToolbar}>
                  <div className={styles.searchBox}>
                    <Search size={15} />
                    <input
                      type="text"
                      placeholder="Filter users by email or name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <span className={styles.userCountBadge}>
                    {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Plan Tier</th>
                        <th>Tasks</th>
                        <th>Gamification</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u) => {
                        const isSelf = u.id === currentAdmin?.id;
                        const isBusy = updatingUserId === u.id;

                        return (
                          <tr key={u.id} className={!u.enabled ? styles.disabledRow : ''}>
                            {/* User details */}
                            <td>
                              <div className={styles.userCell}>
                                <div className={styles.avatar}>
                                  {u.displayName ? u.displayName.charAt(0).toUpperCase() : u.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className={styles.userName}>
                                    {u.displayName || 'No Name'} {isSelf && <span className={styles.youBadge}>(You)</span>}
                                  </div>
                                  <div className={styles.userEmail}>{u.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* Role Dropdown */}
                            <td>
                              <select
                                className={styles.selectInput}
                                value={u.role}
                                disabled={isSelf || isBusy}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              >
                                <option value="USER">USER</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </td>

                            {/* Plan Dropdown */}
                            <td>
                              <select
                                className={`${styles.selectInput} ${styles['planSelect_' + u.planTier]}`}
                                value={u.planTier}
                                disabled={isBusy}
                                onChange={(e) => handlePlanChange(u.id, e.target.value)}
                              >
                                <option value="FREE">FREE</option>
                                <option value="PRO">PRO ($12)</option>
                                <option value="ENTERPRISE">ENTERPRISE ($29)</option>
                              </select>
                            </td>

                            {/* Task Count */}
                            <td>
                              <span className={styles.taskCountPill}>
                                {u.taskCount} tasks
                              </span>
                            </td>

                            {/* Gamification Stats */}
                            <td>
                              <div className={styles.gamificationCell}>
                                <span className={styles.levelPill}>Lvl {u.level}</span>
                                <span className={styles.xpText}>{u.xp} XP</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td>
                              {u.enabled ? (
                                <span className={styles.statusActive}>
                                  <span className={styles.activeDot} /> Active
                                </span>
                              ) : (
                                <span className={styles.statusSuspended}>
                                  Suspended
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ textAlign: 'right' }}>
                              {!isSelf && (
                                <button
                                  className={u.enabled ? styles.suspendBtn : styles.activateBtn}
                                  onClick={() => handleToggleStatus(u)}
                                  disabled={isBusy}
                                  title={u.enabled ? 'Suspend user' : 'Reactivate user'}
                                >
                                  {u.enabled ? <UserX size={14} /> : <UserCheck size={14} />}
                                  <span>{u.enabled ? 'Suspend' : 'Activate'}</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
