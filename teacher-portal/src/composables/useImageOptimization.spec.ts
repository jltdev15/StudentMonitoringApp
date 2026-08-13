import {afterEach, vi} from 'vitest';
import {convertImageToWebP} from './useImageOptimization';

describe('image optimization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('converts uploaded images to a bounded WebP file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({width: 2400, height: 1200, close: vi.fn()})));
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName !== 'canvas') return createElement(tagName);
      return {
        width: 0, height: 0,
        getContext: () => ({drawImage: vi.fn()}),
        toBlob: (callback: BlobCallback) => callback(new Blob(['webp'], {type: 'image/webp'})),
      } as unknown as HTMLCanvasElement;
    });
    const result = await convertImageToWebP(new File(['source'], 'photo.jpg', {type: 'image/jpeg'}));
    expect(result.name).toBe('photo.webp');
    expect(result.type).toBe('image/webp');
  });

  it('does not enlarge small images and rejects non-image inputs', async () => {
    const bitmap = {width: 640, height: 480, close: vi.fn()};
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    let canvas: {width: number; height: number} | undefined;
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName !== 'canvas') return createElement(tagName);
      const testCanvas = {
        width: 0,
        height: 0,
        getContext: () => ({drawImage: vi.fn()}),
        toBlob: (callback: BlobCallback) => callback(new Blob(['webp'], {type: 'image/webp'})),
      } as unknown as HTMLCanvasElement;
      canvas = testCanvas;
      return testCanvas;
    });

    await convertImageToWebP(new File(['source'], 'small.png', {type: 'image/png'}));
    expect(canvas).toMatchObject({width: 640, height: 480});
    expect(bitmap.close).toHaveBeenCalledOnce();
    await expect(convertImageToWebP(new File(['text'], 'notes.txt', {type: 'text/plain'}))).rejects.toThrow('not an image');
  });
});
