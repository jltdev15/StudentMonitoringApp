import type {ActivityMaterial} from '../types';

export function shortDownloadName(prefix: 'PETA' | 'RES' | 'LEC', index: number) {
  return `${prefix}-${String(index + 1).padStart(2, '0')}`;
}

export function downloadExtension(material: ActivityMaterial) {
  if (material.contentType === 'text/html' || /\.html?$/i.test(material.fileName)) return 'html';
  if (material.contentType === 'image/webp') return 'webp';
  return material.fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() || 'bin';
}

export async function downloadMaterial(material: ActivityMaterial, fileName: string) {
  const response = await fetch(material.downloadUrl);
  if (!response.ok) throw new Error('The file could not be downloaded.');
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
