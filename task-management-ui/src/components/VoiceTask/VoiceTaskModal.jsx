import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, X, Sparkles, ArrowRight, AlertCircle, Info, Volume2
} from 'lucide-react';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';
import toast from 'react-hot-toast';
import styles from './VoiceTaskModal.module.css';

export default function VoiceTaskModal({ isOpen, onClose, onTranscriptReady }) {
  const {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Auto-start listening when modal opens
  useEffect(() => {
    if (isOpen) {
      resetTranscript();
      if (isSupported) {
        startListening();
      }
    } else {
      stopListening();
    }
  }, [isOpen, isSupported]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSpeech = (transcript + ' ' + interimTranscript).trim();

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleFinish = () => {
    stopListening();
    if (!currentSpeech) {
      toast('No speech was detected. Please say your task aloud.', { icon: '🎙️' });
      return;
    }
    onClose();
    if (onTranscriptReady) {
      onTranscriptReady(currentSpeech);
    }
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
              <Mic size={16} color="#e11d48" />
              <span>Voice Task Input (Speech-to-Task)</span>
            </div>
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close voice modal">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {!isSupported ? (
              <div className={styles.fallbackBox}>
                <AlertCircle size={24} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>
                    Web Speech API Unsupported
                  </div>
                  <div>
                    Voice recognition is not supported in this browser. Please open TaskFlow in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, or use our Smart Task input bar.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Big Mic Button with Pulsing Rings */}
                <div className={styles.micWrapper}>
                  {isListening && <div className={styles.pulseRing} />}
                  <button
                    className={`${styles.micBtn} ${!isListening ? styles.micBtnIdle : ''}`}
                    onClick={handleToggleListening}
                    title={isListening ? 'Click to stop listening' : 'Click to start speaking'}
                    aria-label="Toggle voice recording"
                  >
                    {isListening ? <Mic size={36} /> : <MicOff size={36} />}
                  </button>
                </div>

                {/* Animated Sound Wave Bars when listening */}
                {isListening ? (
                  <div className={styles.wavesBar}>
                    {[0.2, 0.5, 0.8, 0.3, 0.7, 1.0, 0.4, 0.6, 0.9, 0.5, 0.3, 0.8].map((delay, idx) => (
                      <span
                        key={idx}
                        className={styles.wave}
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Click the microphone to start speaking
                  </div>
                )}

                {/* Live Transcript Display Box */}
                <div className={`${styles.transcriptBox} ${isListening ? styles.transcriptBoxActive : ''}`}>
                  {currentSpeech ? (
                    <div>
                      <span>{transcript}</span>
                      {interimTranscript && (
                        <span className={styles.interimText}> {interimTranscript}</span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.placeholderText}>
                      {isListening
                        ? 'Listening… say something like "Deploy release next Tuesday 4pm, high priority #prod"'
                        : 'Your transcribed speech will appear here…'}
                    </span>
                  )}
                </div>

                {error && <p className={styles.errorText}>⚠ {error}</p>}
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className={styles.footer}>
            <button className={styles.btn} onClick={onClose}>
              Cancel
            </button>

            {isSupported && (
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleFinish}
                disabled={!currentSpeech}
              >
                <Sparkles size={14} />
                <span>Parse with AI</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
