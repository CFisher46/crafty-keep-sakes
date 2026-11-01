import { getStoredImagePath, readObjectStorageConfig } from './image-storage';

const full = {
  MINIO_PRIVATE_ENDPOINT: 'bucket.railway.internal:9000',
  MINIO_ACCESS_KEY: 'access',
  MINIO_SECRET_KEY: 'secret',
  MINIO_PUBLIC_URL: 'https://files.example.test/images/',
};

describe('readObjectStorageConfig', () => {
  it('stays on disk when nothing is configured', () => {
    expect(readObjectStorageConfig({})).toBeNull();
  });

  it('stays on disk when the public URL is missing', () => {
    const env: NodeJS.ProcessEnv = { ...full };
    delete env.MINIO_PUBLIC_URL;
    expect(readObjectStorageConfig(env)).toBeNull();
  });

  it('adds a scheme, defaults the bucket and trims the public URL', () => {
    expect(readObjectStorageConfig(full)).toEqual({
      endpoint: 'http://bucket.railway.internal:9000',
      accessKey: 'access',
      secretKey: 'secret',
      bucket: 'images',
      publicUrl: 'https://files.example.test/images',
    });
  });

  it('prefers MINIO_ENDPOINT and MINIO_BUCKET when set', () => {
    const config = readObjectStorageConfig({
      ...full,
      MINIO_ENDPOINT: 'https://proxy.example.test:1234',
      MINIO_BUCKET: 'other',
    });
    expect(config?.endpoint).toBe('https://proxy.example.test:1234');
    expect(config?.bucket).toBe('other');
  });
});

describe('getStoredImagePath', () => {
  it('uses the full URL when the file was stored remotely', () => {
    const file = { filename: 'a.png', storedPath: 'https://files.example.test/a.png' } as unknown as Express.Multer.File;
    expect(getStoredImagePath(file)).toBe('https://files.example.test/a.png');
  });

  it('falls back to a /images path for disk files', () => {
    const file = { filename: 'a.png' } as Express.Multer.File;
    expect(getStoredImagePath(file)).toBe('/images/a.png');
    expect(getStoredImagePath(file, 'blog/')).toBe('/images/blog/a.png');
  });
});
