import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import reviewsReducer from '../../../store/reviews/reviewsSlice';
import ReviewsFeedback from './page';

const renderPage = () =>
  render(
    <Provider store={configureStore({ reducer: { reviews: reviewsReducer } })}>
      <ReviewsFeedback />
    </Provider>
  );

const mockFetch = (value: unknown) => {
  global.fetch = jest.fn().mockResolvedValue(value);
};

describe('Reviews feedback page', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders reviews from the API', async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 1,
            reviewer_name: 'Chantel',
            source: 'Pet Pawtraits by Chantel',
            star_count: 5,
            comment: 'Lovely work',
            submit_date: '2026-06-05',
          },
        ],
      }),
    });

    renderPage();

    expect(await screen.findByText(/Lovely work/)).toBeInTheDocument();
    expect(screen.getByText('Chantel')).toBeInTheDocument();
    expect(screen.getByText('5 June 2026 · Pet Pawtraits by Chantel')).toBeInTheDocument();
    expect(screen.getByLabelText('5 out of 5 stars')).toBeInTheDocument();
  });

  it('filters reviews by keyword and shows a no-match message', async () => {
    mockFetch({
      ok: true,
      json: async () => ({
        data: [
          { id: 1, reviewer_name: 'Chantel', source: 'Pet Pawtraits', star_count: 5, comment: 'Lovely business supplies', submit_date: '2026-06-05' },
          { id: 2, reviewer_name: 'Hannah', source: 'Wedding DIY UK', star_count: 5, comment: 'Perfect place names', submit_date: '2026-05-15' },
        ],
      }),
    });

    renderPage();

    const search = await screen.findByLabelText('Search reviews');
    fireEvent.change(search, { target: { value: 'place names' } });
    expect(screen.getAllByTestId('review-card')).toHaveLength(1);
    expect(screen.getByText(/Perfect place names/)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'wedding' } });
    expect(screen.getByText(/Perfect place names/)).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getByText('No reviews match your search.')).toBeInTheDocument();
  });

  it('shows an empty state when there are no reviews', async () => {
    mockFetch({ ok: true, json: async () => ({ data: [] }) });

    renderPage();

    expect(await screen.findByText('No reviews to show yet.')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    mockFetch({ ok: false, json: async () => ({ error: 'boom' }) });

    renderPage();

    expect(await screen.findByText('Reviews are unavailable right now.')).toBeInTheDocument();
  });
});
