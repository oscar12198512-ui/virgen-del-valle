import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const source = path.join(root, 'public', 'icon.svg');
const resources = path.join(root, 'resources');
const publicDir = path.join(root, 'public');

await fs.mkdir(resources, { recursive: true });

const base = sharp(source).resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } });
await base.clone().png().toFile(path.join(resources, 'icon.png'));
await base.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
await base.clone().resize(192, 192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
await base.clone().resize(512, 512).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
await base.clone().resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
