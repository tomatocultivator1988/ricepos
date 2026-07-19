import { test, expect } from "@playwright/test"

test.describe("Feature 1: Item Movements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backoffice/inventory")
    await page.waitForSelector("text=Inventory", { timeout: 10000 })
  })

  test("shows Movements button on inventory table rows", async ({ page }) => {
    const table = page.locator(".hidden.md\\:block")
    const movementsBtn = table.locator('button:has-text("Movements")').first()
    await expect(movementsBtn).toBeVisible({ timeout: 5000 })
  })

  test("opens Movements dialog and displays data", async ({ page }) => {
    const table = page.locator(".hidden.md\\:block")
    const movementsBtn = table.locator('button:has-text("Movements")').first()
    await movementsBtn.click()
    await page.waitForTimeout(1500)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator("text=Movements")).toBeVisible()
  })

  test("date filter shows in Movements dialog", async ({ page }) => {
    const table = page.locator(".hidden.md\\:block")
    const movementsBtn = table.locator('button:has-text("Movements")').first()
    await movementsBtn.click()
    await page.waitForTimeout(1500)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog.locator('input[type="date"]').first()).toBeVisible({ timeout: 3000 })
    await expect(dialog.locator('button:has-text("Filter")')).toBeVisible()
    await expect(dialog.locator("text=Movements")).toBeVisible()
  })
})

test.describe("Feature 2: Supplier PO History", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backoffice/suppliers")
    await page.waitForSelector("text=Suppliers", { timeout: 10000 })
  })

  test("opens supplier dialog and shows PO History section", async ({ page }) => {
    const table = page.locator(".hidden.md\\:block")
    const firstSupplier = table.locator("table tbody tr").first()
    await firstSupplier.click()
    await page.waitForTimeout(1000)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    await expect(dialog.locator("text=Purchase Order History")).toBeVisible({ timeout: 5000 })
  })
})

test.describe("Feature 3a: Expense Categories", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backoffice/settings")
    await page.waitForSelector("text=Settings", { timeout: 10000 })
  })

  test("Expense Categories tab exists and loads manager", async ({ page }) => {
    const tab = page.getByRole("button", { name: "Expense Categories" })
    await expect(tab).toBeVisible({ timeout: 5000 })
    await tab.click()
    await page.waitForTimeout(500)
    const heading = page.getByRole("heading", { name: "Expense Categories", exact: true })
    await expect(heading).toBeVisible()
    await expect(page.getByRole("button", { name: "Add Category" })).toBeVisible()
  })
})

test.describe("Feature 3b: Expenses CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/backoffice/expenses")
    await page.waitForSelector("text=Expenses", { timeout: 10000 })
  })

  test("shows edit and delete buttons on expense table rows", async ({ page }) => {
    const rows = page.locator("table tbody tr")
    const count = await rows.count()
    if (count > 0) {
      const pencilBtn = rows.first().locator('button:has([class*="lucide-pencil"])')
      await expect(pencilBtn).toBeVisible({ timeout: 5000 })
      const trashBtn = rows.first().locator('button:has([class*="lucide-trash"])')
      await expect(trashBtn).toBeVisible({ timeout: 3000 })
    }
  })
})
