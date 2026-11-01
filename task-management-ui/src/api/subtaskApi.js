import axios from './axiosInstance';

export const subtaskApi = {
  list:   (taskId)           => axios.get(`/api/tasks/${taskId}/subtasks`).then(r => r.data),
  add:    (taskId, title)    => axios.post(`/api/tasks/${taskId}/subtasks`, { title }).then(r => r.data),
  toggle: (taskId, subtaskId) =>
    axios.patch(`/api/tasks/${taskId}/subtasks/${subtaskId}/toggle`).then(r => r.data),
  remove: (taskId, subtaskId) =>
    axios.delete(`/api/tasks/${taskId}/subtasks/${subtaskId}`).then(r => r.data),
};
