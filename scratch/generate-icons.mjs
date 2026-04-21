import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Source: user's uploaded logo
const SOURCE = String.raw`C:\Users\PC\.gemini\antigravity\brain\6eb524c2-a723-4f3f-a2a2-57e94b4a0a7d\media__1776792740011.jpg`;

async function main() {
  const src = sharp(SOURCE);
  const meta = await src.metadata();
  console.log(`Source: ${meta.width}x${meta.height}, format: ${meta.format}`);

  // 1. PWA icons (public/)
  await sharp(SOURCE)
    .resize(192, 192, { fit: 'cover' })
    .png()
    .toFile(join(projectRoot, 'public', 'icon-192x192.png'));
  console.log('✅ icon-192x192.png');

  await sharp(SOURCE)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(join(projectRoot, 'public', 'icon-512x512.png'));
  console.log('✅ icon-512x512.png');

  // 2. Apple touch icon (public/)
  await sharp(SOURCE)
    .resize(180, 180, { fit: 'cover' })
    .png()
    .toFile(join(projectRoot, 'public', 'apple-icon.png'));
  console.log('✅ apple-icon.png');

  // 3. Favicon ICO (src/app/) — use a 48x48 PNG saved as .ico
  // Next.js supports PNG favicon in app dir, but actual .ico is better
  // We'll create a 48x48 PNG and save as favicon.ico (browsers accept PNG favicons)
  await sharp(SOURCE)
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toFile(join(projectRoot, 'src', 'app', 'favicon.ico'));
  console.log('✅ favicon.ico');

  // 4. OG image for social sharing — 1200x630 with the logo centered on dark bg
  const ogWidth = 1200;
  const ogHeight = 630;
  const logoSize = 400;
  
  // Resize logo for OG
  const logoBuffer = await sharp(SOURCE)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 4, g: 1, b: 10, alpha: 1 } })
    .png()
    .toBuffer();

  // Create dark background and composite the logo centered
  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: { r: 4, g: 1, b: 10, alpha: 255 }
    }
  })
    .composite([{
      input: logoBuffer,
      left: Math.round((ogWidth - logoSize) / 2),
      top: Math.round((ogHeight - logoSize) / 2)
    }])
    .png()
    .toFile(join(projectRoot, 'public', 'og-image.png'));
  console.log('✅ og-image.png (1200x630)');

  // 5. Also save a copy of the full logo as public/logo.png for general use
  await sharp(SOURCE)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(join(projectRoot, 'public', 'logo.png'));
  console.log('✅ logo.png');

  console.log('\n🎉 All icons generated!');
}

main().catch(console.error);
