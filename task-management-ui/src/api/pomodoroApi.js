import api from './axiosInstance';

export const pomodoroApi = {
  /* POST /api/pomodoro/log */
  logSession: async ({ taskId, durationMinutes, sessionType = 'WORK', interrupted = false }) => {
    const { data } = await api.post('/pomodoro/log', {
      taskId,
      durationMinutes,
      sessionType,
      interrupted,
    });
    return data;
  },

  /* GET /api/pomodoro/stats */
  getStats: async () => {
    const { data } = await api.get('/pomodoro/stats');
    return data;
  },

  /* GET /api/pomodoro/recent */
  getRecent: async () => {
    const { data } = await api.get('/pomodoro/recent');
    return data;
  },
};

export default pomodoroApi;
