import { useCallback, useState } from 'react';
import { Box } from 'grommet';
import { ui } from '../../../helpers/theme';
import ReportView, { ReportColumn } from './ReportView';
import { HorizontalBarChart } from '../charts';

interface UserRow {
  name: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string | null;
  last_login_at: string | null;
  days_since_login: number | null;
  is_dormant: boolean;
  orders: number;
  total_spent: number;
}

const day = (value: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '');

const columns: ReportColumn<UserRow>[] = [
  { key: 'name', label: 'Name', value: (row) => row.name ?? '' },
  { key: 'email', label: 'Email', value: (row) => row.email },
  { key: 'role', label: 'Role', value: (row) => row.role },
  { key: 'status', label: 'Status', value: (row) => row.status },
  { key: 'created', label: 'Registered', value: (row) => day(row.created_at) },
  { key: 'login', label: 'Last login', value: (row) => (row.last_login_at ? day(row.last_login_at) : 'Not recorded') },
  { key: 'days', label: 'Days since login', numeric: true, value: (row) => row.days_since_login ?? '' },
  { key: 'dormant', label: 'Dormant', value: (row) => (row.is_dormant ? 'Yes' : 'No') },
  { key: 'orders', label: 'Orders', numeric: true, value: (row) => row.orders },
  { key: 'spent', label: 'Spent (£)', numeric: true, value: (row) => row.total_spent.toFixed(2) },
];

const extractRows = (data: unknown) => (data as { users: UserRow[] }).users;

const renderCharts = (rows: UserRow[]) => {
  const dormant = rows.filter((row) => row.is_dormant).length;
  return (
    <>
      <HorizontalBarChart
        title="Active vs dormant accounts"
        data={[
          { label: 'Active', value: rows.length - dormant },
          { label: 'Dormant', value: dormant },
        ]}
      />
      <HorizontalBarChart
        title="Top customers by spend (£)"
        data={[...rows]
          .filter((row) => row.total_spent > 0)
          .sort((a, b) => b.total_spent - a.total_spent)
          .slice(0, 10)
          .map((row) => ({ label: row.name || row.email, value: row.total_spent }))}
        format={(value) => value.toFixed(2)}
        emptyMessage="No spend in this period."
      />
    </>
  );
};

const inputStyle = {
  padding: '8px 10px',
  border: `1px solid ${ui.line}`,
  borderRadius: 2,
  font: 'inherit',
  fontSize: 14,
  width: 90,
  color: ui.ink,
};

export default function UsersReportPage() {
  const [inactiveDays, setInactiveDays] = useState('90');
  const [dormantOnly, setDormantOnly] = useState(false);
  const dormantFilter = useCallback((row: UserRow) => !dormantOnly || row.is_dormant, [dormantOnly]);
  const days = Number(inactiveDays);
  const validDays = Number.isInteger(days) && days >= 1 && days <= 3650;

  return (
    <ReportView<UserRow>
      title="User activity"
      description="Account activity and ordering per user. Accounts not seen for a while are marked as dormant."
      endpoint="/users"
      filename="user-activity"
      columns={columns}
      extractRows={extractRows}
      renderCharts={renderCharts}
      extraParams={validDays ? { inactiveDays: String(days) } : undefined}
      filterRows={dormantFilter}
      dateHint="Dates filter the orders and spend columns. Accounts that have never logged in since login tracking began are measured from when they registered."
    >
      <Box gap="xxsmall">
        <label htmlFor="report-inactive-days" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: ui.muted }}>
          Dormant after (days)
        </label>
        <input
          id="report-inactive-days"
          type="number"
          min={1}
          max={3650}
          value={inactiveDays}
          onChange={(e) => setInactiveDays(e.target.value)}
          style={inputStyle}
        />
      </Box>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, color: ui.ink }}>
        <input type="checkbox" checked={dormantOnly} onChange={(e) => setDormantOnly(e.target.checked)} />
        Dormant users only
      </label>
    </ReportView>
  );
}
