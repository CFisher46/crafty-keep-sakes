import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProductReviews from './product-reviews';

const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('ProductReviews', () => {
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: mockFetch,
    });
    mockFetch.mockReset();
  });

  afterAll(() => {
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      value: originalFetch,
    });
  });

  it('lets an eligible customer submit and then displays their review', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({
          eligible: true,
          has_review: false,
          has_recent_purchase: true,
        })
      )
      .mockResolvedValueOnce(
        response({ message: 'Product review created', id: 8 }, 201)
      )
      .mockResolvedValueOnce(
        response({
          data: [
            {
              id: 8,
              reviewer_name: 'Verified purchaser',
              star_count: 5,
              match_description_rating: 5,
              quality_rating: 5,
              value_rating: 5,
              comment: 'Beautifully made',
              submit_date: '2026-06-05',
            },
          ],
        })
      );

    render(<ProductReviews productId="3" />);

    const expandReviews = screen.getByRole('button', { name: 'Show product reviews' });
    expect(expandReviews).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(
      await screen.findByRole('button', { name: 'Write a review' })
    );
    expect(await screen.findByText('0 / 250')).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('Your review'), {
      target: { value: 'Beautifully made' },
    });
    expect(screen.getByText('16 / 250')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rate Matches Description 5 out of 5' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Rate Quality 3 out of 5' })
    );
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Rate Value 5 out of 5' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thank you for sharing your review.'
    );
    expect(expandReviews).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandReviews);
    expect(await screen.findByText('Beautifully made')).toBeInTheDocument();
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(4));
    expect(mockFetch.mock.calls[2][1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({
        match_description_rating: 5,
        quality_rating: 3,
        value_rating: 5,
        comment: 'Beautifully made',
      }),
    });
  });

  it('uses legacy overall ratings without inventing category averages', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ data: [
        { id: 1, reviewer_name: 'Verified purchaser', star_count: 3, match_description_rating: null, quality_rating: null, value_rating: null, comment: 'Legacy', submit_date: '2026-06-05' },
        { id: 2, reviewer_name: 'Verified purchaser', star_count: 5, match_description_rating: 5, quality_rating: 5, value_rating: 5, comment: 'New', submit_date: '2026-06-05' },
      ] }))
      .mockResolvedValueOnce(response({}, 401));
    render(<ProductReviews productId="3" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show product reviews' }));
    await screen.findByText('Legacy');
    expect(screen.getByLabelText('4.0 average rating out of 5')).toBeInTheDocument();
    expect(screen.getByText('Matches Description: Unavailable · Quality: Unavailable · Value: Unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('5.0')).toHaveLength(3);
  });

  it('keeps the form open and reports a failed submission without refreshing reviews', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(response({ eligible: true, has_review: false, has_recent_purchase: true }))
      .mockResolvedValueOnce(response({ error: 'Review rejected' }, 403));
    render(<ProductReviews productId="3" />);
    fireEvent.click(screen.getByRole('button', { name: 'Show product reviews' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Write a review' }));
    fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Review' } });
    for (const label of ['Matches Description', 'Quality', 'Value']) {
      fireEvent.click(screen.getByRole('button', { name: `Rate ${label} 4 out of 5` }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Review rejected');
    expect(screen.getByLabelText('Your review')).toHaveValue('Review');
    expect(mockFetch).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByLabelText('Your review')).not.toBeInTheDocument());
  });

  it('keeps long review lists compact until expanded', async () => {
    mockFetch
      .mockResolvedValueOnce(
        response({
          data: [1, 2, 3, 4].map((id) => ({
            id,
            reviewer_name: 'Verified purchaser',
            star_count: 5,
            match_description_rating: 5,
            quality_rating: 5,
            value_rating: 5,
            comment: `Review ${id}`,
            submit_date: '2026-06-05',
          })),
        })
      )
      .mockResolvedValueOnce(response({}, 401));

    render(<ProductReviews productId="3" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Show product reviews' })
    );
    await screen.findByText('Review 1');
    expect(screen.getAllByTestId('product-review-card')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 4 reviews' }));
    expect(screen.getAllByTestId('product-review-card')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Show fewer reviews' }));
    expect(screen.getAllByTestId('product-review-card')).toHaveLength(2);
  });

  it('hides the review form and eligibility prompts when the customer cannot review', async () => {
    mockFetch
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({
          eligible: false,
          has_review: false,
          has_recent_purchase: false,
        })
      );

    render(<ProductReviews productId="3" />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Show product reviews' })
    );
    await screen.findByText('Be the first to review this product.');
    expect(screen.queryByText('Write a review')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Your review')).not.toBeInTheDocument();
    expect(screen.queryByText(/paid purchase/)).not.toBeInTheDocument();
  });
});
