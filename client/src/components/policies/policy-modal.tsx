import { useEffect, useState } from 'react';
import { Box, Layer, Text } from 'grommet';
import { ActionButton } from '../../features/landingPage/components/ActionButton';
import { ui } from '../../helpers/theme';
import type { Policy } from './policies';

interface PolicyModalProps {
  policy: Policy;
  onClose: () => void;
}

function PolicyModal({ policy, onClose }: PolicyModalProps) {
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const policyUrl = `${process.env.PUBLIC_URL}/policies/${encodeURIComponent(policy.fileName)}`;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setContentUrl(null);
    setError(false);

    const loadPolicy = async () => {
      try {
        const response = await fetch(
          policyUrl,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Policy request failed: ${response.status}`);
        const pdf = await response.blob();
        if (pdf.type.split(';')[0].trim().toLowerCase() !== 'application/pdf' || !pdf.size) {
          throw new Error('Policy file is not a PDF or is empty');
        }
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(pdf);
          setContentUrl(objectUrl);
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          console.error('Unable to load policy:', reason);
          setError(true);
        }
      }
    };

    loadPolicy();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [policyUrl]);

  return (
    <Layer
      modal
      responsive={false}
      onEsc={onClose}
      onClickOutside={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={policy.title}
      style={{ borderRadius: 0 }}
    >
      <Box
        pad="medium"
        gap="small"
        background={ui.page}
        style={{ width: 'min(100vw, max(70vw, 640px))', height: '100vh', maxHeight: '100dvh', overflow: 'auto' }}
      >
        <Box gap="xxsmall" style={{ flexShrink: 0 }}>
          <Text size="xsmall" style={{ color: ui.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Crafty Keepsakes · Policies
          </Text>
          <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '26px', fontWeight: 400, color: ui.ink }}>
            {policy.title}
          </Text>
        </Box>
        <Box overflow="auto" background={ui.sand} border={{ color: ui.line }} style={{ minHeight: 0, flex: '1 1 auto' }}>
          {error ? (
            <Text role="alert" color="status-critical" margin="small">
              Unable to load this policy. Please close and try again.
            </Text>
          ) : contentUrl === null ? (
            <Text role="status" margin="small" style={{ color: ui.muted }}>Loading policy...</Text>
          ) : (
            <iframe title={`${policy.title} PDF`} src={contentUrl} style={{ border: 0, width: '100%', height: '100%', minHeight: 0 }} />
          )}
        </Box>
        <Text size="small" style={{ color: ui.muted, flexShrink: 0 }}>
          If the PDF is not displayed,{' '}
          <a href={policyUrl} target="_blank" rel="noopener noreferrer" style={{ color: ui.ink, textDecoration: 'underline' }}>open {policy.title} in a new tab</a>.
        </Text>
        <Box alignSelf="end" style={{ flexShrink: 0 }}>
          <ActionButton label="Close" secondary fixed onClick={onClose} />
        </Box>
      </Box>
    </Layer>
  );
}

export default PolicyModal;
