import api from './axiosInstance';

const taskApi = {
  /* GET /api/tasks with filters + pagination */
  getTasks: async ({ status, priority, search, categoryId, sortBy = 'createdAt', direction = 'DESC', page = 0, size = 20 } = {}) => {
    const params = { sortBy, direction, page, size };
    if (status)     params.status     = status;
    if (priority)   params.priority   = priority;
    if (search)     params.search     = search;
    if (categoryId) params.categoryId = categoryId;
    const { data } = await api.get('/tasks', { params });
    return data; // PagedTaskResponse
  },

  /* GET /api/tasks/stats */
  getStats: async () => {
    const { data } = await api.get('/tasks/stats');
    return data; // TaskStatsResponse
  },

  /* GET /api/tasks/:id */
  getById: async (id) => {
    const { data } = await api.get(`/tasks/${id}`);
    return data;
  },

  /* POST /api/tasks */
  create: async (payload) => {
    const { data } = await api.post('/tasks', payload);
    return data;
  },

  /* PUT /api/tasks/:id */
  update: async (id, payload) => {
    const { data } = await api.put(`/tasks/${id}`, payload);
    return data;
  },

  /* PATCH /api/tasks/:id/status */
  changeStatus: async (id, status) => {
    const { data } = await api.patch(`/tasks/${id}/status`, { status });
    return data;
  },

  /* DELETE /api/tasks/:id */
  remove: async (id) => {
    await api.delete(`/tasks/${id}`);
  },

  /* GET /api/tasks/:id/comments */
  getComments: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/comments`);
    return data;
  },

  /* POST /api/tasks/:id/comments */
  addComment: async (taskId, content) => {
    const { data } = await api.post(`/tasks/${taskId}/comments`, { content });
    return data;
  },

  /* GET /api/tasks/:id/activity */
  getActivity: async (taskId) => {
    const { data } = await api.get(`/tasks/${taskId}/activity`);
    return data;
  },

  /* GET /api/tasks/export/csv */
  exportCsv: async () => {
    const response = await api.get('/tasks/export/csv', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `tasks-${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  /* GET /api/tasks/export/pdf */
  exportPdf: async () => {
    const response = await api.get('/tasks/export/pdf', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    // Open in a new tab for preview, plus download fallback
    const previewWindow = window.open(url, '_blank');
    if (!previewWindow) {
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tasks-report-${new Date().toISOString().slice(0,10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    }
    return true;
  },

  /* POST /api/tasks/upload/csv */
  uploadCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/tasks/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /* POST /api/tasks/upload/pdf */
  uploadPdf: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/tasks/upload/pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /* POST /api/tasks/:id/reschedule */
  reschedule: async (id, { newDueDate, reason } = {}) => {
    const { data } = await api.post(`/tasks/${id}/reschedule`, { newDueDate, reason });
    return data;
  },

  /* POST /api/tasks/import/csv */
  importCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/tasks/upload/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /* GET /api/tasks/files */
  getUploadedFiles: async () => {
    const { data } = await api.get('/tasks/files');
    return data;
  },

  /* GET /api/tasks/files/:id/download */
  downloadUploadedFile: async (id, filename) => {
    const response = await api.get(`/tasks/files/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename || 'file');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  /* DELETE /api/tasks/files/:id */
  deleteUploadedFile: async (id) => {
    const { data } = await api.delete(`/tasks/files/${id}`);
    return data;
  },

  /* BULK ACTIONS (Step 8.1) */
  bulkStatus: async (taskIds, status) => {
    const { data } = await api.post('/tasks/bulk/status', { taskIds, status });
    return data;
  },

  bulkPriority: async (taskIds, priority) => {
    const { data } = await api.post('/tasks/bulk/priority', { taskIds, priority });
    return data;
  },

  bulkDelete: async (taskIds) => {
    const { data } = await api.post('/tasks/bulk/delete', { taskIds });
    return data;
  },

  bulkCategory: async (taskIds, categoryId) => {
    const { data } = await api.post('/tasks/bulk/category', { taskIds, categoryId });
    return data;
  },
};

export default taskApi;
