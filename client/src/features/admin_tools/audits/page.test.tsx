import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Grommet } from 'grommet';
import { buildTestStore } from '../../../test-utils/renderWithProviders';
import AuditLogs from './page';
import type { Audit } from './types';

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
    log_ref: 1,
    user: 'customer-1',
    field_changed: 'first_name',
    action_type: 'created',
    log_dttm: new Date('2026-01-01T12:00:00Z'),
    api_source: 'users',
    changed_by: 'admin-1',
  },
  {
    log_ref: 2,
    user: 'customer-2',
    field_changed: 'email_address',
    action_type: 'updated',
    log_dttm: new Date('2026-01-02T12:00:00Z'),
    api_source: 'users',
    changed_by: 'admin-1',
  },
];

describe('AuditLogs', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: auditLogs, total_count: auditLogs.length }),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('applies a selected filter to the audit table rows', async () => {
    const store = buildTestStore({
      audit: {
        logs: auditLogs,
        totalCount: auditLogs.length,
        loading: false,
        error: null,
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
    fireEvent.change(screen.getByLabelText('Filter action type'), {
      target: { value: 'updated' },
    });

    const table = screen.getByRole('table');
    await waitFor(() => {
      expect(within(table).queryByText('first_name')).not.toBeInTheDocument();
    });
    expect(within(table).getByText('email_address')).toBeInTheDocument();
  });
});
