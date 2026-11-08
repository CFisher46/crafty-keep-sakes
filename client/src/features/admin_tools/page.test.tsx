import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import AdminTools from './page';
import authReducer from '../../store/auth/authSlice';
import usersReducer from '../../store/users/usersSlice';
import auditReducer from '../../store/audits/auditSlice';
import productsReducer from '../../store/products/productsSlice';
import reviewsReducer from '../../store/reviews/reviewsSlice';

let mockSearch = '';
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ search: mockSearch }),
}), { virtual: true });

const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  audit: auditReducer,
  products: productsReducer,
  reviews: reviewsReducer,
});

const buildStore = () => configureStore({ reducer: rootReducer });

const renderPage = () =>
  render(
    <Provider store={buildStore()}>
      <AdminTools />
    </Provider>
  );

describe('AdminTools page', () => {
  beforeEach(() => {
    mockSearch = '';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows all admin areas as tabs', () => {
    renderPage();

    ['Users', 'Products', 'Reviews', 'Audit log'].forEach((name) => {
      expect(screen.getByRole('tab', { name })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true');
  });

  it('asks for a user when Update is selected on the Users tab', () => {
    renderPage();

    expect(screen.getByText('Select a user to update')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Select a User')).toBeInTheDocument();
  });

  it('renders the CreateNewUser form when Add is chosen on Users', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    });
  });

  it('offers only Add and Update for Products', () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Products' }));

    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('offers the user selector for Delete on Users', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText('Select a user to delete')).toBeInTheDocument();
  });

  it('shows the audit log directly on the Audit log tab', () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Audit log' }));

    expect(screen.queryByText('Show Audit Table')).not.toBeInTheDocument();
    expect(screen.queryByText('Select a user to update')).not.toBeInTheDocument();
  });

  it('loads the user specified in a notification link', async () => {
    mockSearch = '?user=9';
    const user = { id: 9, first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' };
    (global.fetch as jest.Mock).mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => String(url).endsWith('/users/9') ? user : [user],
    }));

    renderPage();

    expect(await screen.findByPlaceholderText('jane@example.com')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/9'),
      expect.objectContaining({ credentials: 'include' })
    );
    expect(screen.getByText('Select a user to update')).toBeInTheDocument();
  });

  it('shows an error when the linked user cannot be loaded', async () => {
    mockSearch = '?user=9';
    (global.fetch as jest.Mock).mockImplementation(async (url: string) =>
      String(url).endsWith('/users/9')
        ? { ok: false, status: 404, text: async () => 'User not found' }
        : { ok: true, json: async () => [] }
    );

    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this user');
  });

  it('rejects invalid linked user IDs without fetching them', async () => {
    mockSearch = '?user=bad';
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid user link');
    expect(global.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/users/bad'),
      expect.anything()
    );
  });
});
