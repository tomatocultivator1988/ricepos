const { chromium } = require('@playwright/test');

const BASE = 'http://localhost:3000';

async function login(page) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('input#username', 'maria');
  await page.fill('input#password', '5678');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log('After login URL:', url);
  if (url.includes('/auth')) {
    // Login may have failed - take screenshot
    await page.screenshot({ path: 'screenshots/login-debug.png' });
    console.log('Login failed screenshot saved');
    return;
  }
}

async function screenshotModal(page, pageUrl, openBtnSelector, dialogSelector, name) {
  await page.goto(pageUrl);
  await page.waitForTimeout(1500);
  const btn = page.locator(openBtnSelector).first();
  if (await btn.isVisible().catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(800);
    const dialog = page.locator(dialogSelector).first();
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.screenshot({ path: `screenshots/${name}.png` });
      console.log(`OK: ${name}`);
    } else {
      console.log(`SKIP (no dialog): ${name}`);
    }
  } else {
    console.log(`SKIP (no btn): ${name}`);
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  try {
    await login(page);

    // POS modals
    await screenshotModal(page, `${BASE}/pos`, 'button:has-text("Walk-in")', '[data-slot="dialog-content"]', 'pos-unit-picker');
    // Payment modal - click Pay button
    await page.goto(`${BASE}/pos`);
    await page.waitForTimeout(1500);

    // Customer search
    await page.goto(`${BASE}/pos`);
    await page.waitForTimeout(1500);
    const custBtn = page.locator('button:has-text("Walk-in")').first();
    if (await custBtn.isVisible().catch(() => false)) {
      await custBtn.click();
      await page.waitForTimeout(500);
    }

    // Backoffice items - Add Product
    await screenshotModal(page, `${BASE}/backoffice/items`, 'button:has-text("Add Product")', '[data-slot="dialog-content"]', 'backoffice-items-add');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // Backoffice inventory - Receive Delivery
    await screenshotModal(page, `${BASE}/backoffice/inventory`, 'button:has-text("Receive")', '[data-slot="dialog-content"]', 'backoffice-inventory-receive');
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // Backoffice inventory - Adjust Stock
    await page.goto(`${BASE}/backoffice/inventory`);
    await page.waitForTimeout(1500);
    const adjBtn = page.locator('button:has-text("Adjust")').first();
    if (await adjBtn.isVisible().catch(() => false)) {
      await adjBtn.click();
      await page.waitForTimeout(500);
      await page.locator('[data-slot="dialog-content"]').screenshot({ path: 'screenshots/backoffice-inventory-adjust.png' });
      console.log('OK: backoffice-inventory-adjust');
    }

    // Backoffice customers - Add Customer
    await screenshotModal(page, `${BASE}/backoffice/customers`, 'button:has-text("Add Customer")', '[data-slot="dialog-content"]', 'backoffice-customers-add');
    await page.keyboard.press('Escape');

    // Backoffice customers - Detail
    await page.goto(`${BASE}/backoffice/customers`);
    await page.waitForTimeout(1500);
    const row = page.locator('table tbody tr').first();
    if (await row.isVisible().catch(() => false)) {
      await row.click();
      await page.waitForTimeout(800);
      await page.locator('[data-slot="dialog-content"]').screenshot({ path: 'screenshots/backoffice-customers-detail.png' });
      console.log('OK: backoffice-customers-detail');
    }

    // Backoffice PO - New PO
    await screenshotModal(page, `${BASE}/backoffice/purchase-orders`, 'button:has-text("New PO")', '[data-slot="dialog-content"]', 'backoffice-po-create');
    await page.keyboard.press('Escape');

    // Backoffice categories - Add
    await screenshotModal(page, `${BASE}/backoffice/categories`, 'button:has-text("Add Category")', '[data-slot="dialog-content"]', 'backoffice-categories-add');
    await page.keyboard.press('Escape');

    // Backoffice discounts - Add
    await screenshotModal(page, `${BASE}/backoffice/discounts`, 'button:has-text("Add Discount")', '[data-slot="dialog-content"]', 'backoffice-discounts-add');
    await page.keyboard.press('Escape');

    // Backoffice employees - Add
    await screenshotModal(page, `${BASE}/backoffice/employees`, 'button:has-text("Add Employee")', '[data-slot="dialog-content"]', 'backoffice-employees-add');
    await page.keyboard.press('Escape');

    // Backoffice expenses - Add
    await screenshotModal(page, `${BASE}/backoffice/expenses`, 'button:has-text("Add Expense")', '[data-slot="dialog-content"]', 'backoffice-expenses-add');
    await page.keyboard.press('Escape');

    // Backoffice suppliers - Add
    await screenshotModal(page, `${BASE}/backoffice/suppliers`, 'button:has-text("Add Supplier")', '[data-slot="dialog-content"]', 'backoffice-suppliers-add');
    await page.keyboard.press('Escape');

    // Backoffice tax-rates - Add
    await screenshotModal(page, `${BASE}/backoffice/tax-rates`, 'button:has-text("Add Tax Rate")', '[data-slot="dialog-content"]', 'backoffice-taxrates-add');
    await page.keyboard.press('Escape');

    // Dashboard sales - table exists, click any row to see detail? Or the action button
    await page.goto(`${BASE}/dashboard/sales`);
    await page.waitForTimeout(1500);
    const saleRow = page.locator('table tbody tr button:has-text("Void")').first();
    if (await saleRow.isVisible().catch(() => false)) {
      await saleRow.click();
      await page.waitForTimeout(500);
      await page.locator('[data-slot="dialog-content"]').screenshot({ path: 'screenshots/dashboard-sales-action.png' });
      console.log('OK: dashboard-sales-action');
    }

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await browser.close();
  }
})();
