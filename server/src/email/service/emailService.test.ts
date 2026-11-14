const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

describe('email senders', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
    delete process.env.RESEND_CONTACT_FROM_EMAIL;
    delete process.env.RESEND_VERIFICATION_FROM_EMAIL;
    delete process.env.RESEND_FROM_EMAIL;
    mockSend.mockReset().mockResolvedValue({ data: { id: 'test' }, error: null });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the enquiry sender and preserves the visitor reply-to', async () => {
    process.env.RESEND_FROM_EMAIL = 'Verification <verify@example.com>';
    const { sendEmail } = await import('./emailService');
    const React = await import('react');
    await sendEmail({
      from: 'contact',
      email: 'craftykeepsakesprints@gmail.com',
      subject: 'Enquiry',
      template: React.createElement('div'),
      text: 'Enquiry',
      replyTo: 'visitor@example.com',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Crafty Keepsakes <enquires@craftykeepsakes.uk>',
      to: ['craftykeepsakesprints@gmail.com'],
      replyTo: 'visitor@example.com',
    }));
  });

  it('respects a contact-specific sender override', async () => {
    process.env.RESEND_CONTACT_FROM_EMAIL = 'Contact <contact@example.com>';
    const { sendEmail } = await import('./emailService');
    const React = await import('react');
    await sendEmail({
      from: 'contact',
      email: 'craftykeepsakesprints@gmail.com',
      subject: 'Enquiry',
      template: React.createElement('div'),
      text: 'Enquiry',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Contact <contact@example.com>',
    }));
    expect(mockSend.mock.calls[0][0]).not.toHaveProperty('replyTo');
  });

  it('uses the verification-specific sender ahead of the legacy setting', async () => {
    process.env.RESEND_VERIFICATION_FROM_EMAIL = 'Verification <new@example.com>';
    process.env.RESEND_FROM_EMAIL = 'Legacy <old@example.com>';
    process.env.RESEND_CONTACT_FROM_EMAIL = 'Contact <contact@example.com>';
    const { sendEmail } = await import('./emailService');
    const React = await import('react');
    await sendEmail({
      from: 'verify',
      email: 'visitor@example.com',
      subject: 'Verification',
      template: React.createElement('div'),
      text: 'Verify',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Verification <new@example.com>',
    }));
  });

  it('preserves the legacy verification sender when the new setting is absent', async () => {
    process.env.RESEND_FROM_EMAIL = 'Legacy <old@example.com>';
    const { sendEmail } = await import('./emailService');
    const React = await import('react');
    await sendEmail({
      from: 'verify',
      email: 'visitor@example.com',
      subject: 'Verification',
      template: React.createElement('div'),
      text: 'Verify',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Legacy <old@example.com>',
    }));
  });

  it('uses the verification default without either setting', async () => {
    const { sendEmail } = await import('./emailService');
    const React = await import('react');
    await sendEmail({
      from: 'verify',
      email: 'visitor@example.com',
      subject: 'Verification',
      template: React.createElement('div'),
      text: 'Verify',
    });
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'Email Verification <verify@craftykeepsakes.uk>',
    }));
  });
});
