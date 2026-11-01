import axios from 'axios';

/* ─────────────────────────────────────────────────────────────────────────
   Base URL resolution:
   - In dev:  Vite proxy rewrites /api → http://localhost:8081/api
   - In prod: VITE_API_URL = https://your-render-url.onrender.com
              so baseURL becomes https://your-render-url.onrender.com/api
─────────────────────────────────────────────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';   // fallback → Vite proxy handles it in local dev

const KEYS = { access: 'tf_access', refresh: 'tf_refresh' };

export const tokenStore = {
  getAccess:   () => localStorage.getItem(KEYS.access),
  getRefresh:  () => localStorage.getItem(KEYS.refresh),
  setTokens:   (access, refresh) => {
    localStorage.setItem(KEYS.access, access);
    if (refresh) localStorage.setItem(KEYS.refresh, refresh);
  },
  clearTokens: () => {
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
  },
};

/* ── Axios instance ──────────────────────────────────────────────────────── */
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,   // 60s — accounts for Render cold-start wakeup
});

/* ── Request: attach Bearer token ─────────────────────────────────────────── */
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

/* ── Response: silent refresh on 401, then retry original request ─────────── */
let isRefreshing = false;
let pendingQueue = [];

const drainQueue = (error, token) => {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  pendingQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const is401    = error.response?.status === 401;
    const isRetry  = original._retry;
    const isAuth   = original.url?.startsWith('/auth/');

    if (is401 && !isRetry && !isAuth) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;

      try {
        const rt = tokenStore.getRefresh();
        if (!rt) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken: rt });
        const newAccess  = data.accessToken;
        const newRefresh = data.refreshToken;

        tokenStore.setTokens(newAccess, newRefresh);
        api.defaults.headers['Authorization'] = `Bearer ${newAccess}`;
        drainQueue(null, newAccess);

        original.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        drainQueue(refreshError, null);
        tokenStore.clearTokens();
        window.dispatchEvent(new CustomEvent('tf:session-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error   ||
      error.message ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default api;
