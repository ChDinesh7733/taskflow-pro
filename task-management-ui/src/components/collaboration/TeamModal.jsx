import React, { useState, useEffect } from 'react';
import styles from './TeamModal.module.css';
import { collaborationApi } from '../../api/collaborationApi';

export default function TeamModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'audit'
  const [members, setMembers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [membersData, auditData] = await Promise.all([
        collaborationApi.getMembers().catch(() => []),
        collaborationApi.getAuditLog().catch(() => [])
      ]);
      setMembers(membersData);
      setAuditLogs(auditData);
    } catch (err) {
      console.error(err);
      setError('Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteName.trim()) return;

    setInviting(true);
    setError(null);
    try {
      const newMember = await collaborationApi.inviteMember({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole
      });
      setMembers([newMember, ...members]);
      setInviteEmail('');
      setInviteName('');
      setInviteSuccess(true);
      setTimeout(() => setInviteSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to invite team member. Email may already exist.');
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId, currentRole) => {
    const nextRole = currentRole === 'ADMIN' ? 'MEMBER' : 'ADMIN';
    try {
      const updated = await collaborationApi.updateRole(memberId, nextRole);
      setMembers(members.map(m => m.id === memberId ? updated : m));
    } catch (err) {
      console.error(err);
      setError('Failed to update role.');
    }
  };

  const handleRemove = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
    try {
      await collaborationApi.removeMember(memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err) {
      console.error(err);
      setError('Failed to remove member.');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/invite?workspace=taskflow`;
    navigator.clipboard.writeText(link);
    alert('Workspace invite link copied to clipboard!');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.badgeIcon}>👥</span>
            <div>
              <h2>Team & Collaboration</h2>
              <p>Manage workspace members, assign roles, and review audit trail</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'members' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Teammates ({members.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Activity Log ({auditLogs.length})
          </button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {inviteSuccess && <div className={styles.successBanner}>Teammate invited successfully!</div>}

        {/* Tab 1: Teammates */}
        {activeTab === 'members' && (
          <div className={styles.tabContent}>
            {/* Invite Form */}
            <form className={styles.inviteCard} onSubmit={handleInvite}>
              <div className={styles.inviteHeader}>
                <h3>Invite Teammate</h3>
                <button type="button" className={styles.copyLinkBtn} onClick={copyInviteLink}>
                  🔗 Copy Workspace Link
                </button>
              </div>
              <div className={styles.inviteInputs}>
                <input
                  type="text"
                  placeholder="Full name (e.g. Maya Patel)"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className={styles.input}
                  required
                />
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className={styles.input}
                  required
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className={styles.select}
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={inviting}
                  className={styles.inviteSubmitBtn}
                >
                  {inviting ? 'Inviting...' : 'Invite'}
                </button>
              </div>
            </form>

            {/* Members List */}
            <div className={styles.membersList}>
              <h4 className={styles.sectionTitle}>Active Workspace Members</h4>
              {loading ? (
                <div className={styles.loading}>Loading team members...</div>
              ) : members.length === 0 ? (
                <div className={styles.empty}>No team members yet. Invite your colleagues above!</div>
              ) : (
                members.map(member => (
                  <div key={member.id} className={styles.memberRow}>
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className={styles.avatar}
                      onError={e => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=6366f1&color=fff`;
                      }}
                    />
                    <div className={styles.memberInfo}>
                      <div className={styles.memberName}>{member.name}</div>
                      <div className={styles.memberEmail}>{member.email}</div>
                    </div>
                    <div className={styles.memberActions}>
                      <button
                        className={`${styles.roleBadge} ${member.role === 'ADMIN' ? styles.roleAdmin : styles.roleMember}`}
                        onClick={() => handleRoleChange(member.id, member.role)}
                        title="Click to toggle Admin / Member role"
                      >
                        {member.role === 'ADMIN' ? '🛡️ Admin' : '👤 Member'}
                      </button>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemove(member.id, member.name)}
                        title="Remove member"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Audit Activity Log */}
        {activeTab === 'audit' && (
          <div className={styles.tabContent}>
            <div className={styles.auditList}>
              {loading ? (
                <div className={styles.loading}>Loading audit log...</div>
              ) : auditLogs.length === 0 ? (
                <div className={styles.empty}>No activity recorded yet. Actions across workspace tasks appear here.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className={styles.auditItem}>
                    <div className={styles.auditIcon}>
                      {log.action.includes('STATUS') ? '⚡' :
                       log.action.includes('COMMENT') ? '💬' :
                       log.action.includes('MENTION') ? '📣' :
                       log.action.includes('CREATE') ? '✨' : '📝'}
                    </div>
                    <div className={styles.auditBody}>
                      <div className={styles.auditHeader}>
                        <span className={styles.auditActor}>{log.actorName}</span>
                        <span className={styles.auditActionTag}>{log.action.replace('_', ' ')}</span>
                        <span className={styles.auditTime}>
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={styles.auditTask}>{log.taskTitle}</div>
                      {log.newValue && (
                        <div className={styles.auditValue}>
                          {log.oldValue ? `${log.oldValue} → ` : ''}{log.newValue}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
