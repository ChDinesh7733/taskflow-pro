import api from './axiosInstance';

export const productivityApi = {
  /* ─── TEMPLATES ─── */
  getTemplates: async () => {
    const { data } = await api.get('/productivity/templates');
    return data;
  },

  createTemplate: async (payload) => {
    const { data } = await api.post('/productivity/templates', payload);
    return data;
  },

  applyTemplate: async (id, categoryId) => {
    const params = categoryId ? { categoryId } : {};
    const { data } = await api.post(`/productivity/templates/${id}/apply`, null, { params });
    return data;
  },

  deleteTemplate: async (id) => {
    await api.delete(`/productivity/templates/${id}`);
  },

  /* ─── HABITS ─── */
  getHabits: async () => {
    const { data } = await api.get('/productivity/habits');
    return data;
  },

  createHabit: async (payload) => {
    const { data } = await api.post('/productivity/habits', payload);
    return data;
  },

  toggleCheckHabit: async (id) => {
    const { data } = await api.patch(`/productivity/habits/${id}/check`);
    return data;
  },

  deleteHabit: async (id) => {
    await api.delete(`/productivity/habits/${id}`);
  },

  /* ─── GOALS / OKRs ─── */
  getGoals: async () => {
    const { data } = await api.get('/productivity/goals');
    return data;
  },

  createGoal: async (payload) => {
    const { data } = await api.post('/productivity/goals', payload);
    return data;
  },

  updateGoal: async (id, payload) => {
    const { data } = await api.put(`/productivity/goals/${id}`, payload);
    return data;
  },

  deleteGoal: async (id) => {
    await api.delete(`/productivity/goals/${id}`);
  },

  getTasksForGoal: async (id) => {
    const { data } = await api.get(`/productivity/goals/${id}/tasks`);
    return data;
  },

  linkTaskToGoal: async (goalId, taskId) => {
    const { data } = await api.post(`/productivity/goals/${goalId}/tasks/${taskId}`);
    return data;
  },

  /* ─── TIME BLOCKING ─── */
  getTimeBlocks: async (date) => {
    const params = date ? { date } : {};
    const { data } = await api.get('/productivity/time-blocks', { params });
    return data;
  },

  setTimeBlock: async (taskId, { date, startTime, endTime }) => {
    const { data } = await api.post(`/productivity/tasks/${taskId}/time-block`, {
      date,
      startTime,
      endTime
    });
    return data;
  },

  clearTimeBlock: async (taskId) => {
    const { data } = await api.delete(`/productivity/tasks/${taskId}/time-block`);
    return data;
  },
};

export default productivityApi;
