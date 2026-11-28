import { beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
const { images, context, transform, output, info } = vi.hoisted(() => {
  const transform = vi.fn(); const output = vi.fn(); const info = vi.fn();
  const images = { info, input: vi.fn((stream: ReadableStream<Uint8Array>) => { void stream; return { transform }; }) };
  return { images, transform, output, info, context: { env: { IMAGES: images } } };
});
vi.mock('server-only', () => ({}));
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: () => context }));
import { inspectCloudflareImage, isAnimatedRaster, renderCloudflareImage, stripJpegMetadata } from './cloudflare-images';
import { sanitizeImage, MediaSecurityError } from './media-security';

beforeEach(() => {
  vi.clearAllMocks(); vi.unstubAllEnvs();
  info.mockResolvedValue({ format: 'image/jpeg', width: 120, height: 80, fileSize: 500 });
  context.env.IMAGES = images;
  transform.mockReturnValue({ output });
});

async function jpeg() {
  return sharp({ create: { width: 120, height: 80, channels: 3, background: '#f6c34b' } })
    .withExif({ IFD0: { Artist: 'Synthetic test photo' }, IFD2: { Copyright: 'Test only' } })
    .jpeg().toBuffer();
}
function encoded(bytes: Uint8Array, format = 'image/jpeg') {
  output.mockResolvedValue({ response: () => new Response(new Uint8Array(bytes), { headers: { 'Content-Type': format } }) });
}

describe('Cloudflare image safety and compatibility', () => {
  it('strips encoded JPEG metadata while keeping the image decodable', async () => {
    const original = await jpeg();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const clean = stripJpegMetadata(original);
    const meta = await sharp(clean).metadata();
    expect(meta).toMatchObject({ width: 120, height: 80, format: 'jpeg' });
    expect(meta.exif).toBeUndefined(); expect(meta.icc).toBeUndefined();
  });
  it.each([[0xff,0xd8,0xff,0xe1,0,1], [0xff,0xd8,0xff,0xe1,0xff,0xff], [0xff,0xd8,0xff,0xd9]].map(bytes => [bytes]))('rejects malformed output instead of returning unprocessed bytes', bytes => {
    expect(() => stripJpegMetadata(new Uint8Array(bytes))).toThrow();
  });
  it('crops cards without enlarging a smaller source', async () => {
    encoded(await jpeg(), 'image/webp');
    await renderCloudflareImage(new Uint8Array([1]), { width: 720, height: 405, cover: true, format: 'image/webp', quality: 76 });
    expect(transform).toHaveBeenCalledWith({ width: 120, height: 67, fit: 'cover', gravity: 'center' });
    expect(output).toHaveBeenCalledWith({ format: 'image/webp', quality: 76, anim: false });
    expect(images.input.mock.calls[0][0]).toBeInstanceOf(ReadableStream);
  });
  it('keeps secure uploads within the original dimension and pixel limits', async () => {
    vi.stubEnv('LITTERBUGS_IMAGE_RUNTIME', 'cloudflare');
    info.mockResolvedValue({ format: 'image/jpeg', width: 12001, height: 10 });
    await expect(sanitizeImage(await jpeg(), 'image/jpeg')).rejects.toBeInstanceOf(MediaSecurityError);
    expect(images.input).not.toHaveBeenCalled();
    info.mockResolvedValue({ format: 'image/jpeg', width: 8000, height: 6000 });
    await expect(sanitizeImage(await jpeg(), 'image/jpeg')).rejects.toThrow('safely');
    expect(images.input).not.toHaveBeenCalled();
  });
  it('validates MIME, encodes JPEG, strips metadata and hashes sanitized bytes', async () => {
    vi.stubEnv('LITTERBUGS_IMAGE_RUNTIME', 'cloudflare');
    const source = await jpeg(); encoded(source);
    await expect(sanitizeImage(source, 'image/png')).rejects.toThrow('valid supported image');
    const clean = await sanitizeImage(source, 'image/jpeg');
    expect(clean.contentType).toBe('image/jpeg'); expect(clean.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect((await sharp(clean.bytes).metadata()).exif).toBeUndefined();
    expect(output).toHaveBeenCalledWith({ format: 'image/jpeg', quality: 88, anim: false, background: 'white' });
  });
  it('accepts a HEIC file using the standard HEIF container brand', async () => {
    vi.stubEnv('LITTERBUGS_IMAGE_RUNTIME', 'cloudflare');
    const source = Buffer.alloc(24); source.writeUInt32BE(24); source.write('ftyp',4); source.write('mif1',8); source.write('heic',16);
    info.mockResolvedValue({ format: 'image/heic', width: 120, height: 80 }); encoded(await jpeg());
    await expect(sanitizeImage(source, 'image/heic')).resolves.toMatchObject({ contentType: 'image/jpeg' });
    await expect(sanitizeImage(source, 'image/png')).rejects.toThrow('valid supported image');
  });
  it('rejects unavailable bindings and malformed info without Node fallback', async () => {
    context.env.IMAGES = undefined as unknown as typeof images;
    await expect(inspectCloudflareImage(new Uint8Array([1]))).rejects.toThrow('unavailable');
    context.env.IMAGES = images;
    info.mockResolvedValue({ format: 'image/svg+xml' });
    await expect(inspectCloudflareImage(new Uint8Array([1]))).rejects.toThrow('raster');
  });
  it('rejects animated WebP and APNG before decoding', () => {
    const webp = Buffer.alloc(30); webp.write('RIFF'); webp.write('WEBP',8); webp.write('VP8X',12); webp.writeUInt32LE(10,16); webp[20]=2;
    expect(isAnimatedRaster(webp)).toBe(true);
    const png = Buffer.alloc(28); png.set([137,80,78,71,13,10,26,10]); png.writeUInt32BE(8,8); png.write('acTL',12);
    expect(isAnimatedRaster(png)).toBe(true);
  });
});
