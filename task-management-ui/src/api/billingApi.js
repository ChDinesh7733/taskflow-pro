import axiosInstance from './axiosInstance';

export const billingApi = {
  getSubscription: async () => {
    const res = await axiosInstance.get('/billing/subscription');
    return res.data;
  },

  getPlans: async () => {
    const res = await axiosInstance.get('/billing/plans');
    return res.data;
  },

  checkout: async ({ planTier, provider = 'STRIPE', paymentMethod = 'CARD' }) => {
    const res = await axiosInstance.post('/billing/checkout', {
      planTier,
      provider,
      paymentMethod
    });
    return res.data;
  },

  cancelSubscription: async () => {
    const res = await axiosInstance.post('/billing/cancel');
    return res.data;
  },

  exportTasksCsv: async () => {
    const res = await axiosInstance.get('/billing/export/csv', {
      responseType: 'blob'
    });
    // Create download link
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'taskflow-export.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
    return true;
  },

  // Admin APIs
  getAdminUsers: async () => {
    const res = await axiosInstance.get('/admin/users');
    return res.data;
  },

  toggleUserStatus: async (userId) => {
    const res = await axiosInstance.patch(`/admin/users/${userId}/status`);
    return res.data;
  },

  updateUserRoleAndPlan: async (userId, { role, planTier }) => {
    const res = await axiosInstance.patch(`/admin/users/${userId}/role-plan`, {
      role,
      planTier
    });
    return res.data;
  },

  getAdminMetrics: async () => {
    const res = await axiosInstance.get('/admin/metrics');
    return res.data;
  }
};
