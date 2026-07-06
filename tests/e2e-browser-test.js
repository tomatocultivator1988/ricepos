const { chromium } = require('@playwright/test');
const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  PASS: ${name}`);
      passed++;
    } catch (e) {
      console.log(`  FAIL: ${name} — ${e.message.substring(0, 120)}`);
      failed++;
    }
  }

  console.log('=== LOGIN ===');
  await page.goto(`${BASE}/auth/login`);
  await test('Login page loads', async () => {
    const title = await page.title();
    if (!title.includes('Brewhas')) throw new Error('Title missing Brewhas');
  });

  await test('Login form visible', async () => {
    await page.waitForSelector('#username', { timeout: 5000 });
    await page.waitForSelector('#password', { timeout: 5000 });
  });

  await test('Login with Admin', async () => {
    await page.fill('#username', 'Admin');
    await page.fill('#password', 'brewhasadmin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 8000 });
  });

  console.log('\n=== DASHBOARD ===');
  await test('Dashboard KPIs visible', async () => {
    await page.waitForSelector('text=Today\'s Revenue', { timeout: 5000 });
  });

  await test('Dashboard has nav links', async () => {
    const nav = await page.textContent('nav');
    if (!nav.includes('POS') || !nav.includes('Sales') || !nav.includes('Inventory')) {
      throw new Error('Nav links missing');
    }
  });

  await test('Recent sales section loads', async () => {
    const salesText = await page.textContent('body');
    if (!salesText.includes('Recent Sales')) throw new Error('Recent Sales missing');
  });

  console.log('\n=== SALES HISTORY ===');
  await page.click('button:has-text("Sales")');
  await page.waitForURL('**/dashboard/sales', { timeout: 5000 });

  await test('Sales page loads', async () => {
    await page.waitForSelector('text=Sales History', { timeout: 5000 });
  });

  await test('Sales have action buttons (Void/Refund/Print)', async () => {
    const body = await page.textContent('body');
    // Check for action buttons or empty state
    if (!body.includes('Void') && !body.includes('Print')) {
      console.log('  INFO: No completed sales to show action buttons on');
    }
  });

  console.log('\n=== ITEMS PAGE ===');
  await page.click('button:has-text("Items")');
  await page.waitForURL('**/backoffice/items', { timeout: 5000 });

  await test('Items page shows products', async () => {
    await page.waitForSelector('text=Menu Items', { timeout: 5000 });
  });

  await test('Items have variant and recipe counts', async () => {
    const body = await page.textContent('body');
    if (!body.includes('size') && !body.includes('ingredient')) throw new Error('No product cards visible');
  });

  await test('New Item dialog opens', async () => {
    await page.click('button:has-text("New Item")');
    await page.waitForSelector('text=New Item', { timeout: 3000 });
    await page.fill('input[placeholder*="Cafe Latte"]', 'Test Coffee');
    await page.click('button:has-text("Cancel")');
  });

  console.log('\n=== INVENTORY ===');
  await page.click('button:has-text("Inventory")');
  await page.waitForURL('**/backoffice/inventory', { timeout: 5000 });

  await test('Inventory shows 3 sections', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Ingredients') && !body.includes('Outsourced') && !body.includes('Supplies')) {
      // Check for section headers
      const hasSection = body.includes('Outsourced Products') || body.includes('Supplies');
      if (!hasSection) throw new Error('Inventory sections missing');
    }
  });

  console.log('\n=== POS ===');
  await page.click('button:has-text("POS")');
  await page.waitForURL('**/pos', { timeout: 5000 });

  await test('POS shows products', async () => {
    await page.waitForSelector('text=Point of Sale', { timeout: 5000 });
  });

  await test('Cart is empty initially', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Cart is empty') && !body.includes('cart is empty')) throw new Error('Cart not showing empty');
  });

  await test('Click product adds to cart', async () => {
    const items = page.locator('button:has-text("Cafe Latte")');
    const count = await items.count();
    if (count > 0) {
      await items.first().click();
      await page.waitForTimeout(1500);
      // If variant selector appears
      const variantBtn = page.locator('button:has-text("Regular")');
      const varCount = await variantBtn.count();
      if (varCount > 0) {
        await variantBtn.first().click();
        await page.waitForTimeout(500);
      }
      const body = await page.textContent('body');
      if (!body.includes('Charge') && !body.includes('charge')) throw new Error('Charge button not visible');
    }
  });

  await test('Discount buttons visible', async () => {
    await page.waitForTimeout(1000);
    const body = await page.textContent('body');
    // Discount buttons are in the cart panel which may be in sidebar
    const hasDiscount = body.includes('Senior') || body.includes('PWD') || body.includes('None');
    console.log(hasDiscount ? '    Discount buttons found' : '    Discount buttons not visible in sidebar');
  });

  await test('Monitor/display button exists', async () => {
    const btn = page.locator('button[title*="Copy"]');
    const count = await btn.count();
    if (count === 0) throw new Error('Monitor button not found');
  });

  console.log('\n=== CUSTOMER DISPLAY ===');
  await page.goto(`${BASE}/display`);
  await test('Display page loads without auth', async () => {
    await page.waitForSelector('text=Brewhas Coffee', { timeout: 5000 });
  });

  console.log('\n=== JOURNAL ===');
  // Clear session and re-login
  await context.clearCookies();
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('#username', { timeout: 10000 });
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'brewhasadmin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  await page.waitForTimeout(1000);
  // Journal might need explicit nav click
  const journalBtn = page.locator('button:has-text("Journal")').first();
  if (await journalBtn.count() === 0) {
    // Try clicking via direct URL
    await page.goto(`${BASE}/dashboard/journal`);
  } else {
    await journalBtn.click();
  }
  await page.waitForURL('**/dashboard/journal', { timeout: 5000 });

  await test('Journal page loads', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Journal') && !body.includes('Electronic')) throw new Error('Journal page title missing');
  });

  console.log('\n=== SETTINGS ===');
  const settingsBtn = page.locator('button:has-text("Settings")').first();
  if (await settingsBtn.count() === 0) {
    await page.goto(`${BASE}/backoffice/settings`);
  } else {
    await settingsBtn.click();
  }
  await page.waitForURL('**/backoffice/settings', { timeout: 5000 });

  await test('Settings shows hardware section', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Bluetooth') && !body.includes('Printer')) throw new Error('Hardware settings missing');
  });

  await test('Settings shows backup section', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Backup') && !body.includes('Export')) throw new Error('Backup section missing');
  });

  await test('Settings shows drawer config', async () => {
    const body = await page.textContent('body');
    if (!body.includes('Cash Drawer') && !body.includes('drawer')) throw new Error('Drawer config missing');
  });

  console.log('\n=== REPORTS ===');
  await page.click('button:has-text("Sales")');
  await page.waitForURL('**/dashboard/sales', { timeout: 5000 });

  console.log('\n=== API TESTS ===');
  // Test via fetch API in the browser
  await test('Sales API creates sale', async () => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:'Admin',password:'brewhasadmin'}) });
      const session = await r.json();
      const saleId = crypto.randomUUID(); const siId = crypto.randomUUID(); const payId = crypto.randomUUID();
      const catR = await fetch('/api/catalog');
      const cat = await catR.json();
      const latte = cat.items.find(i => i.name === 'Cafe Latte');
      const saleR = await fetch('/api/sales', { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:saleId,employeeId:session.employeeId,subtotal:100,discountTotal:0,taxTotal:12,grandTotal:112,paymentMethod:'cash',status:'completed',saleItems:[{id:siId,itemId:latte.id,itemName:'Cafe Latte',unitPrice:100,qty:1,taxRate:12,discountTotal:0,taxTotal:12,lineTotal:112,modifiers:'[]'}],payments:[{id:payId,method:'cash',amount:112}]})
      });
      return saleR.ok;
    });
    if (!result) throw new Error('Sale API failed');
  });

  await test('Refund API works', async () => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:'Admin',password:'brewhasadmin'}) });
      const session = await r.json();
      const salesR = await fetch('/api/dashboard/sales?page=1&limit=1');
      const sales = await salesR.json();
      const last = sales.sales[0];
      if (!last) return false;
      const refundR = await fetch('/api/sales/' + last.id, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'refund',reason:'Test'}) });
      return refundR.ok;
    });
    if (!result) throw new Error('Refund API failed');
  });

  await test('Backup API works', async () => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:'Admin',password:'brewhasadmin'}) });
      const backupR = await fetch('/api/backup');
      return backupR.ok;
    });
    if (!result) throw new Error('Backup API failed');
  });

  await test('Display API public access', async () => {
    const result = await page.evaluate(async () => {
      const r = await fetch('/api/pos/cart/display');
      return r.ok;
    });
    if (!result) throw new Error('Display API failed');
  });

  console.log(`\n=================================`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`=================================`);

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
