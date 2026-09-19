import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import BlogPage from './page';
import authReducer from '../../store/auth/authSlice';

const mockNavigate = jest.fn();

jest.mock(
  'react-router-dom',
  () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({}),
  }),
  { virtual: true }
);

const rootReducer = combineReducers({ auth: authReducer });

const buildStore = (preloadedState?: any) =>
  configureStore({ reducer: rootReducer, preloadedState });

const samplePost = {
  id: 1,
  title: 'First Post',
  summary: 'A summary',
  content: 'Full content',
  author_name: 'Admin',
  created_at: '2026-08-01T10:00:00Z',
  images: [],
  comments: [],
  reaction_counts: { likes: 2, dislikes: 0 },
};

describe('BlogPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows a loading message while fetching posts', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch;

    const store = buildStore({ auth: { isLoggedIn: false, user: null } });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    expect(screen.getByText('Loading blog posts...')).toBeInTheDocument();
  });

  it('shows "No blog posts yet." when there are no posts', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const store = buildStore({ auth: { isLoggedIn: false, user: null } });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No blog posts yet.')).toBeInTheDocument();
    });
  });

  it('renders a table row for each blog post', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [samplePost] }),
    }) as unknown as typeof fetch;

    const store = buildStore({ auth: { isLoggedIn: false, user: null } });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('First Post')).toBeInTheDocument();
    });
  });

  it('hides the "Create blog post" button for non-admin users', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'customer' } },
    });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('No blog posts yet.')).toBeInTheDocument();
    });

    expect(screen.queryByText('Create blog post')).not.toBeInTheDocument();
  });

  it('shows the "Create blog post" button for admins and opens the create modal', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'admin' } },
    });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Create blog post')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create blog post'));

    expect(screen.getByText('Create a new blog post')).toBeInTheDocument();
  });

  it('shows a validation error when submitting an empty post form', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as unknown as typeof fetch;

    const store = buildStore({
      auth: { isLoggedIn: true, user: { id: '1', type: 'admin' } },
    });

    render(
      <Provider store={store}>
        <BlogPage />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByText('Create blog post')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create blog post'));
    screen.getAllByText('Publish blog post').forEach((el) => fireEvent.click(el));

    await waitFor(() => {
      expect(screen.getByText('Title and content are required')).toBeInTheDocument();
    });
  });
});
