import React from 'react';
import { Button } from 'grommet';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  secondary?: boolean;
}

const baseStyle: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: '120px',
  height: '40px',
  padding: '0 16px',
  borderRadius: '4px',
  fontWeight: 500,
  textAlign: 'center',
  color: '#1a1a1a',
};

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, secondary }) => (
  <Button
    plain
    label={label}
    onClick={onClick}
    style={
      secondary
        ? { ...baseStyle, background: 'white', border: '1px solid #e6d3dc' }
        : { ...baseStyle, background: '#F4C2C2', border: '1px solid #F4C2C2' }
    }
  />
);

export default ActionButton;
