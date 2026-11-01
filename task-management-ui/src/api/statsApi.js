import axios from './axiosInstance';

export const statsApi = {
  productivity: () => axios.get('/api/stats/productivity').then(r => r.data),
  toggleDigest: (enabled) =>
    axios.put(`/api/stats/settings/digest?enabled=${enabled}`).then(r => r.data),
};
