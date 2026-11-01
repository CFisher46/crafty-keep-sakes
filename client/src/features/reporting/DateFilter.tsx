import React, { useState } from 'react';
import { Box, Text } from 'grommet';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';

export interface DateRangeValue {
  from: string;
  to: string;
}

interface DateFilterProps {
  onApply: (range: DateRangeValue) => void;
  hint?: string;
  clearLabel?: string;
  children?: React.ReactNode;
}

const eyebrow = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: `1px solid ${ui.line}`,
  borderRadius: 2,
  font: 'inherit',
  fontSize: 14,
  color: ui.ink,
  background: 'white',
};

export default function DateFilter({ onApply, hint, clearLabel = 'Clear dates', children }: DateFilterProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const rangeInvalid = Boolean(from && to && from > to);

  return (
    <Box
      direction="row"
      gap="medium"
      align="end"
      wrap
      pad="medium"
      background="white"
      style={{ border: `1px solid ${ui.line}`, borderRadius: '2px' }}
    >
      <Box gap="xxsmall">
        <label htmlFor="report-from" style={eyebrow}>From</label>
        <input id="report-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} style={inputStyle} />
      </Box>
      <Box gap="xxsmall">
        <label htmlFor="report-to" style={eyebrow}>To</label>
        <input id="report-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
      </Box>
      {children}
      <Box direction="row" gap="small">
        <ActionButton label="Apply" onClick={() => onApply({ from, to })} disabled={rangeInvalid} compact />
        <ActionButton
          label={clearLabel}
          secondary
          compact
          onClick={() => {
            setFrom('');
            setTo('');
            onApply({ from: '', to: '' });
          }}
        />
      </Box>
      {rangeInvalid && (
        <Text role="alert" size="small" style={{ color: '#a33' }}>
          The From date must not be after the To date.
        </Text>
      )}
      {hint && (
        <Text size="small" style={{ color: ui.muted, flexBasis: '100%' }}>
          {hint}
        </Text>
      )}
    </Box>
  );
}
