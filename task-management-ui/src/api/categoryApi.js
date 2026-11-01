import api from './axiosInstance';

const categoryApi = {
  /** GET /api/categories — returns [{id, name, color}] */
  getAll: async () => {
    const { data } = await api.get('/categories');
    return data;
  },

  /** POST /api/categories */
  create: async ({ name, color }) => {
    const { data } = await api.post('/categories', { name, color });
    return data;
  },

  /** DELETE /api/categories/:id */
  remove: async (id) => {
    await api.delete(`/categories/${id}`);
  },
};

export default categoryApi;
