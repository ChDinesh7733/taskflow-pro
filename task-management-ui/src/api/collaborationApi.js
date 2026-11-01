import axiosInstance from './axiosInstance';

export const collaborationApi = {
  // Team members
  getMembers: async () => {
    const res = await axiosInstance.get('/collaboration/members');
    return res.data;
  },

  inviteMember: async (data) => {
    const res = await axiosInstance.post('/collaboration/members', data);
    return res.data;
  },

  removeMember: async (id) => {
    const res = await axiosInstance.delete(`/collaboration/members/${id}`);
    return res.data;
  },

  updateRole: async (id, role) => {
    const res = await axiosInstance.patch(`/collaboration/members/${id}/role`, { role });
    return res.data;
  },

  // Project public sharing
  shareProject: async (categoryId) => {
    const res = await axiosInstance.post(`/collaboration/projects/${categoryId}/share`);
    return res.data;
  },

  revokeShareProject: async (categoryId) => {
    const res = await axiosInstance.delete(`/collaboration/projects/${categoryId}/share`);
    return res.data;
  },

  getPublicProject: async (shareToken) => {
    // Unauthenticated public request
    const res = await axiosInstance.get(`/public/projects/${shareToken}`);
    return res.data;
  },

  // Presence
  heartbeatPresence: async (taskId) => {
    const res = await axiosInstance.post('/collaboration/presence/heartbeat', { taskId });
    return res.data;
  },

  getViewers: async (taskId) => {
    const res = await axiosInstance.get(`/collaboration/presence/${taskId}`);
    return res.data;
  },

  // Audit activity log
  getAuditLog: async () => {
    const res = await axiosInstance.get('/collaboration/activity-log');
    return res.data;
  }
};
