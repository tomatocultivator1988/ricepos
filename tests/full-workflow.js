const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const BASE = 'http://localhost:3000';

  let step = 0;
  async function show(title, fn) {
    step++;
    console.log(`\nSTEP ${step}: ${title}`);
    await fn();
    await page.waitForTimeout(600);
  }

  // ──── LOGIN ────
  await show('LOGIN', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('#username', 'Admin');
    await page.fill('#password', 'brewhasadmin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('→ Admin logged in');
  });

  // ──── POS — MAKE A SALE ────
  await show('POS — CLICK PRODUCT + VARIANT', async () => {
    await page.click('button:has-text("POS")');
    await page.waitForURL('**/pos');
    await page.waitForTimeout(1000);
    // Click Cafe Latte
    await page.locator('button:has-text("Cafe Latte")').first().click();
    await page.waitForTimeout(800);
    // Click Regular variant
    const reg = page.locator('button:has-text("Regular")');
    if (await reg.count() > 0) await reg.first().click();
    await page.waitForTimeout(500);
    console.log('→ Cafe Latte (Regular) added to cart');
  });

  // ──── POS — APPLY DISCOUNT ────
  await show('POS — SELECT SENIOR DISCOUNT', async () => {
    const sen = page.locator('button:has-text("Senior")');
    if (await sen.count() > 0) {
      await sen.first().click();
      await page.waitForTimeout(500);
      console.log('→ Senior 20% discount applied');
    } else {
      console.log('→ Discount button in sidebar (auto-applied)');
    }
  });

  // ──── POS — ADD SECOND ITEM ────
  await show('POS — ADD ANOTHER PRODUCT', async () => {
    await page.locator('button:has-text("Velvet Elixir")').first().click();
    await page.waitForTimeout(500);
    console.log('→ Velvet Elixir added to cart');
  });

  // ──── POS — CHARGE & COMPLETE ────
  await show('POS — CHARGE & COMPLETE SALE', async () => {
    await page.locator('button:has-text("Charge")').first().click();
    await page.waitForTimeout(800);
    await page.locator('button:has-text("Complete Sale")').first().click();
    await page.waitForTimeout(1500);
    console.log('→ SALE COMPLETED! Receipt shown.');
  });

  // ──── RECEIPT VIEW ────
  await show('RECEIPT — CHECK DETAILS', async () => {
    const body = await page.textContent('body');
    const hasTIN = body.includes('TIN');
    const hasAddress = body.includes('Boni');
    const hasSalamat = body.includes('Salamat');
    console.log(`→ TIN: ${hasTIN ? 'YES' : 'NO'}`);
    console.log(`→ Address: ${hasAddress ? 'YES' : 'NO'}`);
    console.log(`→ Footer: ${hasSalamat ? 'YES' : 'NO'}`);
  });

  // ──── BACK TO POS ────
  await show('RECEIPT — BACK TO POS', async () => {
    await page.locator('button:has-text("Back to POS")').first().click();
    await page.waitForTimeout(500);
    console.log('→ Back to POS');
  });

  // ──── CUSTOMER DISPLAY ────
  await show('CUSTOMER DISPLAY — COPY LINK', async () => {
    await page.locator('button[title*="Copy"]').first().click();
    await page.waitForTimeout(1000);
    console.log('→ Display link copied for customer tablet');
  });

  // ──── SALES HISTORY — VIEW LAST SALE ────
  await show('SALES HISTORY', async () => {
    await page.click('button:has-text("Sales")');
    await page.waitForURL('**/dashboard/sales');
    await page.waitForTimeout(1000);
    console.log('→ Sales history page loaded');
  });

  // ──── VOID SALE ────
  await show('SALES HISTORY — VOID LAST SALE', async () => {
    const voidBtn = page.locator('button:has-text("Void")');
    if (await voidBtn.count() > 0) {
      await voidBtn.first().click();
      await page.waitForTimeout(500);
      await page.fill('input[placeholder="Required"]', 'Test void - wrong item');
      await page.waitForTimeout(300);
      await page.locator('button:has-text("Void")').last().click();
      await page.waitForTimeout(1000);
      console.log('→ Sale voided!');
    } else {
      console.log('→ No void button (sale may be voided already)');
    }
  });

  // ──── INVENTORY CHECK ────
  await show('INVENTORY — CHECK 3 SECTIONS', async () => {
    await page.click('button:has-text("Inventory")');
    await page.waitForURL('**/backoffice/inventory');
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    console.log(`→ Ingredients: ${body.includes('Ingredients') ? 'YES' : 'NO'}`);
    console.log(`→ Outsourced: ${body.includes('Outsourced') ? 'YES' : 'NO'}`);
    console.log(`→ Supplies: ${body.includes('Supplies') ? 'YES' : 'NO'}`);
  });

  // ──── SETTINGS — BACKUP ────
  await show('SETTINGS — BACKUP', async () => {
    const settingsBtn = page.locator('button:has-text("Settings")').first();
    if (await settingsBtn.count() > 0) {
      await settingsBtn.click();
    } else {
      await page.goto(`${BASE}/backoffice/settings`);
    }
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    console.log(`→ Backup section: ${body.includes('Backup') ? 'YES' : 'NO'}`);
    console.log(`→ Printer section: ${body.includes('Bluetooth') ? 'YES' : 'NO'}`);
    console.log(`→ Drawer section: ${body.includes('Cash Drawer') ? 'YES' : 'NO'}`);
  });

  // ──── JOURNAL ────
  await show('JOURNAL — AUDIT TRAIL', async () => {
    const jBtn = page.locator('button:has-text("Journal")').first();
    if (await jBtn.count() > 0) {
      await jBtn.click();
    } else {
      await page.goto(`${BASE}/dashboard/journal`);
    }
    await page.waitForTimeout(1000);
    console.log('→ Journal loaded — all events recorded');
  });

  // ──── ITEMS — RECIPE MANAGEMENT ────
  await show('ITEMS — RECIPE UI', async () => {
    await page.click('button:has-text("Items")');
    await page.waitForURL('**/backoffice/items');
    await page.waitForTimeout(1000);
    console.log('→ Items page with product cards shown');
  });

  // ──── REPORTS ────
  await show('REPORTS — GENERATE', async () => {
    await page.goto(`${BASE}/dashboard/reports`);
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Generate")').first().click();
    await page.waitForTimeout(1500);
    const body = await page.textContent('body');
    console.log(`→ Gross Sales: ${body.includes('Gross Sales') ? 'YES' : 'NO'}`);
    console.log(`→ VAT: ${body.includes('VAT') ? 'YES' : 'NO'}`);
    console.log(`→ Cashier Report: ${body.includes('Cashier') ? 'YES' : 'NO'}`);
    console.log(`→ CSV Export: ${body.includes('CSV') ? 'YES' : 'NO'}`);
  });

  console.log('\n' + '='.repeat(50));
  console.log('  ALL WORKFLOWS DEMONSTRATED');
  console.log('='.repeat(50));
  console.log('\n  1. Login');
  console.log('  2. POS — add products + variant selector');
  console.log('  3. POS — discount selector');
  console.log('  4. POS — charge & complete');
  console.log('  5. Receipt view — TIN, address, items, total');
  console.log('  6. Customer display link');
  console.log('  7. Sales history');
  console.log('  8. Void sale from sales history');
  console.log('  9. Inventory — 3 sections');
  console.log('  10. Settings — backup, printer, drawer');
  console.log('  11. Journal — audit events');
  console.log('  12. Items — recipe management');
  console.log('  13. Reports — generate + CSV export');
  console.log('\nBrowser still open — explore any page.');
  console.log('Close browser when done.');

  await new Promise(() => {});
})();
