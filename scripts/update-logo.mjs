import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

async function generateCleanTransparentLogo() {
  const originalUploaded = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\82061289-f242-4071-9765-13c889c05125\\.user_uploaded\\media_1792026883149.jpg';
  
  const cx = 505, cy = 505, r = 454;
  const size = r * 2; // 908
  const left = cx - r; // 51
  const top = cy - r; // 51

  // Extract exactly the bounding box around the circle
  const cropped = await sharp(originalUploaded)
    .extract({ left, top, width: size, height: size })
    .toBuffer();

  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size/2}" cy="${size/2}" r="${r - 1}" fill="#ffffff" /></svg>`
  );

  const transparentLogo = await sharp(cropped)
    .ensureAlpha()
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const publicDir = path.join(process.cwd(), 'public');
  const assetsDir = path.join(process.cwd(), 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  await fs.writeFile(path.join(publicDir, 'logo.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'logo.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'icon.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'icon-only.png'), transparentLogo);

  // Resize and create PWA & Apple icons
  await sharp(transparentLogo).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(transparentLogo).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(transparentLogo).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(transparentLogo).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Update Android mipmap launcher icons
  const resDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'res');
  const mipmaps = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];
  for (const m of mipmaps) {
    const folder = path.join(resDir, m.dir);
    try {
      await sharp(transparentLogo).resize(m.size, m.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher.png'));
      await sharp(transparentLogo).resize(m.size, m.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher_round.png'));
      await sharp(transparentLogo).resize(m.fgSize, m.fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher_foreground.png'));
    } catch (e) {
      console.warn('Could not write to', folder, e.message);
    }
  }

  console.log('✅ Transparent circular logo generated and applied to all assets!');
}

generateCleanTransparentLogo().catch(console.error);
