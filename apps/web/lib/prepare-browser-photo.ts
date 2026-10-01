'use client';
const MAX_SOURCE = 25 * 1024 * 1024;
export function preparedPhotoSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > 48_000_000) throw new Error('Choose a photo with fewer than 48 megapixels.');
  const scale = Math.min(1, 2400 / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
/** Prepare for browser previews and the existing server safety pipeline. Canvas
 * output strips source metadata; server validation/scanning remains mandatory. */
export async function prepareBrowserPhoto(source: File): Promise<File> {
  if (!source.size || source.size > MAX_SOURCE) throw new Error('Choose a photo smaller than 25 MB.');
  const heic = /\.(heic|heif)$/i.test(source.name) || /^image\/(heic|heif)$/.test(source.type);
  if (!heic && !/^image\/(jpe?g|png|webp)$/.test(source.type)) throw new Error('Choose a JPEG, PNG, WebP, HEIC, or HEIF photo.');
  let image: CanvasImageSource;
  let width: number; let height: number;
  let dispose = () => {};
  if (heic) {
    const decode = (await import('heic-decode')).default;
    const images = await decode.all({ buffer: new Uint8Array(await source.arrayBuffer()) });
    try {
      if (!images.length) throw new Error('This HEIC photo could not be opened.');
      width = images[0].width; height = images[0].height;
      preparedPhotoSize(width, height);
      const decoded = await images[0].decode();
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Photo preparation is unavailable in this browser.');
      context.putImageData(new ImageData(new Uint8ClampedArray(decoded.data), width, height), 0, 0);
      image = canvas; dispose = () => { canvas.width = canvas.height = 0; };
    } finally { images.dispose(); }
  } else {
    const url = URL.createObjectURL(source);
    const element = new Image();
    try {
      await new Promise<void>((resolve, reject) => { element.onload = () => resolve(); element.onerror = () => reject(new Error('This photo could not be opened. Choose another photo.')); element.src = url; });
      image = element; width = element.naturalWidth; height = element.naturalHeight;
    } finally { URL.revokeObjectURL(url); }
  }
  const canvas = document.createElement('canvas');
  try {
    const size = preparedPhotoSize(width, height); canvas.width = size.width; canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Photo preparation is unavailable in this browser.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.88, 0.76, 0.6]) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && blob.size > 0 && blob.size <= 3_000_000) return new File([blob], source.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: source.lastModified });
    }
    throw new Error('This photo is too large to prepare. Choose a smaller image.');
  } finally { dispose(); canvas.width = canvas.height = 0; }
}

export async function prepareBrowserPhotos(files: File[], progress?: (done: number, total: number) => void) {
  const prepared: File[] = [];
  // Decode one at a time to avoid holding several full camera images in memory.
  for (const file of files) { prepared.push(await prepareBrowserPhoto(file)); progress?.(prepared.length, files.length); }
  return prepared;
}
