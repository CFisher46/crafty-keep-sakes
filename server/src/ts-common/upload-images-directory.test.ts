import os from 'os';
import path from 'path';

import { getProductImagesDirectory } from './upload-images-directory';

describe('upload images directory', () => {
  it('uses a temp directory during tests', () => {
    const directory = getProductImagesDirectory();

    expect(directory).toContain(path.join(os.tmpdir(), 'crafty-keep-sakes-images'));
  });
});