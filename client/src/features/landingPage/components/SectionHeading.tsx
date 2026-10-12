import React from 'react';
import { Box, Text } from 'grommet';
import { ui } from '../../../helpers/theme';

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle }) => (
  <Box gap="xxsmall">
    <Text
      as="h2"
      margin="none"
      style={{ fontFamily: ui.serif, fontSize: '24px', fontWeight: 400, color: ui.ink }}
    >
      {title}
    </Text>
    {subtitle && (
      <Text size="small" style={{ color: ui.muted }}>
        {subtitle}
      </Text>
    )}
  </Box>
);

export default SectionHeading;
