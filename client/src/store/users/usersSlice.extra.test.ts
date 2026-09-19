import reducer, { clearSelectedUser } from './usersSlice';
import { fetchAllUsers, fetchUserById, createUser, deleteUser } from './usersThunks';
import { logout } from '../auth/authSlice';
import { UsersState } from './types';

const sampleUser = {
  id: '1',
  email_address: 'user@example.com',
  first_name: 'John',
  last_name: 'Doe',
  address_line1: '',
  address_line2: '',
  address_line3: '',
  town: '',
  county: '',
  postcode: '',
  telephone_number: '',
  type: 'customer',
  status: 'active',
  invoice_id: 0,
  password: '',
};

const initialState: UsersState = {
  list: [],
  selectedUser: null,
  loading: false,
  error: null,
  isLoggedIn: false,
};

describe('usersSlice (extra reducers)', () => {
  it('sets loading true and clears error on fetchAllUsers.pending', () => {
    const state = reducer(
      { ...initialState, error: 'previous error' },
      fetchAllUsers.pending('requestId', undefined)
    );

    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('populates list and clears loading on fetchAllUsers.fulfilled', () => {
    const state = reducer(
      { ...initialState, loading: true },
      fetchAllUsers.fulfilled([sampleUser], 'requestId', undefined)
    );

    expect(state.loading).toBe(false);
    expect(state.list).toEqual([sampleUser]);
  });

  it('sets an error message on fetchAllUsers.rejected', () => {
    const action = fetchAllUsers.rejected(
      new Error('Fetch failed'),
      'requestId',
      undefined
    );

    const state = reducer({ ...initialState, loading: true }, action);

    expect(state.loading).toBe(false);
    expect(state.error).toBe('Fetch failed');
  });

  it('falls back to a default error message when none is provided', () => {
    const action = fetchAllUsers.rejected(null, 'requestId', undefined);
    action.error.message = undefined;

    const state = reducer({ ...initialState, loading: true }, action);

    expect(state.error).toBe('Failed to fetch users');
  });

  it('sets selectedUser on fetchUserById.fulfilled', () => {
    const state = reducer(
      initialState,
      fetchUserById.fulfilled(sampleUser, 'requestId', '1')
    );

    expect(state.selectedUser).toEqual(sampleUser);
    expect(state.loading).toBe(false);
  });

  it('appends the new user to the list on createUser.fulfilled', () => {
    const state = reducer(
      initialState,
      createUser.fulfilled(sampleUser, 'requestId', {} as any)
    );

    expect(state.list).toEqual([sampleUser]);
  });

  it('removes the user from the list on deleteUser.fulfilled', () => {
    const state = reducer(
      { ...initialState, list: [sampleUser] },
      deleteUser.fulfilled('1', 'requestId', '1')
    );

    expect(state.list).toEqual([]);
  });

  it('clears selectedUser on logout', () => {
    const state = reducer(
      { ...initialState, selectedUser: sampleUser },
      logout()
    );

    expect(state.selectedUser).toBeNull();
  });

  it('clears selectedUser via clearSelectedUser action', () => {
    const state = reducer(
      { ...initialState, selectedUser: sampleUser },
      clearSelectedUser()
    );

    expect(state.selectedUser).toBeNull();
  });
});
