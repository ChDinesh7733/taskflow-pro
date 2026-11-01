import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sparkles, LayoutGrid, Timer, TrendingUp, Check, ChevronRight, ChevronLeft, Rocket
} from 'lucide-react';
import styles from './FeatureTourModal.module.css';

const TOUR_SLIDES = [
  {
    icon: Sparkles,
    badge: 'Step 1 of 4: Smart Task Capture',
    title: 'Natural Language Smart Task NLP',
    desc: 'Never waste time filling out 6 separate form inputs. Type or paste your stream of thought and let AI automatically extract the title, priority, due date, and tags.',
    points: [
      'Type "Finish audit by Friday 5pm, urgent priority, #security"',
      'Real-time date parsing converts natural terms into ISO calendar dates',
      'Instant editable preview modal allows review before saving to database',
    ],
  },
  {
    icon: LayoutGrid,
    badge: 'Step 2 of 4: Fluid Kanban & Sprints',
    title: 'Drag-and-Drop Kanban Boards',
    desc: 'Visualize team workflow across To Do, In Progress, In Review, and Done. Drag cards between status columns with instantaneous WebSocket broadcast to all connected devices.',
    points: [
      'Seamless multi-column drag and drop with keyboard fallbacks',
      '1-click quick advance actions directly on task cards',
      'Global Ctrl+K Command Palette to search, create, and filter from anywhere',
    ],
  },
  {
    icon: Timer,
    badge: 'Step 3 of 4: Deep Focus & Gamification',
    title: 'Pomodoro Focus Timer & Streaks',
    desc: 'Block out distractions with an integrated Pomodoro timer directly attached to your active tasks. Sessions automatically record to your backend telemetry.',
    points: [
      '25-minute focus intervals, 5-minute short breaks, 15-minute long breaks',
      'Daily consecutive streaks (🔥) computed dynamically across active days',
      'Full-screen confetti particle celebration and audio chime upon completion',
    ],
  },
  {
    icon: TrendingUp,
    badge: 'Step 4 of 4: Automated Intelligence',
    title: 'Weekly AI Performance Digests',
    desc: 'Every week, your AI executive coach synthesizes your completed milestones, flags slipped deadlines, and outlines the highest-impact backlog targets for next week.',
    points: [
      'Categorized breakdowns: What I Finished, What Slipped, What to Focus On Next',
      '1-click instant email digest delivery and clipboard markdown export',
      'Automated background scheduled cron job every Monday morning at 9:00 AM',
    ],
  },
];

export default function FeatureTourModal({ isOpen, onClose, onLaunchDemo }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const slide = TOUR_SLIDES[currentStep];
  const Icon = slide.icon;
  const isLast = currentStep === TOUR_SLIDES.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
      if (onLaunchDemo) onLaunchDemo();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <Sparkles size={16} color="#4f46e5" />
              <span>Interactive Product Tour</span>
              <span className={styles.stepPill}>{slide.badge}</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close tour">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            <div className={styles.slideIllustration}>
              <div className={styles.slideIconWrap}>
                <Icon size={28} />
              </div>
              <h3 className={styles.slideTitle}>{slide.title}</h3>
              <p className={styles.slideDesc}>{slide.desc}</p>
            </div>

            <ul className={styles.featurePoints}>
              {slide.points.map((pt, i) => (
                <li key={i} className={styles.featurePointItem}>
                  <Check size={14} color="#10b981" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer Navigation */}
          <div className={styles.footer}>
            <div className={styles.dots}>
              {TOUR_SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.dot} ${i === currentStep ? styles.dotActive : ''}`}
                  onClick={() => setCurrentStep(i)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>

            <div className={styles.navBtns}>
              {currentStep > 0 && (
                <button className={styles.btn} onClick={handlePrev}>
                  <ChevronLeft size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Back
                </button>
              )}
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleNext}>
                {isLast ? (
                  <>
                    <span>Try Live Demo</span>
                    <Rocket size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight size={14} style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 4 }} />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
