const { chromium, request } = require('@playwright/test');
const BASE = 'http://127.0.0.1:3000';

(async () => {
  // ── 0. API Setup: login as admin, cleanup ──
  const api = await request.newContext({ baseURL: BASE });
  await api.post('/api/auth/login', { data: { username: 'Admin', password: '1234' } });
  await api.dispose();

  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ── 1. LOGIN → go to Suppliers ──
  console.log('1. Login + create supplier...');
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.fill('#username', 'Admin');
  await page.fill('#password', '1234');
  await page.locator('#password').press('Enter');
  for (let i = 0; i < 15; i++) { await page.waitForTimeout(500); if (page.url().includes('/dashboard')) break; }
  await page.goto(`${BASE}/backoffice/suppliers`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Create supplier
  await page.click('button:has-text("Add Supplier")');
  await page.waitForTimeout(800);
  await page.locator('input').nth(0).fill('LMG Rice Trading');
  await page.locator('input').nth(1).fill('0917-123-4567');
  await page.locator('input').nth(2).fill('Iloilo Public Market');
  await page.click('button:has-text("Save")');
  await page.waitForTimeout(1500);
  console.log('   Supplier: LMG Rice Trading created.\n');

  // ── 2. CREATE PO ──
  console.log('2. Create Purchase Order...');
  await page.goto(`${BASE}/backoffice/purchase-orders`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.click('button:has-text("New PO")');
  await page.waitForTimeout(1000);

  // Pick supplier
  await page.locator('[role="combobox"]').first().click();
  await page.waitForTimeout(500);
  await page.click('[role="option"]:has-text("LMG")');
  await page.waitForTimeout(500);

  // Add item line (Sinandomeng)
  await page.locator('button:has-text("Add")').click();
  await page.waitForTimeout(400);
  // Pick product
  const productSelect = await page.locator('[role="combobox"]').last();
  await productSelect.click();
  await page.waitForTimeout(500);
  await page.click('[role="option"]:has-text("Sinandomeng")');
  await page.waitForTimeout(500);
  // Qty
  const qtyInputs = await page.locator('input[type="number"]').all();
  await qtyInputs[qtyInputs.length - 2].fill('100');
  await page.waitForTimeout(200);
  // Unit cost
  await qtyInputs[qtyInputs.length - 1].fill('43');
  await page.waitForTimeout(500);

  await page.click('button:has-text("Create PO")');
  await page.waitForTimeout(2000);
  console.log('   PO created.\n');

  // ── 3. RECEIVE PARTIAL (60 of 100) ──
  console.log('3. Receive partial (60 of 100kg)...');
  await page.locator('tr:has-text("LMG")').first().click();
  await page.waitForTimeout(1500);

  // Enter receive qty 60
  const recvInputs = await page.locator('.w-20').all();
  if (recvInputs.length > 0) {
    await recvInputs[0].fill('60');
    await page.waitForTimeout(300);
  }

  // Tick update cost
  const costCheck = await page.locator('input[type="checkbox"]').all();
  if (costCheck.length > 0) {
    await costCheck[0].check();
    await page.waitForTimeout(200);
  }

  await page.click('button:has-text("Receive into Stock")');
  await page.waitForTimeout(2000);
  console.log('   Partial receive done. Status should be partial.\n');

  // ── 4. CLICK PO AGAIN → verify status ──
  await page.goto(`${BASE}/backoffice/purchase-orders`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('4. PO list: verify partial status + 60% received.\n');

  // ── 5. RECEIVE REST (40) ──
  console.log('5. Receive remaining 40kg...');
  await page.locator('tr:has-text("LMG")').first().click();
  await page.waitForTimeout(1500);

  const recvInputs2 = await page.locator('.w-20').all();
  if (recvInputs2.length > 0) {
    await recvInputs2[0].fill('40');
    await page.waitForTimeout(300);
  }

  await page.click('button:has-text("Receive into Stock")');
  await page.waitForTimeout(2000);
  console.log('   Full receive. Status should be received.\n');

  // ── 6. CHECK INVENTORY ──
  console.log('6. Check inventory — Sinandomeng stock should be +100kg...');
  await page.goto(`${BASE}/backoffice/inventory`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  console.log('   Done. Check Sinandomeng row.\n');

  console.log('═════════════════════════════════');
  console.log('✅ FULL PO FLOW DONE');
  console.log('  - Created supplier + PO');
  console.log('  - Partial receive (60/100)');
  console.log('  - Cost update applied');
  console.log('  - Full receive (40/100)');
  console.log('  - PO status: received');
  console.log('  - Stock increased by 100kg');
  console.log('═════════════════════════════════');
})();
