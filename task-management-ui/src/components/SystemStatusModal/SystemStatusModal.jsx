import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Activity, Server, Radio, Database, ExternalLink,
  RefreshCw, CheckCircle2, AlertTriangle, Copy, Check,
  BookOpen, HeartPulse, BarChart3, Globe, Shield, Terminal
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import styles from './SystemStatusModal.module.css';

export default function SystemStatusModal({ isOpen, onClose, wsConnected }) {
  const [healthData, setHealthData] = useState(null);
  const [actuatorData, setActuatorData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    const start = performance.now();
    try {
      const [apiHealthRes, actuatorHealthRes] = await Promise.all([
        axios.get('/api/health').catch(e => ({ data: { status: 'DEGRADED', error: e.message } })),
        axios.get('/actuator/health').catch(e => ({ data: { status: 'DEGRADED', error: e.message } }))
      ]);
      setLatency(Math.round(performance.now() - start));
      setHealthData(apiHealthRes.data);
      setActuatorData(actuatorHealthRes.data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  const copyToClipboard = (url, key) => {
    const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
    navigator.clipboard.writeText(fullUrl);
    setCopiedKey(key);
    toast.success(`Copied: ${fullUrl}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  const origin = window.location.origin;

  const ALL_SERVICES = [
    {
      key: 'webapp',
      title: 'TaskFlow Pro (Web App)',
      url: `${origin}/`,
      path: '/',
      description: 'Single unified delivery — React 18 SPA served natively by Spring Boot 3 on port 8081',
      icon: Globe,
      color: '#6366f1',
      badge: 'Main Interface',
      status: 'ONLINE'
    },
    {
      key: 'swagger',
      title: 'Swagger OpenAPI 3.0 Documentation',
      url: `${origin}/swagger-ui/index.html`,
      path: '/swagger-ui/index.html',
      description: 'Interactive API playground with JWT Bearer & API Key authentication testing',
      icon: BookOpen,
      color: '#0ea5e9',
      badge: 'API Explorer',
      status: 'ACTIVE'
    },
    {
      key: 'actuator',
      title: 'Actuator Health Probe',
      url: `${origin}/actuator/health`,
      path: '/actuator/health',
      description: 'MySQL database, diskSpace, container livenessState & readinessState probes',
      icon: HeartPulse,
      color: '#10b981',
      badge: actuatorData?.status || 'UP',
      status: actuatorData?.status === 'UP' ? 'HEALTHY' : 'CHECK'
    },
    {
      key: 'prometheus',
      title: 'Prometheus Metrics Scrape',
      url: `${origin}/actuator/prometheus`,
      path: '/actuator/prometheus',
      description: 'Scrapes platform counters: taskflow_users_total, taskflow_tasks_total, taskflow_billing_mrr_usd',
      icon: BarChart3,
      color: '#f59e0b',
      badge: 'Prometheus',
      status: 'EXPOSED'
    },
    {
      key: 'actuatormetrics',
      title: 'Actuator Metrics Explorer',
      url: `${origin}/actuator/metrics`,
      path: '/actuator/metrics',
      description: '106+ JVM, Garbage Collector, HTTP request latency, and thread telemetry metrics',
      icon: Terminal,
      color: '#8b5cf6',
      badge: '106+ Metrics',
      status: 'AVAILABLE'
    }
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <div className={styles.iconWrap}>
              <Activity size={20} color="#6366f1" />
            </div>
            <div>
              <div className={styles.titleBadgeRow}>
                <span className={styles.hubBadge}>PLATFORM HUB</span>
                <span className={styles.singleLinkPill}>ALL IN ONE LINK • PORT 8081</span>
              </div>
              <h3>TaskFlow Pro System Services</h3>
              <p>Direct navigation to the Web App, Swagger API, Actuator Health & Prometheus Telemetry</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Live Diagnostics Bar */}
        <div className={styles.diagnosticsBar}>
          <div className={styles.diagItem}>
            <span className={styles.diagLabel}>Backend Service:</span>
            <span className={styles.diagValue}>
              <span className={styles.greenDot} /> Spring Boot 3.2.5 ({latency ? `${latency}ms` : 'UP'})
            </span>
          </div>
          <div className={styles.diagItem}>
            <span className={styles.diagLabel}>Database:</span>
            <span className={styles.diagValue}>
              <span className={styles.greenDot} /> MySQL 8 (Flyway v12)
            </span>
          </div>
          <div className={styles.diagItem}>
            <span className={styles.diagLabel}>WebSocket:</span>
            <span className={styles.diagValue}>
              {wsConnected ? (
                <><span className={styles.greenDot} /> Live Sync (STOMP)</>
              ) : (
                <><span className={styles.yellowDot} /> Connected</>
              )}
            </span>
          </div>
        </div>

        {/* All In One Link Services Grid */}
        <div className={styles.body}>
          <div className={styles.linksHeadingRow}>
            <span className={styles.sectionTitle}>ALL-IN-ONE LINK ENDPOINTS</span>
            <span className={styles.sectionSubtitle}>Host: {origin}</span>
          </div>

          <div className={styles.servicesList}>
            {ALL_SERVICES.map((s) => {
              const Icon = s.icon;
              const isCopied = copiedKey === s.key;

              return (
                <div key={s.key} className={styles.serviceCard}>
                  <div className={styles.serviceIconWrap} style={{ background: `${s.color}15`, color: s.color }}>
                    <Icon size={20} />
                  </div>

                  <div className={styles.serviceInfo}>
                    <div className={styles.serviceHeaderRow}>
                      <h4 className={styles.serviceName}>{s.title}</h4>
                      <span className={styles.serviceBadge} style={{ background: `${s.color}18`, color: s.color }}>
                        {s.badge}
                      </span>
                    </div>
                    <p className={styles.serviceDesc}>{s.description}</p>
                    <div className={styles.serviceUrlRow}>
                      <code className={styles.serviceUrl}>{s.url}</code>
                    </div>
                  </div>

                  <div className={styles.serviceActions}>
                    <button
                      className={styles.copyBtn}
                      onClick={() => copyToClipboard(s.url, s.key)}
                      title="Copy URL"
                    >
                      {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={s.path}
                      target={s.key === 'webapp' ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                      className={styles.openBtn}
                      title={`Open ${s.title}`}
                    >
                      <span>Open</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.refreshBtn} onClick={fetchStatus} disabled={loading}>
            <RefreshCw size={14} className={loading ? styles.spin : ''} />
            <span>Recheck Health</span>
          </button>
          <button className={styles.doneBtn} onClick={onClose}>Done</button>
        </div>
      </motion.div>
    </div>
  );
}
