import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Lightbulb, Mic } from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import SmartTaskPreviewModal from './SmartTaskPreviewModal';
import VoiceTaskModal from '../VoiceTask/VoiceTaskModal';
import toast from 'react-hot-toast';
import styles from './SmartTaskBar.module.css';

const EXAMPLES = [
  "Finish quarterly report by Friday, high priority #finance",
  "Review client feedback tomorrow, #design",
  "Deploy staging release next Monday, urgent #devops"
];

export default function SmartTaskBar() {
  const [inputText, setInputText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);

  const executeParse = async (queryText) => {
    const query = queryText.trim();
    if (!query) {
      toast('Please enter a task description to parse', { icon: '✍️' });
      return;
    }

    setParsing(true);
    const toastId = toast.loading('AI is parsing task details…');
    try {
      const data = await aiApi.parseSmartTask(query);
      toast.success('Task details parsed! Review before saving.', { id: toastId });
      setParsedData(data);
      setModalOpen(true);
      setInputText('');
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Failed to parse task with AI';
      toast.error(errMsg, { id: toastId });
    } finally {
      setParsing(false);
    }
  };

  const handleParse = (e) => {
    if (e) e.preventDefault();
    executeParse(inputText);
  };

  const handleVoiceResult = (speechText) => {
    if (speechText) {
      setInputText(speechText);
      executeParse(speechText);
    }
  };

  return (
    <div className={styles.container}>
      <form onSubmit={handleParse} className={styles.barForm}>
        <div className={styles.inputWrap}>
          <div className={styles.iconWrap}>
            <Sparkles size={16} className={styles.sparkleIcon} />
          </div>
          <input
            type="text"
            className={styles.input}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="⚡ Smart Task Creation: Type naturally, e.g. 'Submit project budget by Friday 5pm, urgent #finance'..."
            disabled={parsing}
          />
          <button
            type="button"
            className={styles.voiceMicBtn}
            onClick={() => setVoiceModalOpen(true)}
            title="Voice Task Input: Speak to create a task"
            aria-label="Voice input"
          >
            <Mic size={16} />
          </button>
          <button
            type="submit"
            className={styles.parseBtn}
            disabled={parsing || !inputText.trim()}
          >
            {parsing ? (
              <>
                <Loader2 size={14} className={styles.spin} />
                <span>Parsing…</span>
              </>
            ) : (
              <>
                <span>AI Parse</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestion / Example chips */}
      <div className={styles.examplesRow}>
        <span className={styles.examplesLabel}>
          <Lightbulb size={12} /> Try asking:
        </span>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            type="button"
            className={styles.exampleChip}
            onClick={() => setInputText(ex)}
            title="Click to try this natural language prompt"
          >
            "{ex}"
          </button>
        ))}
      </div>

      {/* Review & Edit Preview Modal */}
      <SmartTaskPreviewModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        parsedData={parsedData}
      />

      {/* Voice Speech-to-Task Input Modal */}
      <VoiceTaskModal
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onTranscriptReady={handleVoiceResult}
      />
    </div>
  );
}
