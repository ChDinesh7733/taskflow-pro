import React, { useState, useEffect } from 'react';
import styles from './IntegrationsModal.module.css';
import { integrationsApi } from '../../api/integrationsApi';
import toast from 'react-hot-toast';

export default function IntegrationsModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('gcal'); // 'gcal' | 'email' | 'webhooks' | 'apikeys'
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);

  // Google Calendar state
  const [gcalEmail, setGcalEmail] = useState('');
  const [gcalEnabled, setGcalEnabled] = useState(false);
  const [syncingGcal, setSyncingGcal] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Email Inbound state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [simSubject, setSimSubject] = useState('');
  const [simFrom, setSimFrom] = useState('');
  const [simBody, setSimBody] = useState('');
  const [simulatingEmail, setSimulatingEmail] = useState(false);

  // Webhooks state
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookProvider, setWebhookProvider] = useState('SLACK');
  const [notifyOnCreate, setNotifyOnCreate] = useState(true);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKeySecret, setCreatedKeySecret] = useState(null);
  const [creatingKey, setCreatingKey] = useState(false);

  // Quick Capture simulation
  const [quickTitle, setQuickTitle] = useState('');
  const [quickUrl, setQuickUrl] = useState('');
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [sData, keysData] = await Promise.all([
        integrationsApi.getSettings().catch(() => null),
        integrationsApi.listApiKeys().catch(() => [])
      ]);
      if (sData) {
        setSettings(sData);
        setGcalEnabled(Boolean(sData.gcalEnabled));
        setGcalEmail(sData.gcalEmail || '');
        setEmailEnabled(Boolean(sData.emailInboundEnabled));
        setWebhookEnabled(Boolean(sData.webhookEnabled));
        setWebhookUrl(sData.webhookUrl || '');
        setWebhookProvider(sData.webhookProvider || 'SLACK');
        setNotifyOnCreate(Boolean(sData.webhookNotifyOnCreate));
        setNotifyOnComplete(Boolean(sData.webhookNotifyOnComplete));
      }
      setApiKeys(keysData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  // Save Settings
  const saveCurrentSettings = async (overrides = {}) => {
    try {
      const payload = {
        gcalEnabled,
        gcalEmail,
        emailInboundEnabled: emailEnabled,
        webhookEnabled,
        webhookUrl,
        webhookProvider,
        webhookNotifyOnCreate: notifyOnCreate,
        webhookNotifyOnComplete: notifyOnComplete,
        ...overrides
      };
      const updated = await integrationsApi.updateSettings(payload);
      setSettings(updated);
      toast.success('Settings updated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update settings');
    }
  };

  // Google Calendar Sync
  const handleSyncGcal = async () => {
    setSyncingGcal(true);
    setSyncResult(null);
    try {
      const res = await integrationsApi.syncGoogleCalendar();
      setSyncResult(res);
      setGcalEnabled(true);
      toast.success(`Google Calendar synced! (${res.syncedCount} events processed)`);
      // Refresh local settings to update last sync time
      const sData = await integrationsApi.getSettings();
      setSettings(sData);
    } catch (err) {
      console.error(err);
      toast.error('Calendar sync failed');
    } finally {
      setSyncingGcal(false);
    }
  };

  // Simulate Inbound Email
  const handleSimulateInboundEmail = async (e) => {
    e.preventDefault();
    if (!simSubject.trim() || !settings?.emailInboundAddress) return;

    setSimulatingEmail(true);
    try {
      const token = settings.emailInboundAddress.split('@')[0].replace('tasks+', '');
      const created = await integrationsApi.simulateInboundEmail(token, {
        subject: simSubject.trim(),
        from: simFrom.trim() || 'alerts@company.com',
        body: simBody.trim(),
        priority: 'HIGH'
      });
      toast.success(`New task created from email: "${created.title}"`);
      setSimSubject('');
      setSimFrom('');
      setSimBody('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process inbound email');
    } finally {
      setSimulatingEmail(false);
    }
  };

  // Test Webhook
  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL first');
      return;
    }
    setTestingWebhook(true);
    try {
      const res = await integrationsApi.testWebhook({
        webhookUrl: webhookUrl.trim(),
        provider: webhookProvider
      });
      toast.success(res.message || 'Webhook test alert dispatched!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to dispatch webhook test alert');
    } finally {
      setTestingWebhook(false);
    }
  };

  // API Key management
  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreatingKey(true);
    try {
      const res = await integrationsApi.createApiKey(newKeyName.trim());
      setCreatedKeySecret(res.rawApiKey);
      setNewKeyName('');
      const updatedKeys = await integrationsApi.listApiKeys();
      setApiKeys(updatedKeys);
      toast.success('API Key generated successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create API key');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async (id, name) => {
    if (!window.confirm(`Are you sure you want to revoke API key "${name}"? External apps using it will lose access.`)) return;
    try {
      await integrationsApi.revokeApiKey(id);
      setApiKeys(apiKeys.filter(k => k.id !== id));
      toast.success('API Key revoked');
    } catch (err) {
      console.error(err);
      toast.error('Failed to revoke API key');
    }
  };

  // Quick Capture test
  const handleQuickCapture = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setCapturing(true);
    try {
      const created = await integrationsApi.quickCapture({
        title: quickTitle.trim(),
        url: quickUrl.trim() || window.location.href,
        priority: 'MEDIUM'
      });
      toast.success(`Quick captured: "${created.title}"`);
      setQuickTitle('');
      setQuickUrl('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to quick capture');
    } finally {
      setCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.iconBadge}>⚡</span>
            <div>
              <h2>Integrations & Developer APIs</h2>
              <p>Connect Google Calendar, Email forwarders, Slack webhooks, and Browser extensions</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'gcal' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('gcal')}
          >
            📅 Google Calendar
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'email' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('email')}
          >
            ✉️ Email-to-Task
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'webhooks' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('webhooks')}
          >
            🔔 Slack & Webhooks
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'apikeys' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('apikeys')}
          >
            🔑 API Keys & Extension
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.content}>
          {/* ── TAB 1: Google Calendar ── */}
          {activeTab === 'gcal' && (
            <div className={styles.tabPane}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleBlock}>
                    <span className={styles.providerLogo}>📅</span>
                    <div>
                      <h3>Google Calendar 2-Way Sync</h3>
                      <p>Automatically sync tasks with due dates to your calendar, and import meetings as tasks.</p>
                    </div>
                  </div>
                  <button
                    className={`${styles.toggle} ${gcalEnabled ? styles.toggleOn : ''}`}
                    onClick={() => {
                      const next = !gcalEnabled;
                      setGcalEnabled(next);
                      saveCurrentSettings({ gcalEnabled: next });
                    }}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.fieldRow}>
                    <label>Calendar Email Account</label>
                    <input
                      type="email"
                      value={gcalEmail}
                      onChange={e => setGcalEmail(e.target.value)}
                      placeholder="alex.rivera@company.com"
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.syncMetaRow}>
                    <div className={styles.syncStatus}>
                      <span className={styles.statusDot} style={{ background: gcalEnabled ? '#10b981' : '#94a3b8' }} />
                      <span>
                        {settings?.gcalLastSync
                          ? `Last synced: ${new Date(settings.gcalLastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Not synced yet'}
                      </span>
                    </div>

                    <button
                      className={styles.syncBtn}
                      onClick={handleSyncGcal}
                      disabled={syncingGcal}
                    >
                      {syncingGcal ? '🔄 Syncing...' : '🔄 2-Way Sync Now'}
                    </button>
                  </div>

                  {syncResult && (
                    <div className={styles.syncResultBanner}>
                      ✓ {syncResult.message} ({syncResult.syncedCount} events processed)
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.infoBox}>
                <h4>How 2-Way Calendar Sync works:</h4>
                <ul>
                  <li>Tasks in TaskFlow with a due date automatically generate calendar event blocks.</li>
                  <li>Client demos, sprint retros, and review meetings created on your calendar import into TaskFlow as high-priority tasks tagged <code>gcal-sync</code>.</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── TAB 2: Email Inbound ── */}
          {activeTab === 'email' && (
            <div className={styles.tabPane}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleBlock}>
                    <span className={styles.providerLogo}>✉️</span>
                    <div>
                      <h3>Forward Emails to Create Tasks</h3>
                      <p>Forward any client email, Jira alert, or invoice to your private inbound address.</p>
                    </div>
                  </div>
                  <button
                    className={`${styles.toggle} ${emailEnabled ? styles.toggleOn : ''}`}
                    onClick={() => {
                      const next = !emailEnabled;
                      setEmailEnabled(next);
                      saveCurrentSettings({ emailInboundEnabled: next });
                    }}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <label className={styles.fieldLabel}>Your Private Inbound Address</label>
                  <div className={styles.copyRow}>
                    <input
                      type="text"
                      readOnly
                      value={settings?.emailInboundAddress || 'tasks+inbound@taskflow.dev'}
                      className={styles.addressInput}
                    />
                    <button
                      className={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(settings?.emailInboundAddress || '');
                        toast.success('Inbound email address copied to clipboard!');
                      }}
                    >
                      📋 Copy Address
                    </button>
                  </div>
                </div>
              </div>

              {/* Simulation Card */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>🧪 Test Forwarded Email Simulator</h3>
                </div>
                <form className={styles.simForm} onSubmit={handleSimulateInboundEmail}>
                  <input
                    type="text"
                    placeholder="Sender email (e.g. client@stripe.com)"
                    value={simFrom}
                    onChange={e => setSimFrom(e.target.value)}
                    className={styles.input}
                  />
                  <input
                    type="text"
                    placeholder="Email Subject (e.g. Need updated Q4 API documentation)"
                    value={simSubject}
                    onChange={e => setSimSubject(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <textarea
                    placeholder="Email Body (optional notes or description)..."
                    value={simBody}
                    onChange={e => setSimBody(e.target.value)}
                    className={styles.textarea}
                  />
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={simulatingEmail || !simSubject.trim()}
                  >
                    {simulatingEmail ? 'Forwarding...' : '🚀 Simulate Inbound Email'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── TAB 3: Webhooks ── */}
          {activeTab === 'webhooks' && (
            <div className={styles.tabPane}>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleBlock}>
                    <span className={styles.providerLogo}>🔔</span>
                    <div>
                      <h3>Outbound Webhooks (Slack, Discord, Telegram)</h3>
                      <p>Send real-time alerts to team channels when deliverables are created or completed.</p>
                    </div>
                  </div>
                  <button
                    className={`${styles.toggle} ${webhookEnabled ? styles.toggleOn : ''}`}
                    onClick={() => {
                      const next = !webhookEnabled;
                      setWebhookEnabled(next);
                      saveCurrentSettings({ webhookEnabled: next });
                    }}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.fieldGrid}>
                    <div className={styles.fieldItem}>
                      <label>Platform / Provider</label>
                      <select
                        value={webhookProvider}
                        onChange={e => {
                          setWebhookProvider(e.target.value);
                          saveCurrentSettings({ webhookProvider: e.target.value });
                        }}
                        className={styles.select}
                      >
                        <option value="SLACK">Slack Webhook</option>
                        <option value="DISCORD">Discord Channel</option>
                        <option value="TELEGRAM">Telegram Bot</option>
                        <option value="CUSTOM">Custom Webhook (HTTP POST)</option>
                      </select>
                    </div>

                    <div className={styles.fieldItem}>
                      <label>Webhook Destination URL</label>
                      <input
                        type="url"
                        placeholder="https://hooks.slack.com/services/..."
                        value={webhookUrl}
                        onChange={e => setWebhookUrl(e.target.value)}
                        onBlur={() => saveCurrentSettings({ webhookUrl })}
                        className={styles.input}
                      />
                    </div>
                  </div>

                  <div className={styles.eventsCheckboxes}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={notifyOnCreate}
                        onChange={e => {
                          setNotifyOnCreate(e.target.checked);
                          saveCurrentSettings({ webhookNotifyOnCreate: e.target.checked });
                        }}
                      />
                      <span>Trigger alert when a new task is created</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={notifyOnComplete}
                        onChange={e => {
                          setNotifyOnComplete(e.target.checked);
                          saveCurrentSettings({ webhookNotifyOnComplete: e.target.checked });
                        }}
                      />
                      <span>Trigger alert when a task is marked Done</span>
                    </label>
                  </div>

                  <div className={styles.webhookActionRow}>
                    <button
                      className={styles.secondaryBtn}
                      onClick={handleTestWebhook}
                      disabled={testingWebhook || !webhookUrl.trim()}
                    >
                      {testingWebhook ? 'Testing...' : '📡 Send Test Webhook Alert'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: API Keys & Extension ── */}
          {activeTab === 'apikeys' && (
            <div className={styles.tabPane}>
              {/* New Key Alert */}
              {createdKeySecret && (
                <div className={styles.secretAlert}>
                  <div className={styles.secretAlertTop}>
                    <strong>🔑 New API Key Generated:</strong>
                    <span>Copy it now — for security, you won't be able to see it again!</span>
                  </div>
                  <div className={styles.secretBox}>
                    <code>{createdKeySecret}</code>
                    <button
                      className={styles.copyBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(createdKeySecret);
                        toast.success('API key copied to clipboard!');
                      }}
                    >
                      Copy Secret
                    </button>
                  </div>
                </div>
              )}

              {/* Generate Key Form */}
              <form className={styles.createKeyCard} onSubmit={handleCreateApiKey}>
                <h3>Create New API Key</h3>
                <div className={styles.createKeyRow}>
                  <input
                    type="text"
                    placeholder="Key description (e.g. Chrome Extension, Zapier, CI/CD Script)"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={creatingKey || !newKeyName.trim()}
                  >
                    {creatingKey ? 'Generating...' : '+ Generate API Key'}
                  </button>
                </div>
              </form>

              {/* Existing Keys Table */}
              <div className={styles.keysList}>
                <h4>Active API Keys</h4>
                {apiKeys.length === 0 ? (
                  <div className={styles.empty}>No API keys generated yet. Create one above!</div>
                ) : (
                  apiKeys.map(k => (
                    <div key={k.id} className={styles.keyRow}>
                      <div className={styles.keyInfo}>
                        <div className={styles.keyName}>{k.name}</div>
                        <div className={styles.keyPrefix}><code>{k.keyPrefix}</code></div>
                      </div>
                      <div className={styles.keyMeta}>
                        <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsedAt && (
                          <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <button
                        className={styles.revokeBtn}
                        onClick={() => handleRevokeApiKey(k.id, k.name)}
                        title="Revoke key"
                      >
                        Revoke
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Quick Capture from Browser Extension Simulator */}
              <div className={styles.card} style={{ marginTop: '1rem' }}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleBlock}>
                    <span className={styles.providerLogo}>🧩</span>
                    <div>
                      <h3>Browser Extension Quick Capture</h3>
                      <p>Use your API key with header <code>X-TaskFlow-API-Key</code> to instantly clip pages and notes.</p>
                    </div>
                  </div>
                </div>
                <form className={styles.simForm} onSubmit={handleQuickCapture}>
                  <input
                    type="text"
                    placeholder="Task Title (e.g. Review competitor landing page)"
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <input
                    type="url"
                    placeholder="Page URL"
                    value={quickUrl}
                    onChange={e => setQuickUrl(e.target.value)}
                    className={styles.input}
                  />
                  <button
                    type="submit"
                    className={styles.primaryBtn}
                    disabled={capturing || !quickTitle.trim()}
                  >
                    {capturing ? 'Capturing...' : '⚡ Quick Capture Task'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
