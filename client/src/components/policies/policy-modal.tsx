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
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setContent(null);
    setError(false);

    const loadPolicy = async () => {
      try {
        const response = await fetch(
          `${process.env.PUBLIC_URL}/policies/${policy.fileName}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Policy request failed: ${response.status}`);
        const text = await response.text();
        if (!text.trim()) throw new Error('Policy file is empty');
        if (!controller.signal.aborted) setContent(text);
      } catch (reason) {
        if (!controller.signal.aborted) {
          console.error('Unable to load policy:', reason);
          setError(true);
        }
      }
    };

    loadPolicy();
    return () => controller.abort();
  }, [policy.fileName]);

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
        background="white"
        style={{ width: 'min(90vw, 700px)', maxHeight: '90vh' }}
      >
        <Text as="h2" margin="none" style={{ fontFamily: ui.serif, fontSize: '26px', color: ui.ink, flexShrink: 0 }}>
          {policy.title}
        </Text>
        <Box overflow="auto" style={{ minHeight: 0, flex: '1 1 auto' }}>
          {error ? (
            <Text role="alert" color="status-critical">
              Unable to load this policy. Please close and try again.
            </Text>
          ) : content === null ? (
            <Text role="status">Loading policy...</Text>
          ) : (
            <Text style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: ui.ink }}>
              {content}
            </Text>
          )}
        </Box>
        <Box alignSelf="end" style={{ flexShrink: 0 }}>
          <ActionButton label="Close" secondary fixed onClick={onClose} />
        </Box>
      </Box>
    </Layer>
  );
}

export default PolicyModal;
