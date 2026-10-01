import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const source = fileURLToPath(new URL('../../mobile/assets/icon.png', import.meta.url));
const destination = name => fileURLToPath(new URL(`../public/brand/${name}`, import.meta.url));
// Derive browser install assets from the exact native app artwork.
for (const size of [192, 512]) await sharp(source).resize(size, size).png().toFile(destination(`app-icon-${size}.png`));
// Keep the complete artwork inside the maskable safe zone.
await sharp(source).resize(360, 360).extend({ top: 76, bottom: 76, left: 76, right: 76, background: '#ffffff' }).png().toFile(destination('app-icon-maskable-512.png'));
