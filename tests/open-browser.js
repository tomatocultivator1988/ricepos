const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://localhost:3000/auth/login');
  await page.fill('#username', 'Admin');
  await page.fill('#password', 'brewhasadmin');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');

  console.log('Browser opened at http://localhost:3000/dashboard');
  console.log('Click around to test the system.');
  console.log('Close the browser window when done.');

  // Keep alive until browser closes
  await new Promise(() => {});
})();
