import React from 'react';
import { Box, Text } from 'grommet';
import { ui } from '../../helpers/theme';

export interface ChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  title: string;
  data: ChartDatum[];
  format?: (value: number) => string;
  emptyMessage?: string;
}

const chartTitle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: ui.muted,
};

const Frame = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box
    gap="small"
    pad="medium"
    background="white"
    flex
    style={{ border: `1px solid ${ui.line}`, borderRadius: '2px', minWidth: 280 }}
  >
    <Text style={chartTitle}>{title}</Text>
    {children}
  </Box>
);

// Horizontal bars suit named categories such as products or posts
export function HorizontalBarChart({ title, data, format = String, emptyMessage = 'No data to chart.' }: BarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 0);

  return (
    <Frame title={title}>
      {data.length === 0 || max === 0 ? (
        <Text size="small" style={{ color: ui.muted }}>{emptyMessage}</Text>
      ) : (
        <ul aria-label={title} style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {data.map((item) => (
            <li key={item.label} style={{ display: 'grid', gap: 2 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: ui.ink }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                <strong>{format(item.value)}</strong>
              </span>
              <span aria-hidden="true" style={{ display: 'block', background: ui.sand, height: 8 }}>
                <span
                  style={{ display: 'block', height: 8, width: `${(item.value / max) * 100}%`, background: ui.accent }}
                />
              </span>
            </li>
          ))}
        </ul>
      )}
    </Frame>
  );
}

// Vertical columns suit a value over time
export function ColumnChart({ title, data, format = String, emptyMessage = 'No data to chart.' }: BarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 0);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <Frame title={title}>
      {data.length === 0 || max === 0 ? (
        <Text size="small" style={{ color: ui.muted }}>{emptyMessage}</Text>
      ) : (
        <div role="img" aria-label={`${title}: ${data.map((item) => `${item.label} ${format(item.value)}`).join(', ')}`}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140, borderBottom: `1px solid ${ui.line}` }}>
            {data.map((item) => (
              <div
                key={item.label}
                title={`${item.label}: ${format(item.value)}`}
                style={{
                  flex: 1,
                  minWidth: 2,
                  height: `${(item.value / max) * 100}%`,
                  minHeight: item.value > 0 ? 2 : 0,
                  background: ui.accent,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 2, marginTop: 4 }}>
            {data.map((item, index) => (
              <span
                key={item.label}
                aria-hidden="true"
                style={{ flex: 1, minWidth: 2, fontSize: 10, color: ui.muted, whiteSpace: 'nowrap', overflow: 'visible' }}
              >
                {index % labelEvery === 0 ? item.label : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </Frame>
  );
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Box
      gap="xxsmall"
      pad="medium"
      background="white"
      flex
      style={{ border: `1px solid ${ui.line}`, borderRadius: '2px', minWidth: 150 }}
    >
      <Text style={chartTitle}>{label}</Text>
      <Text style={{ fontFamily: ui.serif, fontSize: 28, color: ui.ink }}>{value}</Text>
    </Box>
  );
}
