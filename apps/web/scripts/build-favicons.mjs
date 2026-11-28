import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Browser, Google and home-screen icons: the Litterbugs wordmark logo (the App Store icon's artwork),
// centred on white so it stays visible on dark tabs and dark-mode search results.
const logo = fileURLToPath(new URL('../public/brand/litterbugs-logo.png', import.meta.url));
const out = name => fileURLToPath(new URL(name, import.meta.url));

async function square(size, padding, background = '#ffffff') {
  const inner = Math.round(size * (1 - 2 * padding));
  const art = await sharp(logo).resize(inner, inner, { fit: 'inside' }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, gravity: 'center' }]).png().toBuffer();
}

/** A .ico holding PNG images (supported by every current browser and by Google). */
function ico(images) {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const entry = 6 + 16 * index;
    header.writeUInt8(size >= 256 ? 0 : size, entry); header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(image => image.data)]);
}

const icoImages = await Promise.all([16, 32, 48].map(async size => ({ size, data: await square(size, 0.02) })));
await writeFile(out('../public/favicon.ico'), ico(icoImages));
for (const size of [32, 48, 96, 192]) await writeFile(out(`../public/brand/litterbugs-favicon-${size}.png`), await square(size, 0.04));
await writeFile(out('../public/brand/litterbugs-apple-touch-icon.png'), await square(180, 0.1));
// Search engines' organisation logo: the wordmark on a transparent square.
await writeFile(out('../public/brand/litterbugs-favicon-transparent.png'), await square(256, 0.04, { r: 0, g: 0, b: 0, alpha: 0 }));
