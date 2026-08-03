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
});
