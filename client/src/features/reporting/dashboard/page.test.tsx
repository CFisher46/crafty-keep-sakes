import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './page';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

const overview = {
  from: '2026-01-01',
  to: '2026-01-03',
  granularity: 'day',
  totals: { orders: 3, revenue: 45.5, customers: 2, units: 7, new_users: 1 },
  series: [
    { period: '2026-01-01', orders: 1, revenue: 10 },
    { period: '2026-01-02', orders: 2, revenue: 35.5 },
    { period: '2026-01-03', orders: 0, revenue: 0 },
  ],
  top_products: [{ product_name: 'Frame', units: 5 }],
};

describe('DashboardPage', () => {
  it('shows totals and charts, and reloads for the chosen dates', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({ data: overview }),
      }) as any;

    render(<DashboardPage />);

    expect(
      screen.getByRole('heading', { name: 'Dashboard' })
    ).toBeInTheDocument();
    expect(await screen.findByText('£45.50')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: /Revenue per day/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: 'Top 5 products by units' })
    ).toHaveTextContent('Frame');

    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: '2026-01-31' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(
        String((global.fetch as jest.Mock).mock.calls.slice(-1)[0][0])
      ).toContain('/overview?from=2026-01-01&to=2026-01-31')
    );
  });

  it('shows an error when the dashboard cannot load', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) }) as any;

    render(<DashboardPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load the dashboard'
    );
  });

  it('links back to reporting', () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({}) }) as any;

    render(<DashboardPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Back to reporting' }));

    expect(mockNavigate).toHaveBeenCalledWith('/Reporting');
  });
});
