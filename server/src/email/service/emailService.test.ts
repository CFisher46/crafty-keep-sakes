const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send: mockSend } })),
}));

describe('contact email sender', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' };
    delete process.env.RESEND_CONTACT_FROM_EMAIL;
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
});
