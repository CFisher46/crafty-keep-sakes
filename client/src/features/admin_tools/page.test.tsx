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

  it('disables the tool selector until an action is chosen', () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    expect(screen.getByPlaceholderText('Select a tool')).toBeDisabled();
  });

  it('disables submit until a valid action/tool combination is chosen', () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    expect(screen.getByText('Submit')).toBeDisabled();
  });

  it('renders the CreateNewUser form when Add + User is selected', async () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    fireEvent.click(screen.getByPlaceholderText('Select an action'));
    fireEvent.click(screen.getByText('Add'));

    fireEvent.click(screen.getByPlaceholderText('Select a tool'));
    fireEvent.click(screen.getByText('User'));

    fireEvent.click(screen.getByText('Submit'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('First Name')).toBeInTheDocument();
    });
  });

  it('resets all selections when Reset is clicked', () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    fireEvent.click(screen.getByPlaceholderText('Select an action'));
    fireEvent.click(screen.getByText('Add'));

    fireEvent.click(screen.getByText('Reset'));

    expect(screen.getByPlaceholderText('Select a tool')).toBeDisabled();
  });

  it('shows the user selector when Update + User is chosen', () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    fireEvent.click(screen.getByPlaceholderText('Select an action'));
    fireEvent.click(screen.getByText('Update'));

    fireEvent.click(screen.getByPlaceholderText('Select a tool'));
    fireEvent.click(screen.getByText('User'));

    expect(screen.getByText('Select a User to Update:')).toBeInTheDocument();
  });

  it('limits tool options to User and Report for the Delete action', () => {
    render(
      <Provider store={buildStore()}>
        <AdminTools />
      </Provider>
    );

    fireEvent.click(screen.getByPlaceholderText('Select an action'));
    fireEvent.click(screen.getByText('Delete'));

    fireEvent.click(screen.getByPlaceholderText('Select a tool'));

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Report')).toBeInTheDocument();
    expect(screen.queryByText('Product')).not.toBeInTheDocument();
  });
});
