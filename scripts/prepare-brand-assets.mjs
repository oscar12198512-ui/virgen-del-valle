import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'public', 'icon.svg');
const assets = path.join(root, 'assets');
const publicDir = path.join(root, 'public');

await fs.mkdir(assets, { recursive: true });

const base = sharp(source).resize(1024, 1024, {
  fit: 'contain',
  background: { r: 0, g: 0, b: 0, alpha: 0 }
});

await base.clone().png().toFile(path.join(assets, 'icon-only.png'));
await base.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
await base.clone().resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
await base.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
await base.clone().resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));

const splashBackground = sharp({
  create: { width: 2732, height: 2732, channels: 4, background: '#002546' }
});
await splashBackground
  .composite([{ input: await base.clone().resize(1000, 1000).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(path.join(assets, 'splash.png'));
