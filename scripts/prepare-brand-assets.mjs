import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = path.join(root, 'public');
const assets = path.join(root, 'assets');

let source = path.join(publicDir, 'icon.svg');
try {
  await fs.access(path.join(publicDir, 'logo.png'));
  source = path.join(publicDir, 'logo.png');
} catch {}

await fs.mkdir(assets, { recursive: true });

const base = sharp(source).resize(1024, 1024, {
  fit: 'contain',
  background: { r: 0, g: 37, b: 70, alpha: 0 }
});

await base.clone().png().toFile(path.join(assets, 'icon-only.png'));
await base.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
await base.clone().resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
await base.clone().resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
await sharp(path.join(publicDir, 'apple-touch-icon.png'))
  .resize(512, 512, { fit: 'cover', position: 'centre' })
  .png()
  .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

const markable = await base.clone().resize(360, 360).png().toBuffer();
const splashBackground = sharp({
  create: { width: 2732, height: 2732, channels: 4, background: '#002546' }
});
await splashBackground
  .composite([{ input: markable, gravity: 'center' }])
  .png()
  .toFile(path.join(assets, 'splash.png'));

const playStore = await base.clone().resize(512, 500, { fit: 'contain', background: { r: 0, g: 37, b: 70, alpha: 1 } }).png().toBuffer();
await sharp(playStore).resize(1024, 1000).png().toFile(path.join(assets, 'play-store-graphic.png'));
