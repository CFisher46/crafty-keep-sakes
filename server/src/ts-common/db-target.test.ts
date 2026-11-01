import { assertDbTargetAllowed, isLocalDbHost } from './db-target';

describe('db-target', () => {
  it.each(['localhost', '127.0.0.1', '192.168.1.20', '10.0.0.5', 'db', 'mysql.railway.internal'])(
    'treats %s as local',
    (host) => expect(isLocalDbHost(host)).toBe(true)
  );

  it('treats a public proxy host as remote', () => {
    expect(isLocalDbHost('acela.proxy.rlwy.net')).toBe(false);
  });

  it('blocks a remote host in development without opt-in', () => {
    expect(() =>
      assertDbTargetAllowed({ NODE_ENV: 'development', DB_HOST: 'acela.proxy.rlwy.net' })
    ).toThrow(/Refusing/);
  });

  it('allows a remote host with ALLOW_REMOTE_DB=1', () => {
    expect(() =>
      assertDbTargetAllowed({ DB_HOST: 'acela.proxy.rlwy.net', ALLOW_REMOTE_DB: '1' })
    ).not.toThrow();
  });

  it('does not apply in production or test', () => {
    expect(() => assertDbTargetAllowed({ NODE_ENV: 'production', DB_HOST: 'x.example.com' })).not.toThrow();
    expect(() => assertDbTargetAllowed({ NODE_ENV: 'test', DB_HOST: 'x.example.com' })).not.toThrow();
  });
});
