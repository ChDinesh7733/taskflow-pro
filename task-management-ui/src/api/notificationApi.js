import axios from './axiosInstance';

export const notificationApi = {
  list:        ()   => axios.get('/notifications').then(r => r.data),
  unreadCount: ()   => axios.get('/notifications/unread-count').then(r => r.data.count),
  markRead:    (id) => axios.patch(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: ()   => axios.patch('/notifications/read-all'),
  testDigest:  ()   => axios.post('/notifications/test-digest').then(r => r.data),
};
