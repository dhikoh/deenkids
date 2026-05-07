import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public', 'icons');

try { mkdirSync(outDir, { recursive: true }); } catch {}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10b981"/>
      <stop offset="100%" style="stop-color:#0d9488"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
  <text x="256" y="370" font-family="Arial,Helvetica,sans-serif" font-size="320" font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>`;

const svgBuf = Buffer.from(svg);

for (const size of [192, 512]) {
  await sharp(svgBuf).resize(size, size).png().toFile(join(outDir, `icon-${size}.png`));
  console.log(`✅ Generated icon-${size}.png`);
}

// Maskable icon: same but with extra padding (safe zone = 80% center)
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#10b981"/>
  <text x="256" y="345" font-family="Arial,Helvetica,sans-serif" font-size="260" font-weight="bold" fill="white" text-anchor="middle">A</text>
</svg>`;

await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(join(outDir, 'icon-maskable-512.png'));
console.log('✅ Generated icon-maskable-512.png');

console.log('🎉 Done! Icons saved to public/icons/');
