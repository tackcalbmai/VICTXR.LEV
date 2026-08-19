import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = new URL('../', import.meta.url);
const pathFor = (relative) => fileURLToPath(new URL(relative, projectRoot));
const pngOptions = { compressionLevel: 9, palette: false };

const mainPreviewSvg = await readFile(pathFor('public/social-preview.svg'));

await Promise.all([
  sharp(mainPreviewSvg).png(pngOptions).toFile(pathFor('public/xo-web-preview.png')),
  sharp(mainPreviewSvg).png(pngOptions).toFile(pathFor('public/social-preview.png')),
]);

const catrinImage = await sharp(pathFor('src/assets/projects/catrin-portrait.jpg'))
  .resize(690, 630, { fit: 'cover', position: 'centre' })
  .modulate({ saturation: 0.76, brightness: 0.94 })
  .toBuffer();

const catrinOverlay = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="510" height="630" fill="#d9cec4"/>
    <path d="M28 74H482M510 0V630M28 555H482" fill="none" stroke="#171310" stroke-opacity=".24"/>
    <text x="30" y="46" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="-.7">XO WEB</text>
    <text x="480" y="46" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" text-anchor="end" letter-spacing="1.5">SELECTED WORK / 01</text>
    <text x="28" y="206" fill="#171310" font-family="Georgia, 'Times New Roman', serif" font-size="90" letter-spacing="2">CATRIN</text>
    <text x="32" y="244" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" letter-spacing="2">BRIDAL SALON · DIGITAL EXPERIENCE</text>
    <text x="31" y="329" fill="#ef4b2f" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700">X</text>
    <text x="82" y="307" fill="#171310" fill-opacity=".62" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="1.7">WRONG ASSUMPTION</text>
    <text x="82" y="331" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">A bridal salon needs</text>
    <text x="82" y="354" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">a catalogue.</text>
    <circle cx="50" cy="450" r="17" fill="none" stroke="#ef4b2f" stroke-width="5"/>
    <text x="82" y="426" fill="#171310" fill-opacity=".62" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="1.7">CHOSEN FOCUS</text>
    <text x="82" y="454" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700">Atmosphere → trust → fitting.</text>
    <text x="30" y="594" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">ELEGANCE / EMOTION / PRECISION</text>
    <rect x="510" y="0" width="690" height="630" fill="none" stroke="#171310" stroke-opacity=".18"/>
    <rect x="988" y="574" width="180" height="28" fill="#f2f0e9" fill-opacity=".92"/>
    <text x="1078" y="593" fill="#171310" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1.5">BY VICTXR.LEV</text>
  </svg>
`);

await sharp({
  create: { width: 1200, height: 630, channels: 3, background: '#d9cec4' },
})
  .composite([
    { input: catrinImage, left: 510, top: 0 },
    { input: catrinOverlay, left: 0, top: 0 },
  ])
  .png(pngOptions)
  .toFile(pathFor('public/og/catrin.png'));

const anelikaImage = await sharp(pathFor('src/assets/projects/anelika-desktop.jpg'))
  .resize(680, 453, { fit: 'cover', position: 'centre' })
  .toBuffer();

const anelikaOverlay = Buffer.from(`
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <g fill="none" stroke="#9ec7d2" stroke-opacity=".09">
      <path d="M0 90H1200M0 180H1200M0 270H1200M0 360H1200M0 450H1200M0 540H1200"/>
      <path d="M90 0V630M180 0V630M270 0V630M360 0V630M450 0V630M540 0V630M630 0V630M720 0V630M810 0V630M900 0V630M990 0V630M1080 0V630"/>
    </g>
    <path d="M32 68H1168M32 560H1168" fill="none" stroke="#dce9ed" stroke-opacity=".24"/>
    <text x="34" y="45" fill="#f4f7f7" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" letter-spacing="-.7">XO WEB</text>
    <text x="1166" y="45" fill="#f4f7f7" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" text-anchor="end" letter-spacing="1.5">SELECTED WORK / 02</text>
    <text x="33" y="154" fill="#f4f7f7" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="800" letter-spacing="-3">ANELIKA</text>
    <text x="35" y="187" fill="#9ec7d2" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" letter-spacing="1.7">SERVICE BUSINESS · CONVERSION SYSTEM</text>
    <text x="35" y="282" fill="#67d7e9" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="700">X</text>
    <text x="82" y="260" fill="#dce9ed" fill-opacity=".64" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="1.6">WRONG ASSUMPTION</text>
    <text x="82" y="285" fill="#f4f7f7" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700">One generic services page.</text>
    <circle cx="50" cy="382" r="16" fill="none" stroke="#67d7e9" stroke-width="5"/>
    <text x="82" y="358" fill="#dce9ed" fill-opacity=".64" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="1.6">CHOSEN FOCUS</text>
    <text x="82" y="386" fill="#f4f7f7" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700">Task → clarity → enquiry.</text>
    <rect x="470" y="89" width="696" height="469" fill="none" stroke="#67d7e9" stroke-opacity=".72" stroke-width="2"/>
    <path d="M470 89h46M470 89v46M1166 558h-46M1166 558v-46" fill="none" stroke="#67d7e9" stroke-width="5"/>
    <rect x="34" y="576" width="167" height="27" fill="#67d7e9"/>
    <text x="117.5" y="594" fill="#072331" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" text-anchor="middle" letter-spacing="1.4">BY VICTXR.LEV</text>
    <text x="1166" y="594" fill="#dce9ed" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="700" text-anchor="end" letter-spacing="1.5">STRUCTURE / CLARITY / EFFICIENCY</text>
  </svg>
`);

await sharp({
  create: { width: 1200, height: 630, channels: 3, background: '#072331' },
})
  .composite([
    { input: anelikaImage, left: 478, top: 97 },
    { input: anelikaOverlay, left: 0, top: 0 },
  ])
  .png(pngOptions)
  .toFile(pathFor('public/og/anelika.png'));

console.log('Generated valid 1200×630 social previews for XO WEB, CATRIN and ANELIKA.');
