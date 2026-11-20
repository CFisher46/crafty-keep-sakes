import { fireEvent, render, screen } from '@testing-library/react';
import ProductReviewManagement from './productReviewManagement';

describe('ProductReviewManagement', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it('confirms and deletes a selected product review', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        data: [{ id: '8', product_id: '3', product_name: 'Keepsake', comment: 'Review text', submit_date: '2026-06-05' }],
      }) })
      .mockResolvedValueOnce({ ok: true });
    global.fetch = fetchMock;
    render(<ProductReviewManagement />);
    await screen.findByPlaceholderText('Select a product review');
    fireEvent.click(screen.getByRole('button', { name: 'Select a product review' }));
    fireEvent.click(await screen.findByText('Keepsake · 2026-06-05 · #8'));
    expect(screen.getByText('Review text')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete product review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Delete' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Product review deleted.');
    expect(fetchMock.mock.calls[1][0]).toContain('/reviews/products/admin/reviews/8');
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE', credentials: 'include' });
  });

  it('reports a loading failure rather than showing an empty list', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });
    render(<ProductReviewManagement />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load product reviews.');
    expect(screen.queryByText('No product reviews yet.')).not.toBeInTheDocument();
  });
});
