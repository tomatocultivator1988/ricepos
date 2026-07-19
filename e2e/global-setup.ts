import { chromium, FullConfig } from "@playwright/test"

const ADMIN_USER = "Admin"
const ADMIN_PASS = "1234"
const BASE = "http://localhost:3000"

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${BASE}/auth/login`)
  await page.fill("#username", ADMIN_USER)
  await page.fill("#password", ADMIN_PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/dashboard/, { timeout: 15000 })
  await page.context().storageState({ path: "storageState.json" })
  await browser.close()
}

export default globalSetup
