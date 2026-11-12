import fs from 'fs';
import path from 'path';

it('routes same-origin API requests to Railway before the SPA fallback', () => {
  const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'));

  expect(config.rewrites).toEqual([
    { source: '/api/:path*', destination: 'https://api-prd.craftykeepsakes.uk/api/:path*' },
    { source: '/((?!api/).*)', destination: '/index.html' },
  ]);
});
