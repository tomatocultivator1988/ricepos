import { test } from '@playwright/test';
test('debug', async ({ page }) => {
  await page.goto('http://localhost:3000/backoffice/items');
  await page.waitForTimeout(3000);
  console.log('PAGE LOADED');
});
