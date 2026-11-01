import api from './axiosInstance';

export const gamificationApi = {
  getProfile: async () => {
    const { data } = await api.get('/gamification/profile');
    return data;
  },

  getLeaderboard: async () => {
    const { data } = await api.get('/gamification/leaderboard');
    return data;
  },

  getBadges: async () => {
    const { data } = await api.get('/gamification/badges');
    return data;
  },
};

export default gamificationApi;
