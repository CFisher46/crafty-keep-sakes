import { useEffect, useState } from 'react';
import { Box, Text } from 'grommet';
import { buildApiUrl } from '../../api/apiPath';
import DateFilter, { DateRangeValue } from './DateFilter';
import { ColumnChart, HorizontalBarChart, StatTile } from './charts';

interface Overview {
  from: string;
  to: string;
  granularity: 'day' | 'month';
  totals: {
    orders: number;
    revenue: number;
    customers: number;
    units: number;
    new_users: number;
  };
  series: Array<{ period: string; orders: number; revenue: number }>;
  top_products: Array<{ product_name: string; units: number }>;
}

const shortLabel = (period: string, granularity: 'day' | 'month') =>
  granularity === 'month' ? period : period.slice(5);

export default function ReportingDashboard() {
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '' });
  const [overview, setOverview] = useState<Overview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    const query = params.toString();

    setFailed(false);
    fetch(
      buildApiUrl('reports', `/overview${query ? `?${query}` : ''}`, 'v2'),
      { credentials: 'include' }
    )
      .then(async (response) => {
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      })
      .then((body) => {
        if (active) setOverview(body.data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
    };
  }, [range]);

  const granularity = overview?.granularity ?? 'day';

  return (
    <Box style={{ gap: 24 }}>
      <DateFilter
        onApply={setRange}
        clearLabel="Last 30 days"
        hint={
          overview
            ? `Showing ${overview.from} to ${overview.to}. With no dates chosen the last 30 days are shown.`
            : 'With no dates chosen the last 30 days are shown.'
        }
      />

      {failed && (
        <Text role="alert" style={{ color: '#a33' }}>
          Unable to load the dashboard right now.
        </Text>
      )}

      {overview && (
        <Box style={{ gap: 24 }}>
          <Box direction="row" wrap style={{ gap: 24 }}>
            <StatTile label="Orders" value={String(overview.totals.orders)} />
            <StatTile
              label="Revenue"
              value={`£${overview.totals.revenue.toFixed(2)}`}
            />
            <StatTile
              label="Units sold"
              value={String(overview.totals.units)}
            />
            <StatTile
              label="Customers ordering"
              value={String(overview.totals.customers)}
            />
            <StatTile
              label="New accounts"
              value={String(overview.totals.new_users)}
            />
          </Box>
          <Box direction="row" wrap style={{ gap: 24 }}>
            <ColumnChart
              title={`Revenue per ${granularity} (£)`}
              data={overview.series.map((point) => ({
                label: shortLabel(point.period, granularity),
                value: point.revenue,
              }))}
              format={(value) => value.toFixed(2)}
              emptyMessage="No orders in this period."
            />
            <ColumnChart
              title={`Orders per ${granularity}`}
              data={overview.series.map((point) => ({
                label: shortLabel(point.period, granularity),
                value: point.orders,
              }))}
              emptyMessage="No orders in this period."
            />
            <HorizontalBarChart
              title="Top 5 products by units"
              data={overview.top_products.map((item) => ({
                label: item.product_name,
                value: item.units,
              }))}
              emptyMessage="No sales in this period."
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
