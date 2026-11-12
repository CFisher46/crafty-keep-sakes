const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
};

export const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif';

export function validateProductImages(files: File[]): string {
  if (files.length > 10) return 'Choose no more than 10 images.';
  if (files.some((file) => file.size > 5 * 1024 * 1024)) return 'Each image must be no larger than 5 MB.';
  if (files.some((file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    return !extension || !ALLOWED_EXTENSIONS[file.type]?.includes(extension);
  })) return 'Only JPG, PNG, WEBP or GIF images are allowed.';
  return '';
}
