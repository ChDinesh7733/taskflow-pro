import axiosInstance from './axiosInstance';

export const integrationsApi = {
  getSettings: async () => {
    const res = await axiosInstance.get('/integrations/settings');
    return res.data;
  },

  updateSettings: async (data) => {
    const res = await axiosInstance.put('/integrations/settings', data);
    return res.data;
  },

  syncGoogleCalendar: async () => {
    const res = await axiosInstance.post('/integrations/gcal/sync');
    return res.data;
  },

  testWebhook: async (data) => {
    const res = await axiosInstance.post('/integrations/webhooks/test', data);
    return res.data;
  },

  listApiKeys: async () => {
    const res = await axiosInstance.get('/integrations/api-keys');
    return res.data;
  },

  createApiKey: async (name) => {
    const res = await axiosInstance.post('/integrations/api-keys', { name });
    return res.data;
  },

  revokeApiKey: async (id) => {
    const res = await axiosInstance.delete(`/integrations/api-keys/${id}`);
    return res.data;
  },

  quickCapture: async (data) => {
    const res = await axiosInstance.post('/integrations/quick-capture', data);
    return res.data;
  },

  simulateInboundEmail: async (token, data) => {
    // Calls public email inbound forwarder
    const res = await axiosInstance.post(`/public/inbound-email/${token}`, data);
    return res.data;
  }
};
