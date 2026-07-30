import { api } from './client';
import type { Notification } from '../types/api';

export const fetchNotifications = (unreadOnly = false) =>
  api
    .get<{ notifications: Notification[]; unreadCount: number }>('/notifications', {
      params: { unreadOnly },
    })
    .then((r) => r.data);

export const markNotificationsRead = (ids?: string[]) =>
  api.post<{ updated: number }>('/notifications/read', { ids }).then((r) => r.data);
