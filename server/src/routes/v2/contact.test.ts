import express from 'express';
import request from 'supertest';
import { createContactRouter } from './contact';
import { sendEmail } from '../../email/service/emailService';
import ContactEnquiry from '../../email/templates/ContactEnquiry';

jest.mock('../../email/service/emailService', () => ({ sendEmail: jest.fn() }));
const mockSend = sendEmail as jest.Mock;

const valid = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  telephone: '+44 1234 567890',
  eventDate: '2027-06-12',
  enquiry: 'Please tell me about your invitations.',
  website: '',
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  const router = createContactRouter();
  app.use('/api/contact', router);
  app.use('/api/v2/contact', router);
  return app;
}

describe('contact enquiries', () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({ id: 'test' });
  });

  it('sends a guest enquiry to the fixed recipient with reply-to and all fields', async () => {
    const response = await request(createTestApp()).post('/api/v2/contact').send(valid);
    expect(response.status).toBe(200);
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      from: 'contact',
      email: 'craftykeepsakesprints@gmail.com',
      replyTo: 'jane@example.com',
      text: expect.stringContaining('Wedding or event date: 2027-06-12'),
    }));
    expect(mockSend.mock.calls[0][0].text).toContain(valid.enquiry);
    expect(mockSend.mock.calls[0][0].text).toContain(valid.telephone);
    expect(mockSend.mock.calls[0][0].template.type).toBe(ContactEnquiry);
    expect(mockSend.mock.calls[0][0].template.props).toEqual({
      name: valid.name,
      email: valid.email,
      telephone: valid.telephone,
      eventDate: valid.eventDate,
      enquiry: valid.enquiry,
    });
  });

  it('accepts a telephone-only enquiry without a reply-to address', async () => {
    const response = await request(createTestApp()).post('/api/contact').send({ ...valid, email: '', eventDate: '' });
    expect(response.status).toBe(200);
    expect(mockSend.mock.calls[0][0]).not.toHaveProperty('replyTo');
  });

  it('accepts an email-only enquiry', async () => {
    expect((await request(createTestApp()).post('/api/v2/contact').send({ ...valid, telephone: '' })).status).toBe(200);
  });

  it.each([
    { name: '' },
    { email: '', telephone: '' },
    { email: 'not-an-email' },
    { telephone: '123abc4567' },
    { telephone: '123' },
    { eventDate: '2027-02-29' },
    { enquiry: '' },
    { enquiry: 'x'.repeat(5001) },
    { website: 'bot.example' },
    { email: { address: 'invalid' } },
  ])('rejects invalid input %p without sending', async (changes) => {
    const response = await request(createTestApp()).post('/api/v2/contact').send({ ...valid, ...changes });
    expect(response.status).toBe(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('reports an email provider failure rather than claiming success', async () => {
    mockSend.mockRejectedValue(new Error('provider failed'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createTestApp()).post('/api/v2/contact').send(valid);
    expect(response.status).toBe(503);
    expect(response.body.error).toMatch(/Unable to send/);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it('limits requests across both API paths', async () => {
    const app = createTestApp();
    for (let i = 0; i < 5; i += 1) {
      expect((await request(app).post('/api/contact').send(valid)).status).toBe(200);
    }
    const response = await request(app).post('/api/v2/contact').send(valid);
    expect(response.status).toBe(429);
    expect(mockSend).toHaveBeenCalledTimes(5);
  });
});
