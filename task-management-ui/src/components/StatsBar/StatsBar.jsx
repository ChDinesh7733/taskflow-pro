import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Clock, Play, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { GlowCard } from '../ui/GlowCard';
import { StatusTooltip } from '../ui/StatusTooltip';
import { staggerContainer, staggerItem } from '../../animations/motionVariants';
import { useTaskStats } from '../../hooks/useTasks';
import styles from './StatsBar.module.css';

/* ── Animated counter ── */
function useCounter(target, duration = 600) {
  const [count, setCount] = useState(target);
  const prevRef = useRef(target);
  const rafRef  = useRef();
  useEffect(() => {
    const start = prevRef.current, end = target;
    if (start === end) return;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      setCount(Math.round(start + (end - start) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else prevRef.current = end;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return count;
}

/* ── Skeleton card ── */
const SkeletonStat = () => (
  <div className={styles.card} style={{ animation: 'shimmer 1.4s infinite' }}>
    <div style={{ height: 14, width: '60%', borderRadius: 6, background: '#e2e8f0', marginBottom: 12 }} />
    <div style={{ height: 32, width: '40%', borderRadius: 6, background: '#e2e8f0', marginBottom: 8 }} />
    <div style={{ height: 10, width: '80%', borderRadius: 6, background: '#f1f5f9' }} />
  </div>
);

/* ── Single stat card ── */
const StatCard = ({ label, value, icon: Icon, accent, accentBg, sub }) => {
  const displayed = useCounter(value ?? 0);
  return (
    <GlowCard accentColor={accent} className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <p className={styles.cardLabel}>{label}</p>
          <motion.p className={styles.cardValue} key={value}
            initial={{ opacity: 0.6, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {displayed}
          </motion.p>
          <p className={styles.cardSub}>{sub}</p>
        </div>
        <motion.div className={styles.iconWrap} style={{ background: accentBg, color: accent }}
          whileHover={{ scale: 1.12, rotate: 8 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Icon size={20} strokeWidth={1.8} />
        </motion.div>
      </div>
      <div className={styles.accentBar} style={{ background: accent }} />
    </GlowCard>
  );
};

/* Spring slide-down animation variant for each stat card */
const springSlideDown = {
  hidden: { opacity: 0, y: -45, scale: 0.94 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
      mass: 0.8,
      delay: i * 0.07,
    },
  }),
};

/* ── Stats bar — data from React Query ── */
const StatsBar = ({ onFilterChange = () => {} }) => {
  const { data: stats, isLoading } = useTaskStats();

  if (isLoading || !stats) {
    return (
      <div className={styles.grid}>
        {[1,2,3,4,5].map(i => <SkeletonStat key={i} />)}
      </div>
    );
  }

  const rate = stats?.completionRate ?? 0;
  const cards = [
    { filterId: null,          label: 'Total Tasks', status: 'MY_TASKS',   title: 'My Tasks',    value: stats?.total ?? 0,       icon: ClipboardList, accent: '#6366f1', accentBg: '#eef2ff', sub: `${rate}% completion rate` },
    { filterId: 'TODO',        label: 'To Do',       status: 'TODO',       title: 'To Do',       value: stats?.todo ?? 0,        icon: Clock,         accent: '#d97706', accentBg: '#fef3c7', sub: (stats?.todo ?? 0) > 0 ? 'Waiting to start' : 'All caught up!' },
    { filterId: 'IN_PROGRESS', label: 'In Progress', status: 'IN_PROGRESS',title: 'In Progress', value: stats?.inProgress ?? 0,  icon: Play,          accent: '#2563eb', accentBg: '#dbeafe', sub: (stats?.inProgress ?? 0) > 0 ? 'Actively running' : 'Nothing active' },
    { filterId: 'IN_REVIEW',   label: 'In Review',   status: 'IN_REVIEW',  title: 'In Review',   value: stats?.inReview ?? 0,    icon: Eye,           accent: '#8b5cf6', accentBg: '#f3e8ff', sub: (stats?.inReview ?? 0) > 0 ? 'Awaiting review' : 'Zero in review' },
    { filterId: 'DONE',        label: 'Done',        status: 'DONE',       title: 'Done',        value: stats?.completed ?? 0,   icon: CheckCircle2,  accent: '#059669', accentBg: '#d1fae5', sub: (stats?.completed ?? 0) > 0 ? `${rate}% of total` : 'None yet' },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card, i) => (
        <motion.div
          key={card.label}
          custom={i}
          variants={springSlideDown}
          initial="hidden"
          animate="visible"
        >
          <StatusTooltip status={card.status} title={card.title} placement="bottom">
            <div onClick={() => onFilterChange(card.filterId)} role="button" tabIndex={0}>
              <StatCard {...card} />
            </div>
          </StatusTooltip>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsBar;
