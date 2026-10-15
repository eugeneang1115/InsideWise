// Renders the provisional "iw" mark into Android launcher icons and splash screens.
// Run from web/: node scripts/android-assets.mjs   (needs Playwright's Chromium)
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const RES = 'android/app/src/main/res';
const GREEN = '#245c4b';
const PAPER = '#f7f8f3';
const FONT = "'Segoe UI', Inter, Arial, sans-serif";

const mark = (size, { radius = 0.28, bg = GREEN, scale = 1 } = {}) => `
  <div style="width:${size}px;height:${size}px;border-radius:${radius * size}px;background:${bg};display:grid;place-items:center">
    <span style="color:#fff;font:700 ${size * 0.5 * scale}px/1 ${FONT};letter-spacing:${-size * 0.02 * scale}px;padding-right:${size * 0.01 * scale}px;margin-top:${-size * 0.04 * scale}px">iw</span>
  </div>`;

const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [];
for (const [d, k] of Object.entries(densities)) {
  jobs.push([`mipmap-${d}/ic_launcher.png`, 48 * k, 48 * k, mark(48 * k, { radius: 0.22 })]);
  jobs.push([`mipmap-${d}/ic_launcher_round.png`, 48 * k, 48 * k, mark(48 * k, { radius: 0.5 })]);
  // Adaptive icon foreground: 108dp canvas, artwork inside the 66dp safe zone, transparent background.
  jobs.push([`mipmap-${d}/ic_launcher_foreground.png`, 108 * k, 108 * k,
    `<div style="width:${108 * k}px;height:${108 * k}px;display:grid;place-items:center">${mark(66 * k, { bg: 'transparent', scale: 1.05 })}</div>`]);
}
const splash = (w, h) => `<div style="width:${w}px;height:${h}px;background:${PAPER};display:grid;place-items:center">${mark(Math.round(Math.min(w, h) * 0.28))}</div>`;
for (const f of ['drawable/splash.png', ...['land', 'port'].flatMap((o) => Object.keys(densities).map((d) => `drawable-${o}-${d}/splash.png`))]) {
  const buf = readFileSync(`${RES}/${f}`);
  jobs.push([f, buf.readUInt32BE(16), buf.readUInt32BE(20), null]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, w, h, html] of jobs) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<body style="margin:0;background:transparent">${html ?? splash(w, h)}</body>`);
  await page.screenshot({ path: `${RES}/${file}`, omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
}
await browser.close();
console.log(`Rendered ${jobs.length} images.`);
