import React, { useEffect, useMemo, useState } from 'react';
import { Box, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../../../api/apiPath';
import { ui } from '../../../helpers/theme';
import ActionButton from '../../landingPage/components/ActionButton';
import DateFilter from '../DateFilter';
import { buildCsv, downloadCsv } from './csv';

export interface ReportColumn<Row> {
  key: string;
  label: string;
  numeric?: boolean;
  value: (row: Row) => string | number;
}

interface ReportViewProps<Row> {
  title: string;
  description: string;
  endpoint: string;
  filename: string;
  columns: ReportColumn<Row>[];
  extractRows: (data: any) => Row[];
  extraParams?: Record<string, string>;
  filterRows?: (row: Row) => boolean;
  dateHint?: string;
  renderCharts?: (rows: Row[]) => React.ReactNode;
  children?: React.ReactNode;
}

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

const PAGE_SIZES = ['10', '20', '50', '100', 'All'] as const;

const cell: React.CSSProperties = { padding: '10px 12px', borderBottom: `1px solid ${ui.line}`, fontSize: 14 };

export default function ReportView<Row>({
  title,
  description,
  endpoint,
  filename,
  columns,
  extractRows,
  extraParams,
  filterRows,
  dateHint,
  renderCharts,
  children,
}: ReportViewProps<Row>) {
  const navigate = useNavigate();
  const [applied, setApplied] = useState({ from: '', to: '' });
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>('10');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<unknown>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const extraKey = JSON.stringify(extraParams ?? {});

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(JSON.parse(extraKey));
    if (applied.from) params.set('from', applied.from);
    if (applied.to) params.set('to', applied.to);
    const query = params.toString();

    setStatus('loading');
    fetch(buildApiUrl('reports', `${endpoint}${query ? `?${query}` : ''}`, 'v2'), { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Request failed');
        return response.json();
      })
      .then((body) => {
        if (!active) return;
        setData(body.data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [endpoint, applied, extraKey]);

  const allRows = useMemo(() => (status === 'ready' && data !== null ? extractRows(data) : []), [data, status, extractRows]);
  const rows = useMemo(() => (filterRows ? allRows.filter(filterRows) : allRows), [allRows, filterRows]);

  const size = pageSize === 'All' ? Math.max(rows.length, 1) : Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * size;
  const pageRows = rows.slice(firstIndex, firstIndex + size);

  // A new filter or data set can change the row count, so start again from page 1
  useEffect(() => {
    setPage(1);
  }, [data, applied, pageSize, filterRows]);

  // Export uses every filtered row, not just the page on screen
  const exportCsv = () => {
    const suffix = [applied.from, applied.to].filter(Boolean).join('_to_');
    downloadCsv(`${filename}${suffix ? `-${suffix}` : ''}.csv`, buildCsv(columns, rows));
  };

  return (
    <Box gap="large" pad="xsmall">
      <Box gap="xxsmall">
        <Text style={eyebrow}>Reporting</Text>
        <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
          {title}
        </Text>
        <Text style={{ color: ui.muted }}>{description}</Text>
      </Box>

      <DateFilter onApply={setApplied} hint={dateHint}>
        {children}
      </DateFilter>

      <Box direction="row" justify="between" align="center" wrap gap="small">
        <Text size="small" style={{ color: ui.muted }}>
          {status === 'ready' ? `${rows.length} ${rows.length === 1 ? 'row' : 'rows'}` : ' '}
        </Text>
        <Box direction="row" gap="small">
          <ActionButton label="Export CSV" onClick={exportCsv} disabled={status !== 'ready' || rows.length === 0} compact />
          <ActionButton label="Back to reporting" secondary compact onClick={() => navigate('/Reporting')} />
        </Box>
      </Box>

      {status === 'ready' && allRows.length > 0 && renderCharts && (
        <Box direction="row" wrap style={{ gap: 24 }}>
          {renderCharts(allRows)}
        </Box>
      )}

      {status === 'loading' && <Text style={{ color: ui.muted }}>Loading report...</Text>}
      {status === 'error' && <Text role="alert" style={{ color: '#a33' }}>Unable to load this report right now.</Text>}
      {status === 'ready' && rows.length === 0 && <Text style={{ color: ui.muted }}>No data for the selected filters.</Text>}

      {status === 'ready' && rows.length > 0 && (
        <Box background="white" style={{ border: `1px solid ${ui.line}`, borderRadius: '2px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ ...cell, ...eyebrow, textAlign: column.numeric ? 'right' : 'left', background: ui.sand }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row, index) => (
                <tr key={firstIndex + index}>
                  {columns.map((column) => (
                    <td key={column.key} style={{ ...cell, textAlign: column.numeric ? 'right' : 'left', color: ui.ink }}>
                      {column.value(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}

      {status === 'ready' && rows.length > 0 && (
        <Box direction="row" justify="between" align="center" wrap gap="small">
          <Box direction="row" align="center" gap="small">
            <label htmlFor="report-page-size" style={eyebrow}>Rows per page</label>
            <select
              id="report-page-size"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as (typeof PAGE_SIZES)[number])}
              style={{ padding: '6px 8px', border: `1px solid ${ui.line}`, borderRadius: 2, font: 'inherit', fontSize: 14, color: ui.ink, background: 'white' }}
            >
              {PAGE_SIZES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </Box>
          <Text size="small" style={{ color: ui.muted }} aria-live="polite">
            Showing {firstIndex + 1}–{firstIndex + pageRows.length} of {rows.length}
          </Text>
          <Box direction="row" align="center" gap="small">
            <ActionButton label="Previous" secondary compact disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} />
            <Text size="small" style={{ color: ui.muted }}>
              Page {currentPage} of {totalPages}
            </Text>
            <ActionButton label="Next" secondary compact disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)} />
          </Box>
        </Box>
      )}
    </Box>
  );
}
