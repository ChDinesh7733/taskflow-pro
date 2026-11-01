import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Target, Code2, Scale, Zap, Key, X, ArrowUp, RefreshCw } from 'lucide-react';
import { aiApi } from '../../api/aiApi';
import { useCreateTask } from '../../hooks/useTasks';
import { AiTaskReviewModal } from './AiTaskReviewModal';
import toast from 'react-hot-toast';
import styles from './AiAssistantPanel.module.css';

/* ── Extract actionable steps from text ── */
function extractActionItems(text) {
  if (!text) return [];
  const items = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const numMatch = line.match(/^\s*\d+[\.\)]\s+\*?\*?([^*\n]+)\*?\*?/);
    const bulletMatch = line.match(/^\s*[-*•]\s+\*?\*?([^*\n]+)\*?\*?/);
    if (numMatch && numMatch[1].length > 3) {
      const clean = numMatch[1].replace(/[:\-].*$/, '').replace(/^[#\s]+/, '').trim();
      if (clean && !items.includes(clean)) items.push(clean);
    } else if (bulletMatch && bulletMatch[1].length > 3) {
      const clean = bulletMatch[1].replace(/[:\-].*$/, '').replace(/^[#\s]+/, '').trim();
      if (clean && !items.includes(clean)) items.push(clean);
    }
  }
  return items.slice(0, 10);
}

/* ── Markdown & Link Formatter ── */
function renderMessage(text) {
  if (!text) return { __html: '' };

  // Step 1: Protect markdown links [label](url)
  const linkPlaceholders = [];
  let processed = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, label, url) => {
    const id = linkPlaceholders.length;
    linkPlaceholders.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
    return `\x00LINK${id}\x00`;
  });

  // Step 2: HTML-escape
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Step 3: Inline markdown formatting
  processed = processed
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  // Step 4: Restore protected links
  linkPlaceholders.forEach((html, id) => {
    processed = processed.replace(`\x00LINK${id}\x00`, html);
  });

  // Step 5: Convert bare URLs to clickable links
  processed = processed.replace(
    /(?<!href=")(?<![">])(https?:\/\/[^\s<>"]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Step 6: Lists & paragraph structure
  const lines = processed.split('\n');
  const result = [];
  let inList = false;
  let listType = '';

  for (const line of lines) {
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    const bulletMatch   = line.match(/^[-*•]\s+(.+)$/);

    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ol>');
        inList = true; listType = 'ol';
      }
      result.push(`<li>${numberedMatch[2]}</li>`);
    } else if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(`</${listType}>`);
        result.push('<ul>');
        inList = true; listType = 'ul';
      }
      result.push(`<li>${bulletMatch[1]}</li>`);
    } else {
      if (inList) { result.push(`</${listType}>`); inList = false; listType = ''; }
      result.push(line === '' ? '<br/>' : line + '<br/>');
    }
  }
  if (inList) result.push(`</${listType}>`);

  return { __html: result.join('') };
}

/* ── Typing Dots Indicator ── */
function TypingDots() {
  return (
    <div className={styles.typingWrap}>
      <span className={styles.typingDot} style={{ animationDelay: '0ms' }} />
      <span className={styles.typingDot} style={{ animationDelay: '150ms' }} />
      <span className={styles.typingDot} style={{ animationDelay: '300ms' }} />
    </div>
  );
}

/* ── Starter Prompts (from exact reference screenshot) ── */
const STARTER_PROMPTS = [
  {
    icon: Target,
    title: 'Break Down Goal',
    color: '#38bdf8',
    prompt: 'Break down this goal into actionable tasks: Launch a SaaS full-stack web application in 4 weeks.',
  },
  {
    icon: Code2,
    title: 'Technical Guidance',
    color: '#818cf8',
    prompt: 'What are the best practices for handling optimistic UI updates and cache invalidation in React?',
  },
  {
    icon: Scale,
    title: 'Compare & Recommend',
    color: '#a78bfa',
    prompt: 'Recommend the top 3 modern database choices for a high-concurrency task management system.',
  },
  {
    icon: Sparkles,
    title: 'Productivity Strategy',
    color: '#f59e0b',
    prompt: 'How do I prioritize urgent vs important tasks using the Eisenhower Matrix and timeboxing?',
  },
];

/* ── Main Component ── */
export function AiAssistantPanel({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem('taskflow_gemini_api_key') || '');
  const [hasCustomKey, setHasCustomKey] = useState(() => Boolean(localStorage.getItem('taskflow_gemini_api_key')));
  const [reviewTasks, setReviewTasks] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const createTaskMutation = useCreateTask();

  const handleSaveReviewedTasks = async (tasksToCreate) => {
    let created = 0;
    for (const t of tasksToCreate) {
      try {
        await createTaskMutation.mutateAsync(t);
        created++;
      } catch {}
    }
    toast.success(`Created ${created} task${created !== 1 ? 's' : ''} in your workspace! 🎉`);
    setShowReviewModal(false);
  };

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (showKeyModal) setShowKeyModal(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showKeyModal]);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed) {
      localStorage.setItem('taskflow_gemini_api_key', trimmed);
      setHasCustomKey(true);
    } else {
      localStorage.removeItem('taskflow_gemini_api_key');
      setHasCustomKey(false);
    }
    setShowKeyModal(false);
  };

  const handleSendMessage = useCallback(async (textToSend) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setLoading(true);

    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Build conversation history for API
    const history = nextMessages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    try {
      const customKey = localStorage.getItem('taskflow_gemini_api_key');
      const reply = await aiApi.chat(text, history, customKey);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e) {
      if (e.response?.status === 429) {
        setError('Rate limit reached (10 requests per hour). Please wait or use a custom API key.');
      } else {
        setError('Could not reach the AI service. Please check your connection or API key and retry.');
      }
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const retryLast = () => {
    setError('');
    const msgs = [...messages];
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx !== -1) {
      const lastUserText = msgs[lastUserIdx].content;
      setMessages(msgs.slice(0, lastUserIdx));
      handleSendMessage(lastUserText);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.brandIcon}>
              <Zap size={16} color="#ffffff" strokeWidth={2.5} />
            </div>
            <h2 className={styles.title}>TaskFlow AI Assistant</h2>
            <span className={styles.coreBadge}>AI CORE</span>
          </div>

          <div className={styles.headerRight}>
            <button
              className={`${styles.keyBtn} ${hasCustomKey ? styles.keyBtnActive : ''}`}
              onClick={() => setShowKeyModal(v => !v)}
              title="Configure custom Gemini API key"
            >
              <Key size={13} />
              <span>{hasCustomKey ? 'Key Configured' : 'Set API Key'}</span>
            </button>
            {messages.length > 0 && (
              <button
                className={styles.resetBtn}
                onClick={() => { setMessages([]); setError(''); }}
                title="New conversation"
              >
                <RefreshCw size={13} />
                <span>New Chat</span>
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose} aria-label="Close dialog">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── API Key Banner / Config ── */}
        {showKeyModal && (
          <div className={styles.keyDrawer}>
            <div className={styles.keyDrawerInner}>
              <p className={styles.keyDrawerTitle}>Custom Gemini API Key</p>
              <p className={styles.keyDrawerSub}>
                Provide your own Gemini API key for unlimited AI queries without server rate limits.
              </p>
              <div className={styles.keyInputRow}>
                <input
                  type="password"
                  className={styles.keyInput}
                  placeholder="AIzaSy..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                />
                <button className={styles.saveKeyBtn} onClick={handleSaveApiKey}>
                  Save
                </button>
                {hasCustomKey && (
                  <button
                    className={styles.clearKeyBtn}
                    onClick={() => {
                      setApiKeyInput('');
                      localStorage.removeItem('taskflow_gemini_api_key');
                      setHasCustomKey(false);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Content Area ── */}
        <div className={styles.body}>
          {messages.length === 0 ? (
            /* ── Welcome Screen (Matches exact photo) ── */
            <div className={styles.welcomeHero}>
              <div className={styles.sparkleIconWrap}>
                <Sparkles size={36} className={styles.sparkleIcon} />
              </div>

              <h3 className={styles.heroHeading}>How can I help you today?</h3>
              <p className={styles.heroSubtitle}>
                I can break down complex goals into tasks, answer technical questions with
                code, perform research with reliable links, or guide your project strategy.
              </p>

              {/* 4 Cards Grid */}
              <div className={styles.gridCards}>
                {STARTER_PROMPTS.map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={idx}
                      className={styles.cardItem}
                      onClick={() => handleSendMessage(card.prompt)}
                    >
                      <div className={styles.cardHeader}>
                        <Icon size={15} style={{ color: card.color }} />
                        <span className={styles.cardTitle}>{card.title}</span>
                      </div>
                      <p className={styles.cardPrompt}>{card.prompt}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Conversation Thread ── */
            <div className={styles.messagesList}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.messageRow} ${msg.role === 'user' ? styles.userRow : styles.aiRow}`}
                >
                  {msg.role === 'assistant' && (
                    <div className={styles.aiAvatar}>
                      <Zap size={14} color="#ffffff" />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div
                      className={styles.messageBubble}
                      dangerouslySetInnerHTML={renderMessage(msg.content)}
                    />
                    {msg.role === 'assistant' && extractActionItems(msg.content).length > 0 && (
                      <button
                        type="button"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          marginTop: '0.45rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: '#e0e7ff',
                          color: '#4338ca',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '0.3rem 0.65rem',
                          cursor: 'pointer',
                          width: 'fit-content'
                        }}
                        onClick={() => {
                          setReviewTasks(extractActionItems(msg.content));
                          setShowReviewModal(true);
                        }}
                      >
                        <Sparkles size={12} /> Review & Save as Tasks ({extractActionItems(msg.content).length})
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className={`${styles.messageRow} ${styles.aiRow}`}>
                  <div className={styles.aiAvatar}>
                    <Zap size={14} color="#ffffff" />
                  </div>
                  <TypingDots />
                </div>
              )}

              {error && (
                <div className={styles.errorBox}>
                  <span>⚠️ {error}</span>
                  <button className={styles.retryBtn} onClick={retryLast}>
                    Retry
                  </button>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Input Box & Footer (Matches exact photo) ── */}
        <div className={styles.footerWrap}>
          <div className={styles.inputContainer}>
            <textarea
              ref={inputRef}
              className={styles.inputArea}
              rows={1}
              placeholder="Ask anything (technical doubts, planning, goal breakdown, recommendations)..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <button
              className={styles.sendButton}
              onClick={() => handleSendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <ArrowUp size={16} strokeWidth={2.6} />
            </button>
          </div>

          <div className={styles.tipsRow}>
            <span>ProTip: Press <strong>Enter ↵</strong> to send, <strong>Shift + Enter</strong> for new lines</span>
            <span>Multi-turn context preserved</span>
          </div>
        </div>

        {/* ── Review & Edit AI Generated Tasks Modal ── */}
        {showReviewModal && (
          <AiTaskReviewModal
            initialTasks={reviewTasks}
            onSave={handleSaveReviewedTasks}
            onClose={() => setShowReviewModal(false)}
          />
        )}
      </div>
    </div>
  );
}

export default AiAssistantPanel;
