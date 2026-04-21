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

  // 1. Rectangular OG Image (1200x630)
  const rectWidth = 1200;
  const rectHeight = 630;
  const rectLogoSize = 400; // Leaves plenty of padding, even if cropped to square
  
  const rectLogoBuffer = await sharp(SOURCE)
    .resize(rectLogoSize, rectLogoSize, { fit: 'contain', background: { r: 4, g: 1, b: 10, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: rectWidth,
      height: rectHeight,
      channels: 4,
      background: { r: 4, g: 1, b: 10, alpha: 255 }
    }
  })
    .composite([{
      input: rectLogoBuffer,
      left: Math.round((rectWidth - rectLogoSize) / 2),
      top: Math.round((rectHeight - rectLogoSize) / 2)
    }])
    .png()
    .toFile(join(projectRoot, 'public', 'og-rect-v2.png'));
  console.log('✅ og-rect-v2.png (1200x630)');

  // 2. Square OG Image (800x800) for WhatsApp/Instagram 1:1 previews
  const sqWidth = 800;
  const sqHeight = 800;
  const sqLogoSize = 500; // Padded so it looks good when cropped/rounded
  
  const sqLogoBuffer = await sharp(SOURCE)
    .resize(sqLogoSize, sqLogoSize, { fit: 'contain', background: { r: 4, g: 1, b: 10, alpha: 1 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: sqWidth,
      height: sqHeight,
      channels: 4,
      background: { r: 4, g: 1, b: 10, alpha: 255 }
    }
  })
    .composite([{
      input: sqLogoBuffer,
      left: Math.round((sqWidth - sqLogoSize) / 2),
      top: Math.round((sqHeight - sqLogoSize) / 2)
    }])
    .png()
    .toFile(join(projectRoot, 'public', 'og-square-v2.png'));
  console.log('✅ og-square-v2.png (800x800)');

  console.log('\n🎉 New OG icons generated!');
}

main().catch(console.error);
