import path from 'path';
import { FileFilterCallback } from 'multer';
import { Request } from 'express';

const ALLOWED_IMAGE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

export const IMAGE_UPLOAD_LIMITS = {
  fileSize: 5 * 1024 * 1024,
  files: 10,
};

export function imageFileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ALLOWED_IMAGE_TYPES[file.mimetype];

  if (allowedExtensions && allowedExtensions.includes(extension)) {
    cb(null, true);
    return;
  }

  cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed'));
}
