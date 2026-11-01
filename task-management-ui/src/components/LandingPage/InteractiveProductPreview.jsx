import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { EASING } from '../../animations/motionConfig';
import styles from './InteractiveProductPreview.module.css';

const AI_PHRASE = 'Deploy edge CDN next Friday, high priority #infra';

export default function InteractiveProductPreview() {
  const containerRef = useRef(null);

  // Scroll-linked 3D perspective tilt (Straightens from 12deg to 0deg as user scrolls)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'center center'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [12, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [0.4, 1]);

  // Typing effect on Smart Task AI bar
  const [typedText, setTypedText] = useState('');
  const [step, setStep] = useState(0); // 0: typing, 1: create card, 2: move to in-progress, 3: move to done

  // Pause animations when tab is hidden or element is out of view
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 6-second cyclic demo simulation
  useEffect(() => {
    let charIdx = 0;
    let timer;

    const runCycle = () => {
      if (!isVisibleRef.current) {
        timer = setTimeout(runCycle, 1000);
        return;
      }

      // Step 0: Type out text
      setStep(0);
      charIdx = 0;
      setTypedText('');

      const typeInterval = setInterval(() => {
        if (!isVisibleRef.current) return;
        charIdx++;
        setTypedText(AI_PHRASE.slice(0, charIdx));
        if (charIdx >= AI_PHRASE.length) {
          clearInterval(typeInterval);

          // Step 1: Card materializes in To Do (after 800ms)
          timer = setTimeout(() => {
            setStep(1);

            // Step 2: Card transitions to In Progress (after 1800ms)
            timer = setTimeout(() => {
              setStep(2);

              // Step 3: Card moves to Done (after 1800ms)
              timer = setTimeout(() => {
                setStep(3);

                // Restart loop after 2000ms
                timer = setTimeout(runCycle, 2000);
              }, 1800);
            }, 1800);
          }, 800);
        }
      }, 55);
    };

    runCycle();

    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.tiltContainer}>
      <motion.div
        className={styles.previewCard}
        style={{
          rotateX,
          scale,
          opacity,
          transformOrigin: 'top center',
        }}
        transition={{ ease: EASING.linear }}
      >
        {/* Conic traveling border light */}
        <div className={styles.borderLight} />

        <div className={styles.innerContent}>
          {/* Mock Window Top Bar */}
          <div className={styles.previewHeader}>
            <div className={styles.mockWindowDots}>
              <span className={`${styles.mockDot} ${styles.mockDotRed}`} />
              <span className={`${styles.mockDot} ${styles.mockDotYellow}`} />
              <span className={`${styles.mockDot} ${styles.mockDotGreen}`} />
            </div>
            <div className={styles.mockAddressBar}>
              http://localhost:8081 — TaskFlow Pro Edition Dashboard
            </div>
            <div style={{ display: 'flex', gap: '8px', fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
              <span>● Live WebSocket Sync</span>
            </div>
          </div>

          {/* Mock Body */}
          <div className={styles.previewBody}>
            {/* Mock Sidebar */}
            <div className={styles.previewSidebar}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Zap size={15} color="#4f46e5" /> TaskFlow
              </div>
              <div className={`${styles.previewSideItem} ${styles.previewSideActive}`}>
                <span>Kanban Board</span>
                <span style={{ fontSize: '0.68rem', background: '#c7d2fe', padding: '1px 6px', borderRadius: 999 }}>
                  {step >= 1 ? 8 : 7}
                </span>
              </div>
              <div className={styles.previewSideItem}>
                <span>List View</span>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>8</span>
              </div>
              <div className={styles.previewSideItem}>
                <span>⏱ Focus Timer</span>
                <span style={{ fontSize: '0.68rem', color: '#ec4899', fontWeight: 700 }}>25m</span>
              </div>
              <div className={styles.previewSideItem}>
                <span>✨ Weekly AI Digest</span>
                <span style={{ fontSize: '0.68rem', color: '#8b5cf6' }}>94%</span>
              </div>
              <div className={styles.previewSideItem}>
                <span>📁 Uploaded Files</span>
                <span style={{ fontSize: '0.68rem', color: '#64748b' }}>PDF/CSV</span>
              </div>
            </div>

            {/* Mock Main Area */}
            <div className={styles.previewMain}>
              {/* Animated Smart Task AI input */}
              <div className={styles.previewNlpBar}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '22px' }}>
                  <Sparkles size={16} color="#4f46e5" />
                  <span style={{ color: '#4338ca', fontWeight: 600 }}>Smart Task AI:</span>
                  <span style={{ color: '#1e293b', fontWeight: 500 }}>
                    "{typedText}"
                    <span className={styles.typingCursor} />
                  </span>
                </div>
                <motion.span
                  style={{
                    fontSize: '0.68rem',
                    background: '#4f46e5',
                    color: '#fff',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                  animate={{ scale: typedText === AI_PHRASE ? [1, 1.1, 1] : 1 }}
                  transition={{ duration: 0.3 }}
                >
                  Enter ↵
                </motion.span>
              </div>

              {/* Dynamic Columns with Animated Task Movement */}
              <div className={styles.previewKanbanRow}>
                {/* Column: To Do */}
                <div className={styles.previewCol}>
                  <div className={styles.previewColTitle} style={{ color: '#d97706' }}>
                    <span>● To Do</span>
                    <span>{step === 1 ? 3 : 2}</span>
                  </div>

                  {/* Simulated newly created task */}
                  {step === 1 && (
                    <motion.div
                      className={styles.previewCard}
                      initial={{ opacity: 0, y: -20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ borderLeft: '3px solid #d97706' }}
                    >
                      <div>Deploy edge CDN next Friday</div>
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                        <span style={{ fontSize: '0.62rem', background: '#fae8ff', color: '#9333ea', padding: '1px 4px', borderRadius: 4 }}>Urgent</span>
                        <span style={{ fontSize: '0.62rem', background: '#e0e7ff', color: '#4338ca', padding: '1px 4px', borderRadius: 4 }}>#infra</span>
                      </div>
                    </motion.div>
                  )}

                  <div className={styles.previewCard}>
                    <div>Conduct WCAG AA accessibility audit</div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.62rem', background: '#fee2e2', color: '#dc2626', padding: '1px 4px', borderRadius: 4 }}>High</span>
                      <span style={{ fontSize: '0.62rem', background: '#f1f5f9', color: '#475569', padding: '1px 4px', borderRadius: 4 }}>#a11y</span>
                    </div>
                  </div>

                  <div className={styles.previewCard}>
                    <div>Finalize Stripe webhook retry queue</div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.62rem', background: '#fae8ff', color: '#9333ea', padding: '1px 4px', borderRadius: 4 }}>Urgent</span>
                    </div>
                  </div>
                </div>

                {/* Column: In Progress */}
                <div className={styles.previewCol}>
                  <div className={styles.previewColTitle} style={{ color: '#2563eb' }}>
                    <span>● In Progress</span>
                    <span>{step === 2 ? 3 : 2}</span>
                  </div>

                  {/* Task moved to In Progress */}
                  {step === 2 && (
                    <motion.div
                      className={styles.previewCard}
                      initial={{ opacity: 0, x: -20, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      style={{ borderLeft: '3px solid #2563eb' }}
                    >
                      <div>Deploy edge CDN next Friday</div>
                      <div style={{ fontSize: '0.65rem', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
                        ⚡ 1/2 subtasks ready
                      </div>
                      <div className={styles.progressBarTrack}>
                        <div className={styles.progressBarFill} style={{ width: '50%' }} />
                      </div>
                    </motion.div>
                  )}

                  <div className={styles.previewCard} style={{ borderLeft: '3px solid #2563eb' }}>
                    <div>Optimize Docker multi-stage build</div>
                    <div style={{ fontSize: '0.65rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                      ✓ 2/3 subtasks
                    </div>
                    <div className={styles.progressBarTrack}>
                      <div className={styles.progressBarFill} style={{ width: '66%' }} />
                    </div>
                  </div>

                  <div className={styles.previewCard}>
                    <div>Design onboarding checklist</div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>
                      👥 Product Design
                    </div>
                  </div>
                </div>

                {/* Column: Done */}
                <div className={styles.previewCol}>
                  <div className={styles.previewColTitle} style={{ color: '#059669' }}>
                    <span>● Done</span>
                    <span>{step === 3 ? 4 : 3}</span>
                  </div>

                  {/* Task completed in Done */}
                  {step === 3 && (
                    <motion.div
                      className={styles.previewCard}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{ background: '#f0fdf4', borderLeft: '3px solid #059669' }}
                    >
                      <div style={{ textDecoration: 'line-through', color: '#166534' }}>
                        Deploy edge CDN next Friday
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={11} /> Completed!
                      </div>
                    </motion.div>
                  )}

                  <div className={styles.previewCard} style={{ background: '#f0fdf4', borderLeft: '3px solid #059669' }}>
                    <div style={{ textDecoration: 'line-through', color: '#166534' }}>Set up Pomodoro focus timer</div>
                    <div style={{ fontSize: '0.62rem', color: '#059669', marginTop: '4px' }}>🎉 Confetti triggered!</div>
                  </div>

                  <div className={styles.previewCard} style={{ background: '#f0fdf4' }}>
                    <div style={{ textDecoration: 'line-through', color: '#166534' }}>Smart NLP task creation bar</div>
                    <div style={{ fontSize: '0.62rem', color: '#64748b', marginTop: '4px' }}>#nlp #ai</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
