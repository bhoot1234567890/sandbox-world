import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
  ],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

// Disable cache
await page.setCacheEnabled(false);

const uniqueErrors = new Set();
const uniqueWarnings = new Set();

page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error') uniqueErrors.add(text);
  if (msg.type() === 'warning' && !text.includes('INVALID_ENUM') && !text.includes('deprecated')) uniqueWarnings.add(text);
});
page.on('pageerror', err => uniqueErrors.add(`PAGE ERROR: ${err.message}`));

console.log('Navigating...');
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0', timeout: 15000 });
await new Promise(r => setTimeout(r, 4000));

await page.screenshot({ path: '/tmp/sandbox-final.png' });

console.log('\n=== ERRORS ===');
if (uniqueErrors.size === 0) {
  console.log('  ✓ Zero errors');
} else {
  for (const e of uniqueErrors) console.log(`  ✗ ${e}`);
}

if (uniqueWarnings.size > 0) {
  console.log('\n=== WARNINGS ===');
  for (const w of uniqueWarnings) console.log(`  ⚠ ${w}`);
}

await browser.close();
console.log('\nDone.');
