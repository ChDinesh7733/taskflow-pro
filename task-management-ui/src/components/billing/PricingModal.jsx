import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, Sparkles, Shield, Zap, CreditCard,
  QrCode, AlertCircle, ArrowRight, Loader2, CheckCircle2, ChevronRight
} from 'lucide-react';
import { billingApi } from '../../api/billingApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import styles from './PricingModal.module.css';

export default function PricingModal({ isOpen, onClose, onPlanUpdated }) {
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  // Checkout flow state
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [provider, setProvider] = useState('STRIPE'); // STRIPE or RAZORPAY
  const [paymentMethod, setPaymentMethod] = useState('CARD'); // CARD or UPI
  const [processing, setProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  // Form mock inputs
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState(user?.displayName || 'Alex Rivera');
  const [upiId, setUpiId] = useState('taskflow.pro@okaxis');

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setSelectedPlan(null);
      setCheckoutSuccess(false);
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansData, subData] = await Promise.all([
        billingApi.getPlans(),
        billingApi.getSubscription()
      ]);
      setPlans(plansData);
      setSubscription(subData);
    } catch (err) {
      toast.error('Failed to load subscription info');
    } finally {
      setLoading(false);
    }
  };

  const handleStartCheckout = (plan) => {
    if (plan.id === currentTier) {
      toast('You are currently on this plan!', { icon: 'ℹ️' });
      return;
    }
    setSelectedPlan(plan);
    setCheckoutSuccess(false);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setProcessing(true);
    try {
      const updatedSub = await billingApi.checkout({
        planTier: selectedPlan.id,
        provider,
        paymentMethod: provider === 'RAZORPAY' ? 'UPI' : 'CARD'
      });

      setSubscription(updatedSub);
      setCheckoutSuccess(true);
      toast.success(`🎉 Upgraded to ${selectedPlan.name}!`);

      // Update auth context plan tier
      if (updateUser) {
        updateUser({ planTier: selectedPlan.id });
      }
      if (onPlanUpdated) {
        onPlanUpdated(selectedPlan.id);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Payment processing failed';
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSub = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription and revert to the Free Starter plan?')) {
      return;
    }

    try {
      setProcessing(true);
      const sub = await billingApi.cancelSubscription();
      setSubscription(sub);
      toast.success('Subscription cancelled. Reverted to Free plan.');
      if (updateUser) {
        updateUser({ planTier: 'FREE' });
      }
      if (onPlanUpdated) {
        onPlanUpdated('FREE');
      }
      loadData();
    } catch (err) {
      toast.error('Failed to cancel subscription');
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const currentTier = (subscription?.planTier || user?.planTier || 'FREE').toUpperCase();

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.badgeRow}>
              <span className={styles.categoryBadge}>
                <Sparkles size={13} />
                PLANS & BILLING
              </span>
              <span className={`${styles.currentTierPill} ${styles['tier_' + currentTier]}`}>
                CURRENT: {currentTier}
              </span>
            </div>
            <h2 className={styles.title}>Supercharge Your Productivity</h2>
            <p className={styles.subtitle}>
              Unlock automated AI planners, 2-way Google Calendar sync, and enterprise collaboration.
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.loaderWrap}>
              <Loader2 className={styles.spinner} size={32} />
              <p>Fetching billing data...</p>
            </div>
          ) : selectedPlan ? (
            /* Checkout View */
            <div className={styles.checkoutView}>
              <button
                className={styles.backBtn}
                onClick={() => setSelectedPlan(null)}
                disabled={processing}
              >
                ← Back to Plans
              </button>

              {checkoutSuccess ? (
                <div className={styles.successState}>
                  <CheckCircle2 size={56} className={styles.successIcon} />
                  <h3>Payment Successful!</h3>
                  <p>
                    You are now subscribed to <strong>{selectedPlan.name}</strong>.
                    All premium features, AI assistants, and developer webhooks are immediately unlocked.
                  </p>
                  <button className={styles.primaryBtn} onClick={onClose}>
                    Start Using {selectedPlan.name}
                  </button>
                </div>
              ) : (
                <div className={styles.checkoutGrid}>
                  {/* Order Summary */}
                  <div className={styles.orderSummary}>
                    <h4>Order Summary</h4>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryRow}>
                        <span>Plan</span>
                        <strong>{selectedPlan.name}</strong>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>Billing Cycle</span>
                        <span>Monthly Recurring</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span>Tax / GST</span>
                        <span>$0.00</span>
                      </div>
                      <div className={`${styles.summaryRow} ${styles.summaryTotal}`}>
                        <span>Total Due Today</span>
                        <strong>${selectedPlan.priceMonthly}.00 USD</strong>
                      </div>
                    </div>

                    <div className={styles.guaranteeBox}>
                      <Shield size={16} />
                      <span>Instant activation • Cancel anytime • 14-day refund policy</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <form className={styles.paymentForm} onSubmit={handleProcessPayment}>
                    <h4>Select Payment Method</h4>

                    <div className={styles.providerTabs}>
                      <button
                        type="button"
                        className={`${styles.providerTab} ${provider === 'STRIPE' ? styles.activeTab : ''}`}
                        onClick={() => { setProvider('STRIPE'); setPaymentMethod('CARD'); }}
                      >
                        <CreditCard size={16} />
                        <span>Stripe (Card)</span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.providerTab} ${provider === 'RAZORPAY' ? styles.activeTab : ''}`}
                        onClick={() => { setProvider('RAZORPAY'); setPaymentMethod('UPI'); }}
                      >
                        <QrCode size={16} />
                        <span>Razorpay (UPI / QR)</span>
                      </button>
                    </div>

                    {provider === 'STRIPE' ? (
                      <div className={styles.cardFields}>
                        <div className={styles.inputGroup}>
                          <label>Cardholder Name</label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            required
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Card Number</label>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            required
                          />
                        </div>
                        <div className={styles.rowInputs}>
                          <div className={styles.inputGroup}>
                            <label>Expires</label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              required
                            />
                          </div>
                          <div className={styles.inputGroup}>
                            <label>CVC / CVI</label>
                            <input
                              type="text"
                              value={cardCvc}
                              onChange={(e) => setCardCvc(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.upiFields}>
                        <div className={styles.upiMockQr}>
                          <div className={styles.qrPlaceholder}>
                            <QrCode size={72} />
                            <span>Scan with GPay, PhonePe, or Paytm</span>
                          </div>
                        </div>
                        <div className={styles.inputGroup}>
                          <label>Or Pay via Virtual Payment Address (UPI ID)</label>
                          <input
                            type="text"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={styles.payBtn}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader2 size={16} className={styles.spinner} />
                          Processing Transaction...
                        </>
                      ) : (
                        <>Pay ${selectedPlan.priceMonthly}.00 with {provider === 'STRIPE' ? 'Stripe' : 'Razorpay'}</>
                      )}
                    </button>
                    <p className={styles.secureNotice}>
                      🔒 256-bit SSL encrypted • Sandbox simulated payment processor
                    </p>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* Plans View */
            <div className={styles.plansContainer}>
              <div className={styles.planGrid}>
                {plans.map((plan) => {
                  const isCurrent = currentTier === plan.id;
                  const isPopular = plan.popular;

                  return (
                    <div
                      key={plan.id}
                      className={`${styles.planCard} ${isCurrent ? styles.activePlanCard : ''} ${isPopular ? styles.popularPlanCard : ''}`}
                    >
                      {isPopular && (
                        <div className={styles.popularBadge}>
                          <Sparkles size={11} /> MOST POPULAR
                        </div>
                      )}

                      <div className={styles.planHeader}>
                        <h3 className={styles.planName}>{plan.name}</h3>
                        <p className={styles.planDesc}>{plan.description}</p>
                        <div className={styles.priceRow}>
                          <span className={styles.currency}>$</span>
                          <span className={styles.amount}>{plan.priceMonthly}</span>
                          <span className={styles.period}>/ month</span>
                        </div>
                      </div>

                      <div className={styles.featureList}>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className={styles.featureItem}>
                            <Check size={14} className={styles.checkIcon} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>

                      <div className={styles.planFooter}>
                        {isCurrent ? (
                          <button className={styles.currentBtn} disabled>
                            Current Plan
                          </button>
                        ) : plan.id === 'FREE' ? (
                          <button
                            className={styles.downgradeBtn}
                            onClick={handleCancelSub}
                            disabled={processing}
                          >
                            Downgrade to Free
                          </button>
                        ) : (
                          <button
                            className={`${styles.upgradeBtn} ${isPopular ? styles.upgradeBtnHighlight : ''}`}
                            onClick={() => handleStartCheckout(plan)}
                          >
                            <span>Upgrade to {plan.name}</span>
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Paid Subscription Info */}
              {subscription && subscription.planTier !== 'FREE' && subscription.status === 'ACTIVE' && (
                <div className={styles.activeSubFooter}>
                  <div className={styles.activeSubText}>
                    <Shield size={16} className={styles.shieldIcon} />
                    <span>
                      Active <strong>{subscription.planTier}</strong> subscription via {subscription.provider} ({subscription.paymentMethod}).
                      Next renewal: <strong>{subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'Active'}</strong>.
                    </span>
                  </div>
                  <button
                    className={styles.cancelSubBtn}
                    onClick={handleCancelSub}
                    disabled={processing}
                  >
                    Cancel Subscription
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
