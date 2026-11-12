import request from 'supertest';
import { createApp } from '../../app';
import { sendEmail } from '../../email/service/emailService';

jest.mock('../../ts-common/database', () => ({ db: { query: jest.fn(), getConnection: jest.fn() } }));
jest.mock('../../email/service/emailService', () => ({ sendEmail: jest.fn() }));

it.each(['/api/contact', '/api/v2/contact'])('mounts the public contact route at %s', async (path) => {
  (sendEmail as jest.Mock).mockResolvedValue({ id: 'test' });
  const response = await request(createApp()).post(path).send({
    name: 'Guest',
    email: 'guest@example.com',
    telephone: '',
    eventDate: '',
    enquiry: 'Hello',
    website: '',
  });
  expect(response.status).toBe(200);
  expect(sendEmail).toHaveBeenCalled();
});
