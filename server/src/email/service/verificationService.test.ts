import { afterEach, describe, expect, it } from '@jest/globals';
import { verificationFrontendUrl } from './verificationService';

describe('verification frontend URL selection', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalOrigins = process.env.VERIFICATION_FRONTEND_ORIGINS;

  afterEach(() => {
    if (originalFrontendUrl === undefined) delete process.env.FRONTEND_URL;
    else process.env.FRONTEND_URL = originalFrontendUrl;
    if (originalOrigins === undefined) delete process.env.VERIFICATION_FRONTEND_ORIGINS;
    else process.env.VERIFICATION_FRONTEND_ORIGINS = originalOrigins;
  });

  it('defaults to localhost when no frontend URL is configured', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.VERIFICATION_FRONTEND_ORIGINS;
    expect(verificationFrontendUrl()).toBe('http://localhost:3000');
  });

  it.each([
    ['http://localhost:3000', 'http://localhost:3000'],
    ['https://dev.craftykeepsakes.uk', 'https://dev.craftykeepsakes.uk'],
    ['https://craftykeepsakes.uk', 'https://craftykeepsakes.uk'],
    ['https://dev.craftykeepsakes.uk.attacker.example', 'https://craftykeepsakes.uk'],
    ['null', 'https://craftykeepsakes.uk'],
    [undefined, 'https://craftykeepsakes.uk'],
  ])('selects an allowlisted origin or the configured default', (origin, expected) => {
    process.env.FRONTEND_URL = 'https://craftykeepsakes.uk/';
    process.env.VERIFICATION_FRONTEND_ORIGINS =
      'http://localhost:3000, https://dev.craftykeepsakes.uk, https://craftykeepsakes.uk';
    expect(verificationFrontendUrl(origin)).toBe(expected);
  });
});
