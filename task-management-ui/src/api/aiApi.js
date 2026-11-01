import axios from './axiosInstance';

export const aiApi = {
  breakdown: (goal) =>
    axios.post('/ai/breakdown', { goal }).then(r => r.data),

  /**
   * Smart Task Creation: NLP parse of free text into structured task fields.
   * @param {string} text - e.g. "Finish report by Friday 5pm, high priority, #finance"
   */
  parseSmartTask: (text) =>
    axios.post('/ai/parse-task', { text }).then(r => r.data),

  /**
   * Conversational chat with the AI assistant.
   * @param {string} message  - The latest user message
   * @param {Array}  history  - Prior turns [{role:'user'|'assistant', content:string}]
   * @param {string} [apiKey] - Optional custom Gemini API key
   */
  chat: (message, history = [], apiKey = null) => {
    const keyToUse = apiKey || localStorage.getItem('taskflow_gemini_api_key') || undefined;
    return axios.post('/ai/chat', { message, history, apiKey: keyToUse }).then(r => r.data.reply);
  },

  /**
   * Weekly AI Summary (what I finished, what slipped, what to focus on next).
   */
  getWeeklySummary: () =>
    axios.get('/ai/weekly-summary').then(r => r.data),

  /**
   * Trigger sending the Weekly AI summary to the user's email address.
   */
  sendWeeklySummaryEmail: () =>
    axios.post('/ai/weekly-summary/send-email').then(r => r.data),

  /**
   * AI Daily Planner: "Plan My Day" picks and orders top tasks with 1-line reasons.
   */
  planMyDay: () =>
    axios.post('/ai/daily-plan').then(r => r.data),

  /**
   * AI Duplicate Detection: Check if task title/description is duplicate/similar
   */
  checkDuplicate: (title, description = '') =>
    axios.post('/ai/check-duplicate', { title, description }).then(r => r.data),

  /**
   * AI Overdue Detection: Get suggestions and new deadlines for overdue tasks
   */
  getOverdueSuggestions: () =>
    axios.get('/ai/overdue-suggestions').then(r => r.data),
};
