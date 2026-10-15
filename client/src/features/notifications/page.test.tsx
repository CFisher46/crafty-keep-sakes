import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotificationsPage from './page';
import { NOTIFICATIONS_CHANGED_EVENT } from './events';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

const notifications = [
  {
    id: 3,
    type: 'order_placed',
    title: 'New order placed',
    body: 'Order #1 is ready to process.',
    link: '/Admin',
    data: null,
    read_at: null,
    created_at: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 2,
    type: 'tracking_added',
    title: 'Your order is on its way',
    body: 'Tracking details have been added.',
    link: '/profile/1',
    data: null,
    read_at: '2026-10-14T10:00:00.000Z',
    created_at: '2026-10-14T10:00:00.000Z',
  },
];

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('lists notifications and marks one as read before opening its link', async () => {
    const changed = jest.fn();
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return { ok: true, json: async () => ({ message: 'Notification marked as read' }) };
      }

      return { ok: true, json: async () => ({ data: notifications }) };
    }) as unknown as typeof fetch;

    render(<NotificationsPage />);

    expect(await screen.findByText('Order #1 is ready to process.')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New order placed' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/3/read'),
        expect.objectContaining({ method: 'PUT', credentials: 'include' })
      );
      expect(mockNavigate).toHaveBeenCalledWith('/Admin');
    });
    expect(changed).toHaveBeenCalled();
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, changed);
  });

  it('marks every notification as read', async () => {
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        return { ok: true, json: async () => ({ message: 'Notifications marked as read' }) };
      }

      return { ok: true, json: async () => ({ data: notifications }) };
    }) as unknown as typeof fetch;

    render(<NotificationsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Mark all as read' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/notifications/read-all'),
        expect.objectContaining({ method: 'PUT', credentials: 'include' })
      );
      expect(screen.queryByText('Unread')).not.toBeInTheDocument();
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ data: [] }),
    })) as unknown as typeof fetch;

    render(<NotificationsPage />);

    expect(await screen.findByText('You have no notifications.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument();
  });
});
