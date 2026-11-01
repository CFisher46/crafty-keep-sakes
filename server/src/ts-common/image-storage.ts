import fs from 'fs';
import path from 'path';
import { Request } from 'express';
import multer, { StorageEngine } from 'multer';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getProductImagesDirectory } from './upload-images-directory';

export type ObjectStorageConfig = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  publicUrl: string;
};

const read = (env: NodeJS.ProcessEnv, name: string): string => (env[name] || '').trim();

const withScheme = (value: string): string => (/^https?:\/\//i.test(value) ? value : `http://${value}`);

/**
 * Returns the MinIO/S3 settings, or null when image storage should stay on local disk.
 * MINIO_ENDPOINT (for example a public proxy when running locally) wins over MINIO_PRIVATE_ENDPOINT.
 * MINIO_PUBLIC_URL is the base browsers use to load images and is required, because the stored value is a full URL.
 */
export const readObjectStorageConfig = (env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig | null => {
  const endpoint = read(env, 'MINIO_ENDPOINT') || read(env, 'MINIO_PRIVATE_ENDPOINT');
  const accessKey = read(env, 'MINIO_ACCESS_KEY');
  const secretKey = read(env, 'MINIO_SECRET_KEY');
  const publicUrl = read(env, 'MINIO_PUBLIC_URL').replace(/\/+$/, '');

  if (!endpoint || !accessKey || !secretKey || !publicUrl) {
    return null;
  }

  return {
    endpoint: withScheme(endpoint),
    accessKey,
    secretKey,
    bucket: read(env, 'MINIO_BUCKET') || 'images',
    publicUrl,
  };
};

let cachedClient: { key: string; client: S3Client } | null = null;

const getClient = (config: ObjectStorageConfig): S3Client => {
  const key = `${config.endpoint}|${config.accessKey}`;
  if (!cachedClient || cachedClient.key !== key) {
    cachedClient = {
      key,
      client: new S3Client({
        endpoint: config.endpoint,
        region: 'us-east-1',
        forcePathStyle: true,
        credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
      }),
    };
  }
  return cachedClient.client;
};

// Tests always use disk, because the real server/.env is loaded by dotenv and would otherwise leak in.
const activeConfig = (): ObjectStorageConfig | null =>
  process.env.NODE_ENV === 'test' ? null : readObjectStorageConfig();

type StoredFile = Express.Multer.File & { storedPath?: string };

const buildFilename = (originalName: string): string => {
  const extension = path.extname(originalName);
  const basename = path.basename(originalName, extension).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${Date.now()}-${basename}${extension}`;
};

/**
 * Multer storage engine: uploads to the object store when configured, otherwise writes to the
 * local images directory. keyPrefix is '' for product images and 'blog/' for blog images.
 */
export const createImageStorage = (keyPrefix: string): StorageEngine => ({
  _handleFile(_req: Request, file, cb) {
    const filename = buildFilename(file.originalname);
    const config = activeConfig();

    if (!config) {
      const directory = path.join(getProductImagesDirectory(), keyPrefix);
      fs.mkdirSync(directory, { recursive: true });
      const destination = path.join(directory, filename);
      const output = fs.createWriteStream(destination);
      file.stream.pipe(output);
      output.on('error', cb);
      output.on('finish', () =>
        cb(null, { destination: directory, filename, path: destination, size: output.bytesWritten })
      );
      return;
    }

    const chunks: Buffer[] = [];
    file.stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    file.stream.on('error', cb);
    file.stream.on('end', () => {
      const body = Buffer.concat(chunks);
      const key = `${keyPrefix}${filename}`;
      getClient(config)
        .send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: body, ContentType: file.mimetype }))
        .then(() => {
          const info: Partial<StoredFile> = { filename, size: body.length, storedPath: `${config.publicUrl}/${key}` };
          cb(null, info);
        })
        .catch((error: unknown) => {
          console.error(`Image upload to object storage failed for ${key}:`, error);
          cb(error);
        });
    });
  },
  _removeFile(_req, file, cb) {
    if (file.path) {
      fs.unlink(file.path, () => cb(null));
      return;
    }
    cb(null);
  },
});

/** The value to store in MySQL for an uploaded file: a full URL for object storage, or /images/... for disk. */
export const getStoredImagePath = (file: Express.Multer.File, keyPrefix = ''): string =>
  (file as StoredFile).storedPath || `/images/${keyPrefix}${file.filename}`;

export const createImageUpload = (keyPrefix: string, options: Omit<multer.Options, 'storage'>) =>
  multer({ ...options, storage: createImageStorage(keyPrefix) });
