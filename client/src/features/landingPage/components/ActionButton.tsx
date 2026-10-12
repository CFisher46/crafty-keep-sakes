import React, { useState } from 'react';
import { Button } from 'grommet';
import { ui } from '../../../helpers/theme';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
  fixed?: boolean;
  compact?: boolean;
  type?: 'button' | 'submit';
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, secondary, disabled, fixed, compact, type }) => {
  const [hovered, setHovered] = useState(false);

  const primary = {
    background: hovered ? ui.inkHover : ui.ink,
    color: 'white',
    border: `1px solid ${hovered ? ui.inkHover : ui.ink}`,
  };
  const outline = {
    background: hovered ? ui.ink : 'transparent',
    color: hovered ? 'white' : ui.ink,
    border: `1px solid ${ui.ink}`,
  };

  return (
    <Button
      plain
      label={label}
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: fixed || compact ? '0 0 auto' : '1 1 0',
        minWidth: compact ? 0 : fixed ? '130px' : '120px',
        whiteSpace: 'nowrap',
        height: compact ? '36px' : '44px',
        padding: compact ? '0 8px' : '0 20px',
        borderRadius: '2px',
        fontSize: compact ? '11px' : '12px',
        fontWeight: 600,
        letterSpacing: compact ? '0.06em' : '0.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        ...(secondary ? outline : primary),
      }}
    />
  );
};

export default ActionButton;
