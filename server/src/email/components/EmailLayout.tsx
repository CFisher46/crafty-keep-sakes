import {
  Body,
  Container,
  Head,
  Html,
  Preview,
} from 'react-email';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

export default function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: '#FAF8F5', color: '#2B2623', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '36px', margin: '30px auto', maxWidth: '520px' }}>
          {children}
        </Container>
      </Body>
    </Html>
  );
}