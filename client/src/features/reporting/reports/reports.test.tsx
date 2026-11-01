import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProductsReportPage from './productsReport';
import UsersReportPage from './usersReport';
import BlogReportPage from './blogReport';
import { downloadCsv } from './csv';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

jest.mock('./csv', () => ({
  ...jest.requireActual('./csv'),
  downloadCsv: jest.fn(),
}));

const mockReport = (data: unknown) => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data }) }) as any;
};

const lastUrl = () => String((global.fetch as jest.Mock).mock.calls.slice(-1)[0][0]);

describe('report pages', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    (downloadCsv as jest.Mock).mockClear();
  });

  it('shows product sales and exports the filtered view as CSV', async () => {
    mockReport([
      { id: 1, sku: 'A1', product_name: 'Frame', stock: 4, units_sold: 6, revenue: 59.5, orders: 2 },
    ]);

    render(<ProductsReportPage />);

    expect(await screen.findByRole('cell', { name: 'Frame' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '59.50' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Top products by units sold' })).toHaveTextContent('Frame6');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(lastUrl()).toContain('from=2026-01-01&to=2026-01-31'));
    await screen.findByRole('cell', { name: 'Frame' });

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    expect(downloadCsv).toHaveBeenCalledWith(
      'product-sales-2026-01-01_to_2026-01-31.csv',
      expect.stringContaining('Frame,A1,6,2,59.50,4')
    );
  });

  it('pages the table but exports every row', async () => {
    mockReport(
      Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        sku: `S${index + 1}`,
        product_name: `Product ${String(index + 1).padStart(2, '0')}`,
        stock: 1,
        units_sold: 100 - index,
        revenue: 10,
        orders: 1,
      }))
    );

    render(<ProductsReportPage />);

    await screen.findByRole('cell', { name: 'Product 01' });
    expect(screen.getAllByRole('row')).toHaveLength(11);
    expect(screen.getByText('Showing 1–10 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('cell', { name: 'Product 11' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: '20' } });
    expect(screen.getAllByRole('row')).toHaveLength(21);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Export CSV' }));
    const csv = (downloadCsv as jest.Mock).mock.calls[0][1] as string;
    expect(csv.split('\r\n')).toHaveLength(26);
    expect(csv).toContain('Product 25');

    fireEvent.change(screen.getByLabelText('Rows per page'), { target: { value: 'All' } });
    expect(screen.getAllByRole('row')).toHaveLength(26);
    expect(screen.getByText('Showing 1–25 of 25')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('blocks applying a reversed date range', async () => {
    mockReport([]);

    render(<ProductsReportPage />);
    await screen.findByText('No data for the selected filters.');

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-02-01' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-01' } });

    expect(screen.getByRole('alert')).toHaveTextContent('must not be after');
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
  });

  it('shows an error when the report cannot be loaded', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as any;

    render(<BlogReportPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled();
  });

  it('lists blog engagement', async () => {
    mockReport([
      { id: 1, title: 'Hello world', author: 'Chris', created_at: '2026-01-01T00:00:00Z', viewers: 10, comments: 3, likes: 5, dislikes: 1, engagement: 9 },
    ]);

    render(<BlogReportPage />);

    expect(await screen.findByRole('cell', { name: 'Hello world' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Most engaged posts' })).toHaveTextContent('Hello world9');
    expect(screen.getByText('Engagement')).toBeInTheDocument();
  });

  it('marks dormant users, can show only those, and sends the threshold', async () => {
    mockReport({
      inactive_days: 90,
      users: [
        { name: 'Ada Lovelace', email: 'ada@example.com', role: 'customer', status: 'active', created_at: '2025-01-01T00:00:00Z', last_login_at: '2025-02-01T00:00:00Z', days_since_login: 400, is_dormant: true, orders: 1, total_spent: 10 },
        { name: 'Bob Active', email: 'bob@example.com', role: 'customer', status: 'active', created_at: '2025-01-01T00:00:00Z', last_login_at: '2026-10-30T00:00:00Z', days_since_login: 2, is_dormant: false, orders: 0, total_spent: 0 },
      ],
    });

    render(<UsersReportPage />);

    expect(await screen.findByRole('cell', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Bob Active' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Active vs dormant accounts' })).toHaveTextContent('Dormant1');
    expect(lastUrl()).toContain('inactiveDays=90');

    fireEvent.click(screen.getByLabelText('Dormant users only'));
    expect(screen.queryByRole('cell', { name: 'Bob Active' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Active vs dormant accounts' })).toHaveTextContent('Active1');

    fireEvent.change(screen.getByLabelText('Dormant after (days)'), { target: { value: '30' } });
    await waitFor(() => expect(lastUrl()).toContain('inactiveDays=30'));
  });
});
