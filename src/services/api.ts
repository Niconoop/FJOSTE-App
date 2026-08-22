import axios from 'axios';
import { API_URL } from '../config';

const BASE_URL = API_URL;

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // Stats & Dashboard
  getStats: () => api.get('/stats/global'),
  getDashboard: () => api.get('/stats/global'),
  getRecentJobs: () => api.get('/desktop/jobs'),
  getLiveMap: () => api.get('/live-map'),

  // Team & Members
  getTeam: () => api.get('/members'),
  getMember: (id: string) => api.get(`/members/${id}`),

  // Events
  getEvents: () => api.get('/events'),
  getCustomEvents: (headers?: any) => api.get('/events', { headers }),
  getEventRsvps: (headers?: any) => api.get('/events/rsvps', { headers }),
  joinEvent: (eventKey: string, headers?: any) => api.post(`/events/${eventKey}/rsvp`, {}, { headers }),
  leaveEvent: (eventKey: string, headers?: any) => api.delete(`/events/${eventKey}/rsvp`, { headers }),
  createEvent: (data: any, headers?: any) => api.post('/events', data, { headers }),
  updateEvent: (id: string, data: any, headers?: any) => api.put(`/events/${id}`, data, { headers }),
  deleteEvent: (id: string, headers?: any) => api.delete(`/events/${id}`, { headers }),
  uploadEventImage: (id: string, file: File, type: string, headers?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/events/custom/${id}/image/${type}`, formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
  },

  // News
  getNews: (headers?: any) => api.get('/news', { headers }),
  createNews: (data: any, headers?: any) => api.post('/news', data, { headers }),
  deleteNews: (id: string, headers?: any) => api.delete(`/news/${id}`, { headers }),
  uploadNewsImage: (id: string, file: File, headers?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/news/${id}/image`, formData, { headers: { ...headers, 'Content-Type': 'multipart/form-data' } });
  },

  // Chat
  getChatChannels: (headers?: any) => api.get('/chat/channels', { headers }),
  getChannelMessages: (channelId: string, since?: string, headers?: any) => {
    const url = since ? `/chat/channels/${channelId}/messages?since=${since}` : `/chat/channels/${channelId}/messages`;
    return api.get(url, { headers });
  },
  sendMessage: (channelId: string, content: string, headers?: any) => api.post(`/chat/channels/${channelId}/messages`, { content }, { headers }),
  createChannel: (data: any, headers?: any) => api.post('/chat/channels', data, { headers }),
  deleteMessage: (msgId: string, headers?: any) => api.delete(`/chat/messages/${msgId}`, { headers }),

  // Applications
  getApplications: (headers?: any) => api.get('/applications', { headers }),
  updateApplication: (id: string, action: string, note: string, headers?: any) => api.put(`/applications/${id}`, { action, note }, { headers }),

  // Reports
  getReports: (headers?: any) => api.get('/reports', { headers }),
  getWeeklyReport: (headers?: any) => api.get('/reports/weekly', { headers }),
  getReportDetails: (reportId: string, headers?: any) => api.get(`/reports/${reportId}`, { headers }),
  exportReport: (reportId: string, format: 'csv' | 'pdf', headers?: any) =>
    api.get(`/reports/${reportId}/export?format=${format}`, {
      headers,
      responseType: format === 'pdf' ? 'blob' : 'text',
    }),

  // Notifications
  getNotifications: (headers?: any) => api.get('/notifications', { headers }),
  markNotificationRead: (id: string, headers?: any) => api.put(`/notifications/${id}/read`, {}, { headers }),
  markAllNotificationsRead: (headers?: any) => api.put('/notifications/read-all', {}, { headers }),

  // Spotify
  getSpotifyCurrentTrack: (headers?: any) => api.get('/spotify/current-track', { headers }),
  getSpotifyQueue: (headers?: any) => api.get('/spotify/queue', { headers }),

  // TruckersMP Session
  getMyTruckersMPSession: (headers?: any) => api.get('/truckersmp/my-session', { headers }),
  getUserTruckersMPSession: (userId: string, headers?: any) => api.get(`/truckersmp/session/${userId}`, { headers }),

  // Admin
  getInviteCodes: (headers?: any) => api.get('/management/invite-codes', { headers }),
  createInviteCode: (headers?: any) => api.post('/management/invite-codes', {}, { headers }),
  getUsers: (headers?: any) => api.get('/management/users', { headers }),
  linkUser: (userId: string, driverId: string, headers?: any) => api.post(`/management/users/${userId}/link`, { trucky_driver_id: driverId }, { headers }),
  unlinkUser: (userId: string, headers?: any) => api.post(`/management/users/${userId}/unlink`, {}, { headers }),
  deleteUser: (userId: string, headers?: any) => api.delete(`/management/users/${userId}`, { headers }),
  setUserRole: (userId: string, role: string, headers?: any) => api.put(`/management/users/${userId}/role?role=${role}`, {}, { headers }),
  syncRoles: (headers?: any) => api.post('/management/users/sync-roles', {}, { headers }),
  getApplicationSettings: (headers?: any) => api.get('/settings/applications', { headers }),
  setApplicationSettings: (data: any, headers?: any) => api.put('/settings/applications', data, { headers }),
  deleteProfile: () => api.delete('/auth/profile'),
};

export default api;
