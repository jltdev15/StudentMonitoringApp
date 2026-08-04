import {downloadExtension, shortDownloadName} from './useFileDownload';

describe('file downloads', () => {
  it('creates short predictable names', () => {
    expect(shortDownloadName('RES', 2)).toBe('RES-03');
    expect(shortDownloadName('LEC', 0)).toBe('LEC-01');
  });
  it('preserves supported extensions', () => {
    expect(downloadExtension({fileName: 'lesson.html', contentType: 'text/html'} as never)).toBe('html');
    expect(downloadExtension({fileName: 'photo.jpg', contentType: 'image/jpeg'} as never)).toBe('jpg');
  });
});
