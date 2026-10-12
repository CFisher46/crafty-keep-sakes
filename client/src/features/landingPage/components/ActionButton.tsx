import React, { useState } from 'react';
import { Button } from 'grommet';
import { ui } from '../../../helpers/theme';

interface ActionButtonProps {
  label: string;
  onClick: () => void;
  secondary?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({ label, onClick, secondary }) => {
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
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: '1 1 0',
        minWidth: '120px',
        height: '44px',
        padding: '0 20px',
        borderRadius: '2px',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        ...(secondary ? outline : primary),
      }}
    />
  );
};

export default ActionButton;
