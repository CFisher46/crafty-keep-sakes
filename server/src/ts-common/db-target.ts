const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|[^.]+$|.*\.internal$|.*\.local$)/i;

export const isLocalDbHost = (host: string | undefined): boolean => !host || PRIVATE_HOST.test(host);

// Stops a local server being pointed at a remote database by a stray .env edit.
export const assertDbTargetAllowed = (env: NodeJS.ProcessEnv = process.env): void => {
  if (env.NODE_ENV === 'production' || env.NODE_ENV === 'test') return;
  if (isLocalDbHost(env.DB_HOST) || env.ALLOW_REMOTE_DB === '1') return;
  throw new Error(
    `Refusing to connect to remote DB host "${env.DB_HOST}" outside production. ` +
      'Use "npm run dev:railway" (sets ALLOW_REMOTE_DB=1) if this is intended.'
  );
};

export const describeDbTarget = (env: NodeJS.ProcessEnv = process.env): string =>
  `${env.DB_HOST ?? '(unset)'}:${env.DB_PORT ?? '(unset)'}/${env.DB_DATABASE ?? '(unset)'}`;
