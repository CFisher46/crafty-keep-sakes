import reducer from './usersSlice';
import { updateUser } from './usersThunks';

describe('users slice', () => {
  it('updates selectedUser when the update thunk succeeds', () => {
    const initialState = {
      list: [
        {
          id: '1',
          email_address: 'old@example.com',
          first_name: 'Old',
          last_name: 'Name',
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
        },
      ],
      selectedUser: {
        id: '1',
        email_address: 'old@example.com',
        first_name: 'Old',
        last_name: 'Name',
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
      },
      loading: false,
      error: null,
      isLoggedIn: false,
    };

    const nextState = reducer(
      initialState,
      updateUser.fulfilled(
        {
          id: '1',
          email_address: 'new@example.com',
          first_name: 'New',
          last_name: 'Name',
        },
        'users/update/fulfilled',
        { id: '1', user: { email_address: 'new@example.com' } }
      )
    );

    expect(nextState.selectedUser).toMatchObject({
      id: '1',
      email_address: 'new@example.com',
      first_name: 'New',
      last_name: 'Name',
    });
    expect(nextState.list[0]).toMatchObject({
      email_address: 'new@example.com',
      first_name: 'New',
      last_name: 'Name',
    });
  });
});