import { createUser, fetchAllUsers, fetchUserById } from './usersThunks';

describe('users thunks', () => {
  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it('includes credentials when fetching all users', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    await fetchAllUsers()(dispatch, getState, undefined);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v2/users'),
      expect.objectContaining({ credentials: 'include' })
    );
  });

  it('normalizes null user fields from the list response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 7,
          email: 'admin@example.com',
          first_name: null,
          last_name: null,
          address_line1: null,
          address_line2: null,
          address_line3: null,
          town: null,
          county: null,
          postcode: null,
          telephone_number: null,
          type: null,
          status: null,
          invoice_id: null,
          password: null,
        },
      ],
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    const result = await fetchAllUsers()(dispatch, getState, undefined);

    expect(result.payload).toEqual([
      {
        id: '7',
        email_address: 'admin@example.com',
        first_name: '',
        last_name: '',
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
    ]);
  });

  it('normalizes null user fields from the by-id response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 7,
        email: 'admin@example.com',
        first_name: null,
        last_name: null,
        address_line1: null,
        address_line2: null,
        address_line3: null,
        town: null,
        county: null,
        postcode: null,
        telephone_number: null,
        type: null,
        status: null,
        invoice_id: null,
        password: null,
      }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    const result = await fetchUserById('7')(dispatch, getState, undefined);

    expect(result.type).toBe('users/fetchUserById/fulfilled');
    expect(result.payload).toEqual({
      id: '7',
      email_address: 'admin@example.com',
      first_name: '',
      last_name: '',
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
    });
  });

  it('surfaces backend validation errors when user creation fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Missing required user fields' }),
    });

    const dispatch = jest.fn();
    const getState = jest.fn();

    const result = await createUser({})(dispatch, getState, undefined);

    expect(result.type).toBe('users/create/rejected');
    expect(result.payload).toBe('Missing required user fields');
  });
});