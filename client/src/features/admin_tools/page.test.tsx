import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import AdminTools from './page';
import authReducer from '../../store/auth/authSlice';
import usersReducer from '../../store/users/usersSlice';
import auditReducer from '../../store/audits/auditSlice';
import productsReducer from '../../store/products/productsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  users: usersReducer,
  audit: auditReducer,
  products: productsReducer,
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

    ['Users', 'Products', 'Reports', 'Audit log'].forEach((name) => {
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
});
