import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Sparkles, Rocket, ArrowRight, CheckCircle2, LayoutGrid, Timer,
  TrendingUp, Shield, Database, Cpu, Layers, Code2, ExternalLink, Activity,
  ChevronRight, Play, BarChart3, Film
} from 'lucide-react';
import FeatureTourModal from './FeatureTourModal';
import CinematicReelModal from '../CinematicReel/CinematicReelModal';
import InteractiveProductPreview from './InteractiveProductPreview';
import {
  FadeUp,
  StaggerContainer,
  GradientText,
  SpotlightCard,
  CountUp,
  SectionDivider,
} from '../motion/MotionPrimitives';
import { EASING, DURATION, blurFadeUp } from '../../animations/motionConfig';
import styles from './LandingPage.module.css';

export default function LandingPage({ onOpenAuth, onLaunchDemo, demoLoading = false }) {
  const [showTour, setShowTour] = useState(false);
  const [showCinemaReel, setShowCinemaReel] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  // Scroll listener for navbar blur & border past 20px
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.landingWrap}>
      <div className={styles.ambientGlow1} />

      {/* Navbar - Linear.app style translucent blur on scroll */}
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: DURATION.base, ease: EASING.linear }}
        className={`${styles.nav} ${isScrolled ? styles.navScrolled : ''}`}
      >
        <a href="#hero" className={styles.brand}>
          <div className={styles.brandIcon}>
            <Zap size={18} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span className={styles.brandName}>TaskFlow</span>
          <span className={styles.brandBadge}>Pro v2.4</span>
        </a>

        <nav className={styles.navLinks}>
          <motion.a whileHover={{ y: -1 }} href="#features" className={styles.navLink}>
            Features
          </motion.a>
          <motion.span whileHover={{ y: -1 }} className={styles.navLink} onClick={() => setShowTour(true)}>
            Interactive Tour
          </motion.span>
          <motion.span
            whileHover={{ y: -1 }}
            className={styles.navLink}
            onClick={() => setShowCinemaReel(true)}
            style={{ color: '#c084fc', fontWeight: 600 }}
          >
            🎬 Keynote Film
          </motion.span>
          <motion.a whileHover={{ y: -1 }} href="#pricing" className={styles.navLink}>
            Pricing
          </motion.a>
          <motion.a
            whileHover={{ y: -1 }}
            href="/swagger-ui/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
          >
            Swagger API
          </motion.a>
        </nav>

        <div className={styles.navRight}>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={styles.signInBtn}
            onClick={() => onOpenAuth('login')}
          >
            Sign In
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={styles.demoBtn}
            onClick={onLaunchDemo}
            disabled={demoLoading}
            title="1-click live demo with pre-seeded data"
          >
            <Rocket size={14} />
            <span>{demoLoading ? 'Seeding Demo…' : 'Try Live Demo'}</span>
          </motion.button>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section id="hero" className={styles.hero}>
        {/* Subtle animated floating dot matrix overlay */}
        <div className={styles.heroDotGrid} aria-hidden="true" />

        {/* 1. Staggered Eyebrow Badge */}
        <motion.div
          className={styles.eyebrow}
          initial={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.5, ease: EASING.linear }}
        >
          <Sparkles size={14} color="#7c3aed" />
          <span>Next-Generation AI Task Management • Unified Single Link Architecture</span>
        </motion.div>

        {/* 2. Headline with Looping Gradient Text */}
        <motion.h1
          className={styles.heroHeading}
          initial={{ opacity: 0, y: 22, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: 0.1, ease: EASING.linear }}
        >
          Turn Chaos into Focus with <br />
          <GradientText>AI-Native Task Velocity</GradientText>
        </motion.h1>

        {/* 3. Subtext */}
        <motion.p
          className={styles.heroSub}
          initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASING.linear }}
        >
          Capture tasks in natural language, glide through drag-and-drop Kanban sprints,
          maintain deep work with Pomodoro focus streaks, and receive automated executive AI retrospectives every week.
        </motion.p>

        {/* 4. Action Buttons with Shine Sweep & Pulsing Play */}
        <motion.div
          className={styles.heroCtas}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASING.linear }}
        >
          <button
            className={styles.primaryCta}
            onClick={onLaunchDemo}
            disabled={demoLoading}
          >
            <Rocket size={18} />
            <span>{demoLoading ? 'Setting up Live Demo…' : 'Launch Live Demo Account'}</span>
            <ArrowRight size={16} />
          </button>

          <button
            className={styles.secondaryCta}
            onClick={() => setShowCinemaReel(true)}
            style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.18) 100%)',
              borderColor: 'rgba(168, 85, 247, 0.45)',
              color: '#c084fc',
              fontWeight: 700
            }}
          >
            <Play size={16} fill="#c084fc" className={styles.pulsingPlayIcon} />
            <span>Watch Keynote Film (8K)</span>
          </button>

          <button className={styles.secondaryCta} onClick={() => setShowTour(true)}>
            <Sparkles size={16} color="#475569" />
            <span>Take Feature Tour</span>
          </button>
        </motion.div>

        {/* 5. Linear.app Interactive 3D Scroll-Linked Product Preview */}
        <InteractiveProductPreview />
      </section>

      {/* Expanding Section Divider */}
      <SectionDivider />

      {/* Features Section */}
      <section id="features" className={styles.featuresSection}>
        <FadeUp className={styles.sectionHeader}>
          <span className={styles.eyebrow} style={{ marginBottom: '0.75rem' }}>Engineered for Deep Work</span>
          <h2 className={styles.sectionHeading}>Everything You Need to Ship with Confidence</h2>
          <p className={styles.sectionSub}>Built with Spring Boot 3, MySQL 8, React 18, and Gemini AI. Zero clutter, pure focus.</p>
        </FadeUp>

        <StaggerContainer stagger={0.08} className={styles.featuresGrid}>
          {/* Card 1 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(99, 102, 241, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#e0e7ff', color: '#4338ca' }}
            >
              <Sparkles size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Natural Language Smart Tasks</h3>
            <p className={styles.featureDesc}>
              Stop manually configuring five separate form dropdowns. Type sentences like "Review PR by 4pm tomorrow, high priority #backend" and let AI extract every attribute with an editable preview.
            </p>
          </SpotlightCard>

          {/* Card 2 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(2, 132, 199, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#e0f2fe', color: '#0284c7' }}
            >
              <LayoutGrid size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Fluid Kanban & Board Views</h3>
            <p className={styles.featureDesc}>
              Full drag-and-drop workflow across To Do, In Progress, In Review, and Done. Instant optimistic updates, quick advance actions, and real-time multi-tab synchronization via WebSockets.
            </p>
          </SpotlightCard>

          {/* Card 3 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(219, 39, 119, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#fce7f3', color: '#db2777' }}
            >
              <Timer size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Pomodoro Focus & Streaks</h3>
            <p className={styles.featureDesc}>
              Attach a 25-minute focus session directly to any task. Completed sessions auto-save to backend telemetry, maintain daily consecutive streaks (🔥), and trigger confetti celebrations.
            </p>
          </SpotlightCard>

          {/* Card 4 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(124, 58, 237, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#ede9fe', color: '#7c3aed' }}
            >
              <TrendingUp size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Weekly AI Executive Digest</h3>
            <p className={styles.featureDesc}>
              Automatic Monday 9:00 AM retrospectives breaking down what you shipped, what slipped, and recommended focus targets for next week with automated email digest delivery.
            </p>
          </SpotlightCard>

          {/* Card 5 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(217, 119, 6, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#fef3c7', color: '#d97706' }}
            >
              <Database size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Persistent File Storage & Exports</h3>
            <p className={styles.featureDesc}>
              Export your workspace to CSV/PDF, upload and archive documentation files directly into backend storage, and run automated task breakdown goals with AI subtask suggestions.
            </p>
          </SpotlightCard>

          {/* Card 6 */}
          <SpotlightCard className={styles.featureCard} spotlightColor="rgba(21, 128, 61, 0.14)">
            <motion.div
              className={styles.featureIcon}
              whileHover={{ scale: 1.15, rotate: 6 }}
              transition={{ type: 'spring', stiffness: 320, damping: 18 }}
              style={{ background: '#dcfce7', color: '#15803d' }}
            >
              <Shield size={22} />
            </motion.div>
            <h3 className={styles.featureTitle}>Enterprise-Grade Reliability</h3>
            <p className={styles.featureDesc}>
              Powered by Spring Boot 3, Flyway schema migrations, BCrypt salted password hashing, stateless JWT refresh tokens, rate limiting, and full Swagger/OpenAPI documentation.
            </p>
          </SpotlightCard>
        </StaggerContainer>
      </section>

      {/* Expanding Section Divider */}
      <SectionDivider />

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricingSection}>
        <FadeUp className={styles.sectionHeader}>
          <span className={styles.eyebrow} style={{ marginBottom: '0.75rem' }}>Transparent Pricing</span>
          <h2 className={styles.sectionHeading}>Pick the Plan that Powers Your Sprint</h2>
          <p className={styles.sectionSub}>All plans include full access to the core workspace, keyboard navigation, and Kanban board.</p>
        </FadeUp>

        {/* Linear-style Billing Toggle */}
        <div className={styles.billingToggleWrap}>
          <div className={styles.billingToggle} role="radiogroup" aria-label="Billing frequency">
            <button
              type="button"
              className={`${styles.billingTab} ${!isAnnual ? styles.billingTabActive : ''}`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`${styles.billingTab} ${isAnnual ? styles.billingTabActive : ''}`}
              onClick={() => setIsAnnual(true)}
            >
              Annual Billing
              <span className={styles.discountBadge}>Save 20%</span>
            </button>
            <div
              className={styles.togglePill}
              style={{
                left: isAnnual ? '50%' : '4px',
                width: isAnnual ? 'calc(50% - 4px)' : 'calc(50% - 4px)'
              }}
            />
          </div>
        </div>

        <StaggerContainer stagger={0.1} className={styles.pricingGrid}>
          {/* Free Tier */}
          <div className={styles.priceCard}>
            <h3 className={styles.pricePlanName}>Starter Free</h3>
            <div className={styles.priceAmount}>
              $0 <span className={styles.pricePeriod}>/ forever</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>For individuals wanting a clean, focused task manager.</p>
            <ul className={styles.priceFeatureList}>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Unlimited personal tasks</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Kanban & List board views</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Global Ctrl+K command palette</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Basic Pomodoro timer</li>
            </ul>
            <button className={styles.priceBtn} onClick={() => onOpenAuth('register')}>
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Featured with Rotating Border Glow) */}
          <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
            <span className={styles.priceBadge}>Most Popular</span>
            <h3 className={styles.pricePlanName}>TaskFlow Pro</h3>
            <div className={styles.priceAmount}>
              <CountUp to={isAnnual ? 10 : 12} duration={400} prefix="$" />
              <span className={styles.pricePeriod}>/ user / mo</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>For power users and high-velocity professionals.</p>
            <ul className={styles.priceFeatureList}>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> Everything in Starter</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> Natural Language Smart Task AI</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> Pomodoro auto-logging & streak tracking</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> Weekly AI executive performance digest</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> Automated Monday email reports</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#4f46e5" /> File storage (CSV & PDF archive)</li>
            </ul>
            <button className={`${styles.priceBtn} ${styles.priceBtnPrimary}`} onClick={onLaunchDemo}>
              Try Pro Live in Demo
            </button>
          </div>

          {/* Team Tier */}
          <div className={styles.priceCard}>
            <h3 className={styles.pricePlanName}>Team</h3>
            <div className={styles.priceAmount}>
              <CountUp to={isAnnual ? 24 : 29} duration={400} prefix="$" />
              <span className={styles.pricePeriod}>/ user / mo</span>
            </div>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>For fast-shipping teams and engineering departments.</p>
            <ul className={styles.priceFeatureList}>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Everything in Pro</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Multi-member workspaces & assignees</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Real-time team presence & cursors</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Audit trail activity history</li>
              <li className={styles.priceFeatureItem}><CheckCircle2 size={16} color="#10b981" /> Priority Gemini AI quotas</li>
            </ul>
            <button className={styles.priceBtn} onClick={() => onOpenAuth('register')}>
              Contact Sales
            </button>
          </div>
        </StaggerContainer>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div>
          <span style={{ fontWeight: 700, color: '#0f172a' }}>TaskFlow - Pro Edition</span> © {new Date().getFullYear()}. All rights reserved.
        </div>
        <div className={styles.footerLinks}>
          <a href="/swagger-ui/index.html" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            <Code2 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Swagger API Docs
          </a>
          <a href="/actuator/health" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            <Activity size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Actuator Health Probe
          </a>
          <a href="/actuator/prometheus" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>
            <BarChart3 size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Prometheus Metrics
          </a>
          <span className={styles.footerLink} onClick={() => setShowTour(true)} style={{ cursor: 'pointer' }}>
            Feature Tour
          </span>
          <span className={styles.footerLink} onClick={onLaunchDemo} style={{ cursor: 'pointer', color: '#4f46e5', fontWeight: 600 }}>
            Launch Demo
          </span>
        </div>
      </footer>

      {/* Interactive Feature Tour Modal */}
      <FeatureTourModal
        isOpen={showTour}
        onClose={() => setShowTour(false)}
        onLaunchDemo={onLaunchDemo}
      />

      {/* Cinematic Commercial Keynote Reel Modal */}
      <CinematicReelModal
        isOpen={showCinemaReel}
        onClose={() => setShowCinemaReel(false)}
      />
    </div>
  );
}