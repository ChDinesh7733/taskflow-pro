import React, { useState, useEffect } from 'react';
import gamificationApi from '../../api/gamificationApi';
import { Trophy, Award, Flame, Zap, Shield, Star, Users, CheckCircle2, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './GamificationModal.module.css';

export default function GamificationModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'badges' | 'leaderboard'
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await gamificationApi.getProfile();
      setProfile(data);
    } catch (err) {
      console.error('Failed to load gamification profile:', err);
      toast.error('Failed to load achievement profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const xpProgress = profile ? Math.min(100, Math.round(((profile.xp - profile.currentLevelMinXp) / Math.max(1, profile.nextLevelXp - profile.currentLevelMinXp)) * 100)) : 0;
  const unlockedBadgesCount = profile?.badges?.filter(b => b.unlocked).length || 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitleBox}>
            <div className={styles.headerIcon}>🏆</div>
            <div>
              <h2 className={styles.headerTitle}>Achievements & Gamification</h2>
              <p className={styles.headerSubtitle}>
                Level up your productivity, unlock badges, and climb the weekly team leaderboard
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tabBtn} ${tab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('overview')}
          >
            <Zap size={15} />
            <span>XP & Level</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'badges' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('badges')}
          >
            <Award size={15} />
            <span>Badges ({unlockedBadgesCount}/{profile?.badges?.length || 0})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${tab === 'leaderboard' ? styles.tabBtnActive : ''}`}
            onClick={() => setTab('leaderboard')}
          >
            <Trophy size={15} />
            <span>Weekly Leaderboard</span>
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {loading && !profile ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Loading achievements...
            </div>
          ) : profile ? (
            <>
              {/* TAB 1: OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  {/* Hero Level Banner */}
                  <div className={styles.levelHero}>
                    <div className={styles.levelHeroTop}>
                      <span className={styles.levelBadgeBig}>
                        ⚡ Level {profile.level}
                      </span>
                      <span className={styles.xpNumber}>{profile.xp} Total XP</span>
                    </div>

                    <div>
                      <h3 className={styles.levelTitleBig}>{profile.levelTitle}</h3>
                      <p style={{ margin: '0.2rem 0 0 0', opacity: 0.85, fontSize: '0.85rem' }}>
                        {profile.xpToNextLevel > 0
                          ? `${profile.xpToNextLevel} XP needed to reach Level ${profile.level + 1}`
                          : 'Maximum Level Achieved! You are a TaskFlow Legend!'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div className={styles.xpTrack}>
                        <div className={styles.xpBar} style={{ width: `${xpProgress}%` }} />
                      </div>
                      <div className={styles.xpDetailRow}>
                        <span>{profile.currentLevelMinXp} XP</span>
                        <span>{xpProgress}% Progress</span>
                        <span>{profile.nextLevelXp} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className={styles.statsRow}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🔥</div>
                      <div>
                        <div className={styles.statVal}>{profile.currentStreak} Days</div>
                        <div className={styles.statLabel}>Current Completion Streak</div>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🏆</div>
                      <div>
                        <div className={styles.statVal}>{profile.longestStreak} Days</div>
                        <div className={styles.statLabel}>Longest Streak Record</div>
                      </div>
                    </div>

                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>✅</div>
                      <div>
                        <div className={styles.statVal}>{profile.totalTasksCompleted}</div>
                        <div className={styles.statLabel}>Total Tasks Completed</div>
                      </div>
                    </div>
                  </div>

                  {/* XP breakdown info */}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', fontSize: '0.825rem', color: '#475569' }}>
                    💡 <strong>Earn XP:</strong> Urgent Tasks (+50 XP) • High Priority (+35 XP) • Medium (+20 XP) • Low (+10 XP) • Daily Habit (+15 XP) • Pomodoro Session (+25 XP)
                  </div>
                </div>
              )}

              {/* TAB 2: BADGES */}
              {tab === 'badges' && (
                <div className={styles.badgeGrid}>
                  {profile.badges.map(b => (
                    <div
                      key={b.badgeKey}
                      className={`${styles.badgeCard} ${b.unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                    >
                      <div className={styles.badgeIcon}>{b.icon}</div>
                      <h4 className={styles.badgeName}>{b.title}</h4>
                      <p className={styles.badgeDesc}>{b.description}</p>
                      {b.unlocked ? (
                        <span className={styles.unlockedTag}>
                          ✓ Unlocked {b.unlockedAt ? new Date(b.unlockedAt).toLocaleDateString() : 'Active'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
                          🔒 Locked
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: LEADERBOARD */}
              {tab === 'leaderboard' && (
                <div>
                  <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '1rem', fontWeight: 700 }}>
                        Weekly Team Standings
                      </h4>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.8rem' }}>
                        Resets every Monday at 00:00 UTC
                      </p>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#7e22ce', fontWeight: 700, background: '#faf5ff', padding: '0.25rem 0.6rem', borderRadius: '9999px', border: '1px solid #e9d5ff' }}>
                      ⚡ Sprint Cycle Active
                    </span>
                  </div>

                  <div className={styles.leaderboardList}>
                    {profile.leaderboard.map(entry => (
                      <div
                        key={entry.rank}
                        className={`${styles.leaderCard} ${entry.isCurrent ? styles.currentUserCard : ''}`}
                      >
                        <div className={styles.leaderLeft}>
                          <div className={`${styles.rankCircle} ${
                            entry.rank === 1 ? styles.rank1 :
                            entry.rank === 2 ? styles.rank2 :
                            entry.rank === 3 ? styles.rank3 : styles.rankOther
                          }`}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                          </div>
                          <div>
                            <div className={styles.leaderName}>
                              {entry.displayName} {entry.isCurrent && <span style={{ color: '#7e22ce', fontSize: '0.75rem', fontWeight: 700 }}>(You)</span>}
                            </div>
                            <div className={styles.leaderMeta}>
                              Level {entry.level} • {entry.tasksCompleted} tasks done
                            </div>
                          </div>
                        </div>

                        <div className={styles.leaderRight}>
                          <div className={styles.leaderXp}>{entry.weeklyXp} XP</div>
                          <div className={styles.leaderTasks}>This Week</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
