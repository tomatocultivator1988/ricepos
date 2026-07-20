import { test, expect } from "@playwright/test"

test.describe("POS Hold / Park Cart", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pos")
    await page.waitForSelector("text=All", { timeout: 15000 })

    // Clear stale held carts from previous runs
    await page.evaluate(async () => {
      await fetch("/api/pos/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart_data: { carts: [], activeId: null } }),
      })
    })
    await page.waitForTimeout(600)
    await page.reload()
    await page.waitForSelector("text=All", { timeout: 15000 })

    // Open shift if dialog is showing — wait a beat for shift API to resolve
    await page.waitForTimeout(2000)
    const shiftBtn = page.locator("button:has-text('Open Shift')").first()
    if (await shiftBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await shiftBtn.click()
      await page.waitForTimeout(3000)
      await page.keyboard.press("Escape")
      await page.waitForTimeout(500)
    }
  })

  test("Hold button is disabled when cart is empty", async ({ page }) => {
    const holdBtn = page.locator("button").filter({ hasText: "Hold" })
    await expect(holdBtn).toBeDisabled({ timeout: 8000 })
  })

  test("Holds active cart, verifies Held bar, resumes cart with items intact", async ({ page }) => {
    // Click first product to open unit picker
    const product = page.locator("button").filter({ hasText: /Stock:/ }).first()
    await expect(product).toBeVisible({ timeout: 5000 })
    await product.click()
    await page.waitForTimeout(800)

    // Unit picker dialog should be open
    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Click "Add to Cart"
    await dialog.getByRole("button", { name: /Add to Cart/ }).click()
    await page.waitForTimeout(500)

    // Cart should have 1 item
    await expect(page.locator("text=Cart (1)")).toBeVisible({ timeout: 5000 })

    // Click Hold
    const holdBtn = page.locator("button").filter({ hasText: "Hold" })
    await expect(holdBtn).toBeEnabled({ timeout: 3000 })
    await holdBtn.click()
    await page.waitForTimeout(500)

    // Held bar should appear
    await expect(page.locator("text=Held (1)")).toBeVisible({ timeout: 5000 })

    // Cart should be empty
    await expect(page.locator("text=Cart (0)")).toBeVisible({ timeout: 5000 })

    // Click the held cart chip to resume
    const heldChip = page.locator("button").filter({ hasText: /Customer #\d+/ })
    await expect(heldChip).toBeVisible({ timeout: 3000 })
    await heldChip.click()
    await page.waitForTimeout(500)

    // Held bar gone, cart has items again
    await expect(page.locator("text=Held (1)")).not.toBeVisible({ timeout: 5000 })
    await expect(page.locator("text=Cart (1)")).toBeVisible({ timeout: 5000 })
  })

  test("Multiple holds and resume works", async ({ page }) => {
    async function addItem(idx: number) {
      const products = page.locator("button").filter({ hasText: /Stock:/ })
      const product = products.nth(idx)
      await product.click()
      await page.waitForTimeout(500)
      const dialog = page.getByRole("dialog")
      await dialog.getByRole("button", { name: /Add to Cart/ }).click()
      await page.waitForTimeout(500)
    }

    // Add first item, then hold
    await addItem(0)
    await expect(page.locator("text=Cart (1)")).toBeVisible({ timeout: 5000 })
    await page.locator("button").filter({ hasText: "Hold" }).click()
    await page.waitForTimeout(500)
    await expect(page.locator("text=Held (1)")).toBeVisible()

    // Add second item from different index, then hold
    await addItem(1)
    await page.locator("button").filter({ hasText: "Hold" }).click()
    await page.waitForTimeout(500)
    await expect(page.locator("text=Held (2)")).toBeVisible()

    // Verify two held chips
    const heldChips = page.locator("button").filter({ hasText: /Customer #\d+/ })
    await expect(heldChips).toHaveCount(2)

    // Resume first held chip
    await heldChips.first().click()
    await page.waitForTimeout(500)
    await expect(page.locator("text=Held (1)")).toBeVisible()
    await expect(page.locator("text=Cart (1)")).toBeVisible()
  })
})
