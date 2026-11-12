import { validateProductImages } from './imageValidation';

describe('product image validation', () => {
  it('accepts supported formats and exactly 10 files up to 5 MB', () => {
    const files = Array.from({ length: 10 }, (_, index) =>
      new File([new Uint8Array(index === 0 ? 5 * 1024 * 1024 : 1)], 'image.JPG', { type: 'image/jpeg' }));
    expect(validateProductImages(files)).toBe('');
  });

  it('rejects more than 10 files', () => {
    const file = new File(['x'], 'image.png', { type: 'image/png' });
    expect(validateProductImages(Array(11).fill(file))).toMatch(/no more than 10/);
  });

  it('rejects files larger than 5 MB', () => {
    const file = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'image.png', { type: 'image/png' });
    expect(validateProductImages([file])).toMatch(/no larger than 5 MB/);
  });

  it('rejects unsupported types and mismatched extensions', () => {
    expect(validateProductImages([new File(['x'], 'file.txt', { type: 'text/plain' })])).toMatch(/Only JPG/);
    expect(validateProductImages([new File(['x'], 'file.png', { type: 'image/jpeg' })])).toMatch(/Only JPG/);
  });
});
