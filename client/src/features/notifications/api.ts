import { buildApiUrl } from '../../api/apiPath';

export type AppNotification = {
  id: number;
  type: string;
  title: string;
  body: string;
  link: string | null;
  data: unknown;
  read_at: string | null;
  created_at: string;
};

export async function fetchUnreadNotificationCount(): Promise<number> {
  const response = await fetch(buildApiUrl('notifications', '/unread-count'), {
    credentials: 'include',
  });

  if (!response.ok) {
    return 0;
  }

  const payload = await response.json().catch(() => ({ unread: 0 }));
  const unread = Number(payload?.unread ?? 0);
  return Number.isFinite(unread) && unread > 0 ? unread : 0;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const response = await fetch(buildApiUrl('notifications'), {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to load notifications');
  }

  const payload = await response.json().catch(() => ({ data: [] }));
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function markNotificationRead(id: number): Promise<void> {
  const response = await fetch(buildApiUrl('notifications', `/${id}/read`), {
    method: 'PUT',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to mark this notification as read');
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await fetch(buildApiUrl('notifications', '/read-all'), {
    method: 'PUT',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Unable to mark notifications as read');
  }
}
