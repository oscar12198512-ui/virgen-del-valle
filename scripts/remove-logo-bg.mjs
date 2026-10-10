import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';

async function cropTransparentLogo() {
  const originalUploaded = 'C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\6790de91-93b4-4dd9-aefc-fda9511925a2\\.user_uploaded\\media_1791608808861.jpg';
  const image = sharp(originalUploaded);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;

  // Let's find top and horizontal center of the circle
  let topY = h;
  for (let y = 0; y < 300; y++) {
    for (let x = 200; x < w - 200; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240) {
        if (y < topY) topY = y;
      }
    }
  }

  // Left and Right bounds
  let leftX = w, rightX = 0;
  for (let y = 100; y < 600; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 3;
      if (data[idx] < 240 || data[idx + 1] < 240 || data[idx + 2] < 240) {
        if (x < leftX) leftX = x;
        if (x > rightX) rightX = x;
      }
    }
  }

  const diameter = rightX - leftX;
  const centerX = leftX + diameter / 2;
  const centerY = topY + diameter / 2;
  const radius = Math.round(diameter / 2);

  console.log(`Detected circle: centerX=${centerX}, centerY=${centerY}, radius=${radius}, diameter=${diameter}`);

  const cropSize = Math.round(diameter);
  const cropLeft = Math.max(0, Math.round(centerX - radius));
  const cropTop = Math.max(0, Math.round(centerY - radius));

  const cropped = await sharp(originalUploaded)
    .extract({
      left: cropLeft,
      top: cropTop,
      width: Math.min(cropSize, w - cropLeft),
      height: Math.min(cropSize, h - cropTop)
    })
    .toBuffer();

  const croppedMeta = await sharp(cropped).metadata();
  const cw = croppedMeta.width;
  const ch = croppedMeta.height;
  const maskRadius = Math.min(cw, ch) / 2 - 1;

  const circleSvg = Buffer.from(
    `<svg width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}" xmlns="http://www.w3.org/2000/svg"><circle cx="${cw / 2}" cy="${ch / 2}" r="${maskRadius}" fill="#ffffff" /></svg>`
  );

  // Composite with circle mask to create transparent PNG
  const transparentLogo = await sharp(cropped)
    .ensureAlpha()
    .composite([
      {
        input: circleSvg,
        blend: 'dest-in'
      }
    ])
    .png()
    .toBuffer();

  // Save clean transparent logo
  const publicDir = path.join(process.cwd(), 'public');
  const assetsDir = path.join(process.cwd(), 'assets');
  
  await fs.writeFile(path.join(publicDir, 'logo.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'logo.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'icon.png'), transparentLogo);
  await fs.writeFile(path.join(assetsDir, 'icon-only.png'), transparentLogo);

  // Resize and create PWA & Apple icons with transparent background
  await sharp(transparentLogo).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  await sharp(transparentLogo).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  await sharp(transparentLogo).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  await sharp(transparentLogo).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  // Update Android mipmap launcher icons with transparent background
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
    if (await fs.stat(folder).catch(() => null)) {
      await sharp(transparentLogo).resize(m.size, m.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher.png'));
      await sharp(transparentLogo).resize(m.size, m.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher_round.png'));
      await sharp(transparentLogo).resize(m.fgSize, m.fgSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(folder, 'ic_launcher_foreground.png'));
    }
  }

  console.log('Clean transparent logo successfully applied to Web, PWA, and Android native icons!');
}

cropTransparentLogo().catch(err => console.error(err));
