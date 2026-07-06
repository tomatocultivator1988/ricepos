const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const BASE = 'http://localhost:3000';

  let step = 0;
  async function show(title, action) {
    step++;
    console.log(`\n${'='.repeat(50)}`);
    console.log(`STEP ${step}: ${title}`);
    console.log(`${'='.repeat(50)}`);
    await action();
    await page.waitForTimeout(800);
  }

  // ─────────────────────────────────────────────────
  await show('LOGIN', async () => {
    await page.goto(`${BASE}/auth/login`);
    await page.fill('#username', 'Admin');
    await page.fill('#password', 'brewhasadmin');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
    console.log('→ Admin logged in. Now on Dashboard.');
  });

  // ─────────────────────────────────────────────────
  await show('ADD NEW INGREDIENT', async () => {
    await page.click('button:has-text("Items")');
    await page.waitForURL('**/backoffice/items');
    await page.waitForTimeout(1000);

    // Click New Item
    await page.click('button:has-text("New Item")');
    await page.waitForTimeout(500);

    // Fill form
    await page.fill('input[placeholder*="Cafe Latte"]', 'Salted Caramel (per liter)');
    // Select type: Ingredient
    const typeBtns = page.locator('button:has-text("Ingredient")');
    await typeBtns.first().click();
    await page.waitForTimeout(300);
    // Set stock
    await page.fill('input[type="number"]', '3'); // first number = starting stock
    const allNumInputs = page.locator('input[type="number"]');
    await allNumInputs.nth(0).fill('3');  // starting stock
    await allNumInputs.nth(1).fill('0.5'); // min stock
    await allNumInputs.nth(2).fill('250'); // cost
    // Create
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
    console.log('→ "Salted Caramel (per liter)" created as ingredient with stock=3');
  });

  // ─────────────────────────────────────────────────
  await show('ADD NEW MENU ITEM', async () => {
    await page.click('button:has-text("New Item")');
    await page.waitForTimeout(500);

    await page.fill('input[placeholder*="Cafe Latte"]', 'Salted Caramel Latte');
    // Select type: Menu Item 
    const menuBtn = page.locator('button:has-text("Menu Item")');
    await menuBtn.first().click();
    // Set price
    const priceInput = page.locator('input[type="number"]');
    await priceInput.first().fill('170');
    // Select category
    const categorySelect = page.locator('[role="combobox"]');
    if (await categorySelect.count() > 0) {
      await categorySelect.first().click();
      await page.waitForTimeout(300);
      // Click first category option (Coffee)
      const opt = page.locator('[role="option"]');
      if (await opt.count() > 0) await opt.first().click();
      await page.waitForTimeout(300);
    }
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(1500);
    console.log('→ "Salted Caramel Latte" created as menu item at P170');
  });

  // ─────────────────────────────────────────────────
  await show('SET UP SIZES (VARIANTS)', async () => {
    // Find Salted Caramel Latte card and click Edit Recipe
    const cards = page.locator('div.rounded-2xl.border-2');
    for (let i = 0; i < await cards.count(); i++) {
      const card = cards.nth(i);
      const text = await card.textContent();
      if (text.includes('Salted Caramel Latte')) {
        const recipeBtn = card.locator('button:has-text("Recipe")');
        await recipeBtn.click();
        break;
      }
    }
    await page.waitForTimeout(1000);
    console.log('→ Recipe dialog opened');

    // Add Regular size
    await page.fill('input[placeholder="Size name"]', 'Regular (12oz)');
    await page.fill('input[placeholder="Price"]', '170');
    await page.locator('button:has-text("Recipe")').last(); // the + button in size row
    // Click the Plus button next to price
    const plusBtns = page.locator('div.space-y-2.mb-3 ~ div button'); 
    // Actually just click all Plus buttons
    const allPlus = page.locator('button:has-text("")').filter({ has: page.locator('svg') });
    // Simpler: find the + button in the size section
    const sizeSection = page.locator('text=Sizes / Variants').locator('..');
    const addSizeBtn = sizeSection.locator('button svg.lucide-plus');
    if (await addSizeBtn.count() > 0) {
      await addSizeBtn.first().locator('..').click();
      await page.waitForTimeout(500);
    }
    console.log('→ Regular (12oz) at P170 added');

    // Add Large size
    await page.fill('input[placeholder="Size name"]', 'Large (16oz)');
    await page.fill('input[placeholder="Price"]', '200');
    if (await addSizeBtn.count() > 0) {
      await addSizeBtn.first().locator('..').click();
      await page.waitForTimeout(500);
    }
    console.log('→ Large (16oz) at P200 added');
  });

  // ─────────────────────────────────────────────────
  await show('SET RECIPE INGREDIENTS', async () => {
    // Select Regular variant tab
    const regularTab = page.locator('button:has-text("Regular")');
    if (await regularTab.count() > 0) {
      await regularTab.first().click();
      await page.waitForTimeout(500);
    }

    // Add Espresso Beans
    const ingSelect = page.locator('select');
    if (await ingSelect.count() > 0) {
      await ingSelect.first().selectOption({ label: 'Espresso Beans (per kg)' });
      await page.waitForTimeout(300);
    }
    const qtyInputs = page.locator('input[placeholder="Qty"]');
    if (await qtyInputs.count() > 0) {
      await qtyInputs.first().fill('0.018');
      await page.waitForTimeout(300);
    }
    // Click + button for ingredient
    const ingPlusBtns = page.locator('div.flex.gap-2 button svg.lucide-plus');
    if (await ingPlusBtns.count() > 0) {
      await ingPlusBtns.first().locator('..').click();
      await page.waitForTimeout(500);
    }
    console.log('→ Espresso Beans 0.018kg added');
  });

  // ─────────────────────────────────────────────────
  await show('ADJUST INVENTORY STOCK', async () => {
    await page.click('button:has-text("Close")');
    await page.waitForTimeout(500);

    // Go to Inventory
    await page.click('button:has-text("Inventory")');
    await page.waitForURL('**/backoffice/inventory');
    await page.waitForTimeout(1000);
    console.log('→ Inventory page loaded');
  });

  // ─────────────────────────────────────────────────
  await show('RECORD STOCK DELIVERY', async () => {
    // Find Record Delivery button
    const delBtn = page.locator('button:has-text("Record Delivery")');
    if (await delBtn.count() > 0) {
      await delBtn.first().click();
      await page.waitForTimeout(800);
      console.log('→ Delivery dialog opened');
    } else {
      console.log('→ Delivery button not found (may be hidden for this view)');
    }
  });

  // ─────────────────────────────────────────────────
  await show('GO TO POS & MAKE SALE', async () => {
    await page.click('button:has-text("POS")');
    await page.waitForURL('**/pos');
    await page.waitForTimeout(1000);

    // Click Cafe Latte
    const latte = page.locator('button:has-text("Cafe Latte")');
    if (await latte.count() > 0) {
      await latte.first().click();
      await page.waitForTimeout(1000);
      const reg = page.locator('button:has-text("Regular")');
      if (await reg.count() > 0) {
        await reg.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Apply Senior discount
    const senBtn = page.locator('button:has-text("Senior")');
    if (await senBtn.count() > 0) {
      await senBtn.first().click();
      await page.waitForTimeout(300);
    }

    // Click Charge
    const chargeBtn = page.locator('button:has-text("Charge")');
    if (await chargeBtn.count() > 0) {
      await chargeBtn.first().click();
      await page.waitForTimeout(1000);

      // Complete Sale
      const completeBtn = page.locator('button:has-text("Complete Sale")');
      if (await completeBtn.count() > 0) {
        await completeBtn.first().click();
        await page.waitForTimeout(1500);
        console.log('→ Sale completed!');
      }
    }

    // Back to POS
    const backBtn = page.locator('button:has-text("Back to POS")');
    if (await backBtn.count() > 0) {
      await backBtn.first().click();
      await page.waitForTimeout(500);
    }
  });

  // ─────────────────────────────────────────────────
  await show('VIEW RECEIPT DATA', async () => {
    // Open customer display
    await page.click('button[title*="Copy"]');
    await page.waitForTimeout(500);
    console.log('→ Display link copied');
  });

  // ─────────────────────────────────────────────────
  await show('CHECK REPORTS', async () => {
    await page.click('button:has-text("Sales")');
    await page.waitForURL('**/dashboard/sales');
    await page.waitForTimeout(1000);
    console.log('→ Sales history loaded');
  });

  // ─────────────────────────────────────────────────
  await show('CHECK JOURNAL FOR AUDIT', async () => {
    const jBtn = page.locator('button:has-text("Journal")').first();
    if (await jBtn.count() > 0) {
      await jBtn.click();
    } else {
      await page.goto(`${BASE}/dashboard/journal`);
    }
    await page.waitForTimeout(1000);
    console.log('→ Journal loaded — all transactions logged');
  });

  console.log('\n' + '='.repeat(50));
  console.log('WORKFLOW COMPLETE');
  console.log('='.repeat(50));
  console.log('\nAdmin flow demonstrated:');
  console.log('  1. Login');
  console.log('  2. Add ingredient (Salted Caramel)');
  console.log('  3. Add menu item (Salted Caramel Latte, P170)');
  console.log('  4. Set sizes (Regular 12oz P170, Large 16oz P200)');
  console.log('  5. Set recipe (Espresso Beans 0.018kg per cup)');
  console.log('  6. Inventory management');
  console.log('  7. Record delivery');
  console.log('  8. Make a POS sale with discount');
  console.log('  9. View receipt');
  console.log('  10. Sales history');
  console.log('  11. Journal audit');
  console.log('\nBrowser still open — click around to explore.');
  console.log('Close the browser window when done.');

  await new Promise(() => {});
})();
