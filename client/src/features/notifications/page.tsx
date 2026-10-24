import { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { ui } from '../../helpers/theme';
import { ActionButton } from '../landingPage/components/ActionButton';
import {
  AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api';
import { notifyNotificationsChanged } from './events';

const formatWhen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString();
};

function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await fetchNotifications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = items.filter((item) => !item.read_at).length;

  const openNotification = async (item: AppNotification) => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (!item.read_at) {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry
          )
        );
        notifyNotificationsChanged();
      }

      if (item.link) {
        navigate(item.link);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark this notification as read');
    } finally {
      setPending(false);
    }
  };

  const markAllRead = async () => {
    if (pending || unreadCount === 0) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((entry) =>
          entry.read_at ? entry : { ...entry, read_at: new Date().toISOString() }
        )
      );
      notifyNotificationsChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to mark notifications as read');
    } finally {
      setPending(false);
    }
  };

  return (
    <Box width="large" alignSelf="center" gap="medium" pad={{ vertical: 'medium' }}>
      <Box direction="row" align="center" justify="between" gap="small" wrap>
        <Text
          as="h1"
          margin="none"
          style={{ fontFamily: ui.serif, fontSize: '32px', fontWeight: 400, color: ui.ink }}
        >
          Notifications
        </Text>
        {unreadCount > 0 && (
          <ActionButton
            label="Mark all as read"
            onClick={markAllRead}
            secondary
            fixed
            disabled={pending}
          />
        )}
      </Box>

      {error && (
        <Text color="status-critical" role="alert">
          {error}
        </Text>
      )}

      {loading && <Text color={ui.muted}>Loading notifications</Text>}

      {!loading && items.length === 0 && (
        <Box background="white" pad="medium" border={{ color: ui.line }}>
          <Text color={ui.muted}>You have no notifications.</Text>
        </Box>
      )}

      {!loading &&
        items.map((item) => {
          const unread = !item.read_at;
          return (
            <Box
              key={item.id}
              as="button"
              background="white"
              pad="medium"
              gap="xsmall"
              align="start"
              border={{ color: unread ? ui.accent : ui.line, side: 'left', size: unread ? '4px' : '1px' }}
              onClick={() => openNotification(item)}
              aria-label={item.title}
              style={{ cursor: 'pointer', textAlign: 'left' }}
            >
              <Box direction="row" align="center" gap="small" justify="between" fill="horizontal">
                <Text weight="bold" color={ui.ink}>
                  {item.title}
                </Text>
                {unread && (
                  <Text size="xsmall" color={ui.accent} aria-label="Unread">
                    Unread
                  </Text>
                )}
              </Box>
              <Text color={ui.ink}>{item.body}</Text>
              <Text size="xsmall" color={ui.muted}>
                {formatWhen(item.created_at)}
              </Text>
            </Box>
          );
        })}
    </Box>
  );
}

export default NotificationsPage;
