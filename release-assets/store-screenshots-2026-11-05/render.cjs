// Renders store screenshots from real app captures. Usage: node render.cjs <config.json>
const path = require('path');
const fs = require('fs');
const ROOT = '/Users/grantgibson/Desktop/Burrow Base/LItterbugs Partner';
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
const sharp = require(path.join(ROOT, 'node_modules/sharp'));
const SRC = path.join(ROOT, 'release-assets/apple-app-store/2026-10-30-prepared/source/iphone');
const FONT = path.join(ROOT, 'apps/web/public/fonts/nunito/black.ttf');

const themes = {
  indigo: { bg: 'linear-gradient(170deg,#5146ed 0%,#3528ac 100%)', head: '#ffffff', accent: '#ffce38' },
  lavender: { bg: 'linear-gradient(175deg,#f8f7fc 0%,#e3dff0 100%)', head: '#292932', accent: '#5146ed' },
  white: { bg: '#ffffff', head: '#292932', accent: '#5146ed', mark: '#ffce38' },
  photo: { bg: '#1c1a2b', head: '#ffffff', accent: '#ffce38', photo: true },
};

async function cropped(file, redact = []) {
  const srcPath = path.isAbsolute(file) ? file : path.join(SRC, file);
  const { width, height } = await sharp(srcPath).metadata();
  // Blur private details (for example a member's name) before cropping.
  const overlays = await Promise.all(redact.map(async (r) => ({
    input: await sharp(srcPath).extract({ left: r.left, top: r.top, width: r.width, height: r.height }).blur(28).toBuffer(),
    left: r.left, top: r.top,
  })));
  const base = await sharp(srcPath).composite(overlays).png().toBuffer();
  const top = Math.round(height * 0.062);
  const bottom = Math.round(height * 0.012);
  const buf = await sharp(base).extract({ left: 0, top, width, height: height - top - bottom }).png().toBuffer();
  return 'data:image/png;base64,' + buf.toString('base64');
}

function html(job, shotUri, photoUri) {
  const { W, H } = job;
  const t = themes[job.theme];
  const wide = W / H > 0.5;
  const pad = Math.round(W * 0.085);
  const headSize = Math.round(W * (wide ? 0.08 : 0.088));
  const devW = Math.round(W * (wide ? 0.64 : 0.76));
  const bezel = Math.round(devW * 0.022);
  const radius = Math.round(devW * 0.11);
  const markStyle = t.mark ? `;background:linear-gradient(transparent 62%,${t.mark} 62%, ${t.mark} 92%,transparent 92%)` : '';
  const headline = job.headline.replace(/\*(.+?)\*/g, `<span style="color:${t.accent}${markStyle}">$1</span>`);
  return `<!doctype html><html><head><style>
  @font-face{font-family:NB;src:url(data:font/ttf;base64,${fs.readFileSync(FONT).toString('base64')}) format('truetype')}
  *{margin:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;overflow:hidden;background:${t.bg};position:relative;font-family:NB}
  .photo{position:absolute;inset:-4%;background:url(${photoUri}) center/cover;filter:blur(${Math.round(W * 0.012)}px) brightness(.45)}
  h1{position:absolute;left:${pad}px;right:${pad}px;top:${Math.round(H * 0.06)}px;color:${t.head};font-size:${headSize}px;line-height:1.05;letter-spacing:-0.01em}
  .dev{position:absolute;left:50%;transform:translateX(-50%);bottom:0;top:${Math.round(H * (wide ? 0.25 : 0.215))}px;width:${devW}px;background:#111;border-radius:${radius}px ${radius}px 0 0;padding:${bezel}px ${bezel}px 0;box-shadow:0 ${Math.round(W * 0.02)}px ${Math.round(W * 0.06)}px rgba(0,0,0,.28)}
  .scr{width:100%;height:100%;border-radius:${radius - bezel}px ${radius - bezel}px 0 0;background:url(${shotUri}) top center/100% auto no-repeat #fff}
  </style></head><body>${t.photo ? '<div class="photo"></div>' : ''}<h1>${headline}</h1><div class="dev"><div class="scr"></div></div></body></html>`;
}

(async () => {
  const cfg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  fs.mkdirSync(cfg.out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  const photoUri = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, 'release-assets/apple-app-store/2026-10-30-prepared/source/marketing/greenwood-before-original.jpg')).toString('base64');
  for (const job of cfg.jobs) {
    const page = await browser.newPage({ viewport: { width: job.W, height: job.H }, deviceScaleFactor: 1 });
    await page.setContent(html(job, await cropped(job.file, job.redact), photoUri), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(cfg.out, `${job.name}.png`) });
    await page.close();
    console.log('rendered', job.name);
  }
  await browser.close();
})();
