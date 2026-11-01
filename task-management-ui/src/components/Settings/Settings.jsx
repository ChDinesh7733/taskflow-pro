import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  X, Settings as SettingsIcon, User, RefreshCw, Shield,
  Info, Check, Trash2, Plus, LogOut, Zap, Globe, Mail, Lock, Moon, Sun, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authApi from '../../api/authApi';
import { notificationApi } from '../../api/notificationApi';
import { statsApi } from '../../api/statsApi';
import styles from './Settings.module.css';

/* ─── Google account stored in localStorage ─────────────── */
const STORAGE_KEY = 'taskflow_google_accounts';
const ACTIVE_KEY  = 'taskflow_active_account';

const loadAccounts = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};

const saveAccounts = (accounts) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));

const loadActive = () => localStorage.getItem(ACTIVE_KEY) || null;
const saveActive = (email) => {
  if (email) localStorage.setItem(ACTIVE_KEY, email);
  else localStorage.removeItem(ACTIVE_KEY);
};

const isValidClientId = (v = '') =>
  /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(v.trim());

const formatInterval = (secs) =>
  secs < 60 ? `${secs} seconds` : `${secs / 60} minute${secs / 60 > 1 ? 's' : ''}`;

/* Decode a Google ID token (base64url-safe) */
const parseJwt = (token = '') => {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
};

/* ─── Google Sign-In via Identity Services ───────────────── */
const GOOGLE_CLIENT_ID = ''; // User can paste their Client ID in settings

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

/* ─── Avatar initials helper ─────────────────────────────── */
const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const AVATAR_COLORS = [
  '#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'
];
const avatarColor = (email = '') =>
  AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length];

/* ═══════════════════════════════════════════════════════════
   Settings Modal
   ═══════════════════════════════════════════════════════════ */
const Settings = ({ onClose, refreshInterval = 30, onRefreshIntervalChange = () => {} }) => {
  const [section, setSection]         = useState('account');
  const [accounts, setAccounts]       = useState(loadAccounts);
  const [activeEmail, setActiveEmail] = useState(loadActive);
  const [addingAccount, setAddingAccount] = useState(false);
  const [newName, setNewName]         = useState('');
  const [newEmail, setNewEmail]       = useState('');
  const [newEmailErr, setNewEmailErr] = useState('');
  const [gsiLoaded, setGsiLoaded]     = useState(false);
  const [clientId, setClientId]       = useState(
    localStorage.getItem('taskflow_gsi_client_id') || ''
  );
  const [clientIdInput, setClientIdInput] = useState(
    localStorage.getItem('taskflow_gsi_client_id') || ''
  );
  const [clientIdErr, setClientIdErr] = useState('');
  const [interval, setInterval_]      = useState(refreshInterval || 30);
  const [saved, setSaved]             = useState(false);
  const [digestEnabled, setDigest]    = useState(true);
  const gsiRef = useRef(null);

  const { user, updateUser } = useAuth();
  const [profileName, setProfileName] = useState(user?.displayName || user?.name || '');
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('taskflow_theme') === 'dark');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) return toast.error('Name cannot be empty');
    setIsUpdatingProfile(true);
    try {
      const updated = await authApi.updateProfile({ displayName: profileName.trim() });
      if (updateUser) updateUser(updated);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currPassword) return toast.error('Please enter your current password');
    if (newPassword.length < 6) return toast.error('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('New passwords do not match');

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({ currentPassword: currPassword, newPassword });
      toast.success('Password changed successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const toggleDarkMode = (val) => {
    setDarkMode(val);
    localStorage.setItem('taskflow_theme', val ? 'dark' : 'light');
    if (val) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    toast.success(`Theme set to ${val ? 'Dark' : 'Light'}`);
  };

  /* ESC to close */
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  /* Load Google Identity Services */
  useEffect(() => {
    if (!clientId) return;
    if (window.google) { setGsiLoaded(true); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = () => setGsiLoaded(true);
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch {} };
  }, [clientId]);

  /* ── account helpers ── */
  const notifyAccountChange = () =>
    window.dispatchEvent(new Event('taskflow:account-changed'));

  const addManualAccount = () => {
    if (!newName.trim()) return;
    const emailVal = newEmail.trim();
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setNewEmailErr('Enter a valid email address.'); return;
    }
    const account = {
      name:    newName.trim(),
      email:   emailVal || `${newName.trim().toLowerCase().replace(/\s+/g,'.')}@example.com`,
      picture: null,
      source:  'manual',
    };
    const updated = [...accounts.filter(a => a.email !== account.email), account];
    setAccounts(updated);
    saveAccounts(updated);
    if (!activeEmail) { setActiveEmail(account.email); saveActive(account.email); }
    notifyAccountChange();
    setAddingAccount(false);
    setNewName(''); setNewEmail(''); setNewEmailErr('');
  };

  const switchAccount = (email) => {
    setActiveEmail(email);
    saveActive(email);
    notifyAccountChange();
  };

  const removeAccount = (email) => {
    const updated = accounts.filter(a => a.email !== email);
    setAccounts(updated);
    saveAccounts(updated);
    if (activeEmail === email) {
      const next = updated[0]?.email || null;
      setActiveEmail(next); saveActive(next);
    }
    notifyAccountChange();
  };

  const signOut = () => {
    try { window.google?.accounts?.id?.disableAutoSelect?.(); } catch {}
    setActiveEmail(null);
    saveActive(null);
    notifyAccountChange();
  };

  /* ── GSI sign-in ── */
  const handleGoogleSignIn = () => {
    if (!window.google || !clientId) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.error) {
          toast.error('Google sign-in failed: ' + response.error);
          return;
        }
        try {
          const payload = parseJwt(response.credential);
          const account = {
            name:    payload.name    || payload.email,
            email:   payload.email,
            picture: payload.picture || null,
            source:  'google',
          };
          const updated = [...accounts.filter(a => a.email !== account.email), account];
          setAccounts(updated);
          saveAccounts(updated);
          setActiveEmail(account.email);
          saveActive(account.email);
          notifyAccountChange();
          toast.success('Signed in as ' + account.email);
        } catch (e) {
          console.error('GSI decode failed:', e);
          toast.error('Could not read the Google credential');
        }
      },
    });
    window.google.accounts.id.prompt();
  };

  /* ── save preferences ── */
  const savePrefs = () => {
    const secs = Number(interval) > 0 ? Number(interval) : 30;
    onRefreshIntervalChange(secs);
    setSaved(true);
    toast.success('Auto-refresh set to every ' + formatInterval(secs));
    setTimeout(() => setSaved(false), 2000);
  };

  const saveClientId = () => {
    const value = clientIdInput.trim();
    if (!isValidClientId(value)) {
      setClientIdErr('Client ID must look like 123456.apps.googleusercontent.com');
      return;
    }
    setClientIdErr('');
    localStorage.setItem('taskflow_gsi_client_id', value);
    setClientId(value);
    toast.success('Google Client ID saved');
  };

  const clearClientId = () => {
    localStorage.removeItem('taskflow_gsi_client_id');
    setClientId('');
    setClientIdInput('');
    setClientIdErr('');
    toast('Google Client ID removed', { icon: 'ℹ️' });
  };

  const activeAccount = accounts.find(a => a.email === activeEmail);

  /* ══════════════════════════════════════════════════════════
     NAV SECTIONS
     ══════════════════════════════════════════════════════════ */
  const nav = [
    { id: 'profile',     icon: User,          label: 'Profile & Security' },
    { id: 'account',     icon: Globe,         label: 'Google Account' },
    { id: 'preferences', icon: SettingsIcon,  label: 'Preferences' },
    { id: 'about',       icon: Info,          label: 'About' },
  ];

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Settings">
      <div className={styles.panel} onClick={e => e.stopPropagation()}>

        {/* ── Panel Header ── */}
        <div className={styles.panelHeader}>
          <div className={styles.panelHeaderTitle}>
            <div className={styles.panelHeaderIcon}>
              <SettingsIcon size={16} color="#fff" />
            </div>
            <div>
              <h2 className={styles.panelTitle}>Settings</h2>
              <p className={styles.panelSub}>Manage your account and preferences</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {/* ── Sidebar Nav ── */}
          <nav className={styles.sideNav}>
            {nav.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                className={`${styles.sideNavItem} ${section === id ? styles.sideNavActive : ''}`}
                onClick={() => setSection(id)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* ── Content ── */}
          <div className={styles.content}>

            {/* ══════════ PROFILE & SECURITY ══════════ */}
            {section === 'profile' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <User size={16} />
                  Profile Details
                </h3>
                <p className={styles.sectionDesc}>
                  Update your display name and personal preferences.
                </p>

                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2rem' }}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Display Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Email Address</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={user?.email || ''}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>
                  <button type="submit" className={styles.saveBtn} disabled={isUpdatingProfile} style={{ alignSelf: 'flex-start' }}>
                    {isUpdatingProfile ? 'Saving...' : 'Update Profile'}
                  </button>
                </form>

                <h3 className={styles.sectionTitle} style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                  <Lock size={16} />
                  Change Password
                </h3>
                <p className={styles.sectionDesc}>
                  Ensure your account uses a secure password of at least 6 characters.
                </p>

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Current Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={currPassword}
                      onChange={(e) => setCurrPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>New Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Confirm New Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                  <button type="submit" className={styles.saveBtn} disabled={isChangingPassword} style={{ alignSelf: 'flex-start' }}>
                    {isChangingPassword ? 'Updating...' : 'Change Password'}
                  </button>
                </form>
              </div>
            )}

            {/* ══════════ GOOGLE ACCOUNT ══════════ */}
            {section === 'account' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <Globe size={16} />
                  Google Account
                </h3>
                <p className={styles.sectionDesc}>
                  Connect your Google account to personalize your workspace.
                  Account info is stored locally on this device.
                </p>

                {/* Active account hero */}
                {activeAccount ? (
                  <div className={styles.activeAccountCard}>
                    <div
                      className={styles.activeAvatar}
                      style={!activeAccount.picture ? { background: avatarColor(activeAccount.email) } : {}}
                    >
                      {activeAccount.picture
                        ? <img src={activeAccount.picture} alt={activeAccount.name} className={styles.avatarImg} />
                        : getInitials(activeAccount.name)
                      }
                    </div>
                    <div className={styles.activeInfo}>
                      <p className={styles.activeName}>{activeAccount.name}</p>
                      <p className={styles.activeEmail}>{activeAccount.email}</p>
                      <span className={styles.activeBadge}>
                        {activeAccount.source === 'google' ? (
                          <><GoogleIcon />&nbsp;Google Account</>
                        ) : (
                          <><User size={10} />&nbsp;Local Account</>
                        )}
                      </span>
                    </div>
                    <button className={styles.signOutBtn} onClick={signOut} title="Sign out">
                      <LogOut size={13} />
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className={styles.noAccount}>
                    <div className={styles.noAccountIcon}>
                      <User size={28} color="#94a3b8" />
                    </div>
                    <p className={styles.noAccountText}>No account connected</p>
                    <p className={styles.noAccountSub}>Sign in with Google or add an account manually.</p>
                  </div>
                )}

                {/* ── Accounts list ── */}
                {accounts.length > 0 && (
                  <div className={styles.accountsList}>
                    <p className={styles.listLabel}>All accounts</p>
                    {accounts.map(acc => (
                      <div key={acc.email} className={`${styles.accountRow} ${acc.email === activeEmail ? styles.accountRowActive : ''}`}>
                        <div
                          className={styles.rowAvatar}
                          style={!acc.picture ? { background: avatarColor(acc.email) } : {}}
                        >
                          {acc.picture
                            ? <img src={acc.picture} alt={acc.name} className={styles.avatarImgSm} />
                            : getInitials(acc.name)
                          }
                        </div>
                        <div className={styles.rowInfo}>
                          <p className={styles.rowName}>{acc.name}</p>
                          <p className={styles.rowEmail}>{acc.email}</p>
                        </div>
                        <div className={styles.rowActions}>
                          {acc.email !== activeEmail && (
                            <button
                              className={styles.switchBtn}
                              onClick={() => switchAccount(acc.email)}
                              title="Switch to this account"
                            >
                              Switch
                            </button>
                          )}
                          {acc.email === activeEmail && (
                            <span className={styles.activePill}>
                              <Check size={10} /> Active
                            </span>
                          )}
                          <button
                            className={styles.removeBtn}
                            onClick={() => removeAccount(acc.email)}
                            title="Remove account"
                            aria-label="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Google Sign-In ── */}
                <div className={styles.signinBlock}>
                  {clientId && gsiLoaded ? (
                    <button className={styles.googleBtn} onClick={handleGoogleSignIn}>
                      <GoogleIcon />
                      <span>Sign in with Google</span>
                    </button>
                  ) : (
                    <div className={styles.clientIdBox}>
                      <p className={styles.clientIdLabel}>
                        <Shield size={13} />
                        Google OAuth Client ID
                      </p>
                      <p className={styles.clientIdHint}>
                        {clientId ? (
                          <>Client ID saved. Loading Google Sign-In… (requires network access to accounts.google.com)</>
                        ) : (
                          <>
                            Enter your Google OAuth 2.0 Client ID to enable real Google Sign-In.
                            Create one at <span className={styles.link}>console.cloud.google.com</span>.
                          </>
                        )}
                      </p>
                      <div className={styles.clientIdRow}>
                        <input
                          className={styles.clientIdInput}
                          type="text"
                          placeholder="xxxx.apps.googleusercontent.com"
                          value={clientIdInput}
                          onChange={e => { setClientIdInput(e.target.value); setClientIdErr(''); }}
                        />
                        <button
                          className={styles.clientIdSave}
                          onClick={saveClientId}
                          disabled={!clientIdInput.trim()}
                        >
                          Save
                        </button>
                        {clientId && (
                          <button className={styles.clientIdClear} onClick={clearClientId}>
                            Clear
                          </button>
                        )}
                      </div>
                      {clientIdErr && <p className={styles.fieldErr}>{clientIdErr}</p>}
                    </div>
                  )}

                  {/* Manual add */}
                  {!addingAccount ? (
                    <button className={styles.addManualBtn} onClick={() => setAddingAccount(true)}>
                      <Plus size={14} />
                      Add account manually
                    </button>
                  ) : (
                    <div className={styles.addForm}>
                      <p className={styles.addFormLabel}>Add account</p>
                      <input
                        className={styles.addInput}
                        type="text"
                        placeholder="Full Name *"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        autoFocus
                      />
                      <input
                        className={`${styles.addInput} ${newEmailErr ? styles.addInputErr : ''}`}
                        type="email"
                        placeholder="Email (optional)"
                        value={newEmail}
                        onChange={e => { setNewEmail(e.target.value); setNewEmailErr(''); }}
                      />
                      {newEmailErr && <p className={styles.fieldErr}>{newEmailErr}</p>}
                      <div className={styles.addFormBtns}>
                        <button className={styles.addCancelBtn} onClick={() => { setAddingAccount(false); setNewName(''); setNewEmail(''); setNewEmailErr(''); }}>
                          Cancel
                        </button>
                        <button className={styles.addConfirmBtn} onClick={addManualAccount} disabled={!newName.trim()}>
                          Add Account
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ PREFERENCES ══════════ */}
            {section === 'preferences' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <SettingsIcon size={16} />
                  Preferences
                </h3>
                <p className={styles.sectionDesc}>
                  Customize how TaskFlow behaves for you.
                </p>

                {/* Dark Mode Toggle */}
                <div className={styles.prefCard}>
                  <div className={styles.prefCardHeader}>
                    {darkMode ? <Moon size={16} className={styles.prefIcon} /> : <Sun size={16} className={styles.prefIcon} />}
                    <div>
                      <p className={styles.prefLabel}>Appearance / Dark Mode</p>
                      <p className={styles.prefSub}>Switch between clean light SaaS theme and dark theme.</p>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={darkMode}
                        onChange={(e) => toggleDarkMode(e.target.checked)}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                </div>

                {/* Auto-refresh */}
                <div className={styles.prefCard}>
                  <div className={styles.prefCardHeader}>
                    <RefreshCw size={16} className={styles.prefIcon} />
                    <div>
                      <p className={styles.prefLabel}>Auto-Refresh Interval</p>
                      <p className={styles.prefSub}>How often the task list silently syncs with the server.</p>
                    </div>
                  </div>
                  <div className={styles.prefRow}>
                    {[15, 30, 60, 120].map(v => (
                      <button
                        key={v}
                        className={`${styles.intervalBtn} ${Number(interval) === v ? styles.intervalActive : ''}`}
                        onClick={() => setInterval_(v)}
                      >
                        {v < 60 ? `${v}s` : `${v/60}m`}
                      </button>
                    ))}
                  </div>
                  <p className={styles.prefNote}>
                    Current: every <strong>{interval < 60 ? `${interval} seconds` : `${interval/60} minute${interval/60 > 1 ? 's' : ''}`}</strong>
                  </p>
                </div>

                {/* Default task delays info */}
                <div className={styles.prefCard}>
                  <div className={styles.prefCardHeader}>
                    <Zap size={16} className={styles.prefIcon} />
                    <div>
                      <p className={styles.prefLabel}>Auto Status Transitions</p>
                      <p className={styles.prefSub}>Delays are configured per-task when creating a task.</p>
                    </div>
                  </div>
                  <div className={styles.flowDiagram}>
                    <span className={styles.flowChip} style={{ background: '#fef3c7', color: '#92400e' }}>Pending</span>
                    <span className={styles.flowArrow}>→ 2 min →</span>
                    <span className={styles.flowChip} style={{ background: '#dbeafe', color: '#1e40af' }}>In Progress</span>
                    <span className={styles.flowArrow}>→ 5 min →</span>
                    <span className={styles.flowChip} style={{ background: '#d1fae5', color: '#065f46' }}>Completed</span>
                  </div>
                  <p className={styles.prefNote}>
                    Change these per-task using the schedule inputs in the Create Task form.
                  </p>
                </div>

                <button className={styles.saveBtn} onClick={savePrefs}>
                  {saved ? <><Check size={14} /> Saved!</> : 'Save Preferences'}
                </button>

                {/* Email Digest */}
                <div className={styles.prefCard} style={{ marginTop: '16px' }}>
                  <div className={styles.prefCardHeader}>
                    <Mail size={16} className={styles.prefIcon} />
                    <div>
                      <p className={styles.prefLabel}>Daily Email Digest</p>
                      <p className={styles.prefSub}>Receive an 8 AM summary of unread notifications.</p>
                    </div>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={digestEnabled}
                        onChange={async (e) => {
                          const v = e.target.checked;
                          setDigest(v);
                          try {
                            await statsApi.toggleDigest(v);
                            toast.success(`Email digest ${v ? 'enabled' : 'disabled'}`);
                          } catch {
                            toast.error('Could not update digest setting');
                            setDigest(!v);
                          }
                        }}
                      />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                  <button
                    className={styles.saveBtn}
                    style={{ marginTop: '10px' }}
                    onClick={async () => {
                      try {
                        await notificationApi.testDigest();
                        toast.success('📧 Test digest sent — check Mailtrap!');
                      } catch {
                        toast.error('Failed to send test digest');
                      }
                    }}
                  >
                    Send Test Digest
                  </button>
                </div>
              </div>
            )}

            {/* ══════════ ABOUT ══════════ */}
            {section === 'about' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                  <Info size={16} />
                  About TaskFlow
                </h3>

                <div className={styles.aboutCard}>
                  <div className={styles.aboutLogo}>
                    <Zap size={28} color="#fff" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className={styles.aboutName}>TaskFlow Pro</p>
                    <p className={styles.aboutVer}>Version 1.0.0</p>
                  </div>
                </div>

                <div className={styles.aboutRows}>
                  {[
                    { label: 'Frontend',  value: 'React 18 + Vite 5' },
                    { label: 'Backend',   value: 'Spring Boot 3.2.5' },
                    { label: 'Database',  value: 'MySQL 8 (XAMPP)' },
                    { label: 'API Style', value: 'REST / JSON' },
                    { label: 'Auth',      value: 'Local (Google OAuth ready)' },
                    { label: 'Tests',     value: '13 / 13 passing ✅' },
                  ].map(({ label, value }) => (
                    <div key={label} className={styles.aboutRow}>
                      <span className={styles.aboutLabel}>{label}</span>
                      <span className={styles.aboutValue}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.aboutLinks}>
                  <a href="http://localhost:8080/swagger-ui.html" target="_blank" rel="noreferrer" className={styles.aboutLink}>
                    API Docs (Swagger UI) ↗
                  </a>
                  <a href="http://localhost:8080/v3/api-docs" target="_blank" rel="noreferrer" className={styles.aboutLink}>
                    OpenAPI JSON ↗
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
