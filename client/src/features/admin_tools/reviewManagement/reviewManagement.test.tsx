import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import reviewsReducer from '../../../store/reviews/reviewsSlice';
import ReviewManagement from './reviewManagement';

const review = {
  id: 7,
  reviewer_name: 'Hannah Lawton',
  source: 'Wedding DIY UK',
  star_count: 5,
  comment: 'Great',
  submit_date: '2026-05-15',
};

const renderTool = (action: 'Add' | 'Update' | 'Delete') =>
  render(
    <Provider store={configureStore({ reducer: { reviews: reviewsReducer } })}>
      <ReviewManagement action={action} />
    </Provider>
  );

describe('ReviewManagement', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [review] }) });
  });

  afterEach(() => jest.clearAllMocks());

  it('validates required fields before creating', async () => {
    renderTool('Add');

    fireEvent.click(screen.getByRole('button', { name: 'Add review' }));

    expect(await screen.findByText('Reviewer name is required')).toBeInTheDocument();
    const posts = (global.fetch as jest.Mock).mock.calls.filter(([, init]) => init?.method === 'POST');
    expect(posts).toHaveLength(0);
  });

  it('posts a new review and confirms', async () => {
    renderTool('Add');

    fireEvent.change(screen.getByLabelText('Reviewer name'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Source'), { target: { value: 'Google' } });
    fireEvent.change(screen.getByLabelText('Comment'), { target: { value: 'Brilliant' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add review' }));

    expect(await screen.findByText('Review added.')).toBeInTheDocument();
    const post = (global.fetch as jest.Mock).mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(post[1].body)).toMatchObject({ reviewer_name: 'Sam', source: 'Google', comment: 'Brilliant', star_count: 5 });
  });

  it('asks for a review to delete', async () => {
    renderTool('Delete');

    expect(screen.getByText('Select a review to delete')).toBeInTheDocument();
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
  });
});
