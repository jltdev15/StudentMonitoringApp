export const IMAGE_OPTIMIZATION_MAX_EDGE = 1920;
export const IMAGE_OPTIMIZATION_QUALITY = 0.82;

/** Convert an image to the portal's canonical upload format.
 *
 * This deliberately never returns the input file. Callers can therefore keep
 * a simple invariant: anything in an image-upload queue is a WebP file.
 */
export async function convertImageToWebP(
  file: File,
  quality = IMAGE_OPTIMIZATION_QUALITY,
  maxEdge = IMAGE_OPTIMIZATION_MAX_EDGE,
) {
  if (!file.type.startsWith('image/')) throw new Error(`${file.name} is not an image.`);
  if (!Number.isFinite(quality) || quality <= 0 || quality > 1) throw new Error('Invalid image quality.');
  if (!Number.isFinite(maxEdge) || maxEdge < 1) throw new Error('Invalid image dimensions.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image optimization is not supported in this browser.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Could not convert the image to WebP.')), 'image/webp', quality));
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.webp`, {type: 'image/webp', lastModified: Date.now()});
  } finally {
    bitmap.close();
  }
}
