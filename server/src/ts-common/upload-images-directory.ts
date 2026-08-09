import fs from 'fs';
import os from 'os';
import path from 'path';

const TEST_IMAGES_DIRECTORY = path.join(
  os.tmpdir(),
  'crafty-keep-sakes-images'
);

export function getProductImagesDirectory(): string {
  const imagesDirectory =
    process.env.NODE_ENV === 'test'
      ? TEST_IMAGES_DIRECTORY
      : path.join(__dirname, '../../../../client/public/images');

  if (!fs.existsSync(imagesDirectory)) {
    fs.mkdirSync(imagesDirectory, { recursive: true });
  }

  return imagesDirectory;
}