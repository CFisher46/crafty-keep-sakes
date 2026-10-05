import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Grommet } from 'grommet';
import { buildTestStore } from '../../../test-utils/renderWithProviders';
import AuditLogs from './page';
import type { Audit } from '../../../types';

type SelectMultipleMockProps = {
  options: string[];
  placeholder: string;
  value: string[];
  onChange: (event: { value: string[] }) => void;
};

jest.mock('grommet', () => {
  const actual = jest.requireActual('grommet');

  return {
    ...actual,
    SelectMultiple: ({
      options,
      placeholder,
      value,
      onChange,
    }: SelectMultipleMockProps) => (
      <select
        aria-label={placeholder}
        multiple
        value={value}
        onChange={(event) =>
          onChange({
            value: Array.from(
              event.currentTarget.selectedOptions,
              (option) => option.value
            ),
          })
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    ),
  };
});

const auditLogs: Audit[] = [
  {
    id: 1,
    actor_user_id: 100,
    actor_role: 'admin',
    resource_type: 'user',
    resource_id: 'customer-1',
    action_type: 'CREATE',
    source_endpoint: '/api/v2/users',
    old_values_json: null,
    new_values_json: JSON.stringify({ first_name: 'Jane' }),
    created_at: '2026-01-01T12:00:00Z',
  },
  {
    id: 2,
    actor_user_id: 100,
    actor_role: 'admin',
    resource_type: 'user',
    resource_id: 'customer-2',
    action_type: 'UPDATE',
    source_endpoint: '/api/v2/basket/checkout',
    old_values_json: null,
    new_values_json: JSON.stringify({ email_address: 'jane@example.com' }),
    created_at: '2026-01-02T12:00:00Z',
  },
];

describe('AuditLogs', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const requestedUrl = new URL(String(url), 'http://localhost');
      if (requestedUrl.pathname.endsWith('/filters')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            actor_user_id: ['100'],
            actor_role: ['admin'],
            action_type: ['CREATE', 'UPDATE'],
            resource_type: ['user'],
            source_endpoint: ['/api/v2/basket/checkout', '/api/v2/users'],
          }),
        });
      }

      const selectedActions = requestedUrl.searchParams.getAll('action_type');
      const filteredLogs = selectedActions.length
        ? auditLogs.filter((log) => selectedActions.includes(log.action_type))
        : auditLogs;
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: filteredLogs, total_count: filteredLogs.length }),
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('offers filter values from all audit pages and applies selected filters to results', async () => {
    const store = buildTestStore({
      audit: {
        logs: auditLogs,
        totalCount: auditLogs.length,
        loading: false,
        error: null,
        filterOptions: {
          actor_user_id: [],
          actor_role: [],
          action_type: [],
          resource_type: [],
          source_endpoint: [],
        },
        filterOptionsLoading: false,
        filterOptionsError: null,
      },
    });

    render(
      <Grommet>
        <Provider store={store}>
          <AuditLogs />
        </Provider>
      </Grommet>
    );

    fireEvent.click(screen.getByText('Show Audit Table'));
    expect(
      await screen.findByRole('option', { name: '/api/v2/users' })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Filter action type'), {
      target: { value: 'UPDATE' },
    });

    const table = screen.getByRole('table');
    await waitFor(() => {
      expect(within(table).queryByText('customer-1')).not.toBeInTheDocument();
    });
    expect(within(table).getByText('customer-2')).toBeInTheDocument();

    const auditRequest = (global.fetch as jest.Mock).mock.calls
      .map(([url]) => new URL(String(url), 'http://localhost'))
      .find((url) => url.pathname.endsWith('/audit') && url.searchParams.has('action_type'));
    expect(auditRequest?.searchParams.getAll('action_type')).toEqual(['UPDATE']);
  });
});
