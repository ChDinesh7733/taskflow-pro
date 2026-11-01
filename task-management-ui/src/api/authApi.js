import api from './axiosInstance';

const authApi = {
  register: async ({ displayName, email, password }) => {
    const { data } = await api.post('/auth/register', { displayName, email, password });
    return data; // { message, user }
  },

  login: async ({ email, password }) => {
    const { data } = await api.post('/auth/login', { email, password });
    // data = { accessToken, refreshToken, expiresIn, user }
    return data;
  },

  demoLogin: async () => {
    const { data } = await api.post('/auth/demo');
    return data;
  },

  me: async () => {
    const { data } = await api.get('/auth/me');
    return data; // UserResponse
  },

  updateProfile: async ({ displayName }) => {
    const { data } = await api.put('/auth/profile', { displayName });
    return data;
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const { data } = await api.put('/auth/change-password', { currentPassword, newPassword });
    return data;
  },

  logout: async () => {
    await api.post('/auth/logout').catch(() => {}); // best-effort
  },
};

export default authApi;
