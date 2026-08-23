import os from 'os';
import path from 'path';

import { getProductImagesDirectory } from './upload-images-directory';

describe('upload images directory', () => {
  it('uses a temp directory during tests', () => {
    const directory = getProductImagesDirectory();

    expect(directory).toContain(path.join(os.tmpdir(), 'crafty-keep-sakes-images'));
  });

  it('points to the app image folder outside of test mode', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const directory = getProductImagesDirectory();
      expect(directory).toBe(path.resolve(__dirname, '../../../client/public/images'));
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });
});