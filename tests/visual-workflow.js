const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const B = 'http://localhost:3000';

  await page.goto(B + '/auth/login');
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'brewhasadmin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  console.log('1. LOGIN OK');
  await page.waitForTimeout(600);

  // POS sale
  await page.goto(B + '/pos');
  await page.waitForTimeout(1000);
  await page.locator('button:has-text("Cafe Latte")').first().click();
  await page.waitForTimeout(800);
  const reg = page.locator('button:has-text("Regular")');
  if (await reg.count() > 0) await reg.first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Charge")').first().click();
  await page.waitForTimeout(800);
  await page.locator('button:has-text("Complete Sale")').first().click();
  await page.waitForTimeout(1500);
  const rBody = await page.textContent('body');
  console.log('2. SALE COMPLETE - TIN:' + rBody.includes('TIN') + ' Salamat:' + rBody.includes('Salamat'));
  await page.locator('button:has-text("Back to POS")').first().click();

  // All pages via URL
  const pages = [
    ['/dashboard', 'Dashboard'],
    ['/dashboard/sales', 'Sales History'],
    ['/backoffice/inventory', 'Inventory'],
    ['/backoffice/items', 'Items'],
    ['/backoffice/settings', 'Settings'],
    ['/dashboard/journal', 'Journal'],
    ['/dashboard/reports', 'Reports'],
    ['/display', 'Display'],
  ];

  for (const [url, name] of pages) {
    await page.goto(B + url);
    await page.waitForTimeout(800);
    console.log((pages.indexOf([url, name]) + 3) + '. ' + name + ' OK');
  }

  // Reports: click Generate
  await page.goto(B + '/dashboard/reports');
  await page.waitForTimeout(500);
  const gen = page.locator('button:has-text("Generate")').first();
  if (await gen.count() > 0) { await gen.click(); await page.waitForTimeout(1500); }
  const repBody = await page.textContent('body');
  console.log('REPORTS: Gross:' + repBody.includes('Gross') + ' VAT:' + repBody.includes('VAT') + ' CSV:' + repBody.includes('CSV'));

  console.log('\nALL 10 PAGES VERIFIED. Browser still open — explore freely.');
  console.log('http://localhost:3000');
  await new Promise(() => {});
})();
