import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../../api/statsApi';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import styles from './ProductivityChart.module.css';

// Build stable 7-day chart data (no Math.random — deterministic)
function buildChartData(completedThisWeek) {
  const weekDays = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const today = new Date().getDay(); // 0=Sun
  const todayIdx = today === 0 ? 6 : today - 1;
  return weekDays.map((d, i) => ({
    day: d,
    tasks: i === todayIdx ? Number(completedThisWeek) || 0 : 0,
  }));
}

export function ProductivityChart() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['productivity'],
    queryFn:  statsApi.productivity,
    staleTime: 60_000,
    retry: 1,
  });

  if (isLoading) return (
    <div className={styles.card}>
      <div className={styles.loading}>Loading productivity stats…</div>
    </div>
  );

  // Don't crash the page — just hide the chart on error
  if (isError || !data) return null;

  const rate = Math.round((data.onTimeCompletionRate || 0) * 100);
  const chartData = buildChartData(data.completedThisWeek);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3>📊 Productivity</h3>
        <span className={styles.streak}>🔥 {data.currentStreakDays} day streak</span>
      </div>

      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.gaugeWrap}>
            <svg viewBox="0 0 100 60" className={styles.gauge}>
              <path d="M10 55 A45 45 0 0 1 90 55" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeLinecap="round"/>
              <path
                d="M10 55 A45 45 0 0 1 90 55"
                fill="none"
                stroke="url(#prodGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${rate * 1.41} 141`}
              />
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.gaugeLabel}>{rate}%</span>
          </div>
          <p className={styles.metricTitle}>On-time rate</p>
        </div>

        <div className={styles.metricGroup}>
          <div className={styles.stat}>
            <span className={styles.statVal}>{data.completedThisWeek}</span>
            <span className={styles.statLabel}>This week</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal} style={{ color: data.overdueCount > 0 ? '#f87171' : '#22c55e' }}>
              {data.overdueCount}
            </span>
            <span className={styles.statLabel}>Overdue</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statVal}>{data.totalCompleted}</span>
            <span className={styles.statLabel}>Total done</span>
          </div>
        </div>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
              itemStyle={{ color: '#6366f1' }}
            />
            <Line
              type="monotone"
              dataKey="tasks"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: '#6366f1', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
