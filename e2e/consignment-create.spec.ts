import { test } from "@playwright/test"

test.describe("CONSIGNMENT ITEM", () => {
  test.setTimeout(60000)

  test("Fill everything + Consignment", async ({ page }) => {
    const S = 300

    await page.goto("/backoffice/items")
    await page.waitForTimeout(2000)
    await page.locator("button:has-text('Add Product')").click()
    await page.waitForTimeout(2000)

    // Separate text vs number inputs to avoid type mismatch
    const texts = () => page.locator('[role="dialog"] [data-slot="input"]:not([type="number"])')
    const nums = () => page.locator('[role="dialog"] [data-slot="input"][type="number"]')
    const cbs = page.locator('[role="dialog"] input[type="checkbox"]')
    const cbCnt = await cbs.count()
    console.log(`Checkboxes: ${cbCnt}`)

    // === TEXT INPUTS ===
    const tCount = await texts().count()
    // texts[0] = Name
    await texts().nth(0).fill("Consignment Rice 50kg"); await page.waitForTimeout(S)
    // texts[1] = Unit Name (placeholder "e.g.")
    if (tCount > 1) { await texts().nth(1).fill("Per Sack"); await page.waitForTimeout(S) }
    // texts[2] = Barcode
    if (tCount > 2) { await texts().nth(2).fill("8901234567890"); await page.waitForTimeout(S) }

    // === NUMBER INPUTS ===
    const nCount = await nums().count()
    // nums[0] = Cost
    if (nCount > 0) { await nums().nth(0).fill("55"); await page.waitForTimeout(S) }
    // nums[1] = Min Stock
    if (nCount > 1) { await nums().nth(1).fill("20"); await page.waitForTimeout(S) }
    // nums[2] = Base Qty (selling unit)
    if (nCount > 2) { await nums().nth(2).fill("1"); await page.waitForTimeout(S) }
    // nums[3] = Price (selling unit)
    if (nCount > 3) { await nums().nth(3).fill("1200"); await page.waitForTimeout(S) }
    // nums[4] = Min Qty
    if (nCount > 4) { await nums().nth(4).fill("1"); await page.waitForTimeout(S) }
    // nums[5] = Sort Order
    if (nCount > 5) { await nums().nth(5).fill("0"); await page.waitForTimeout(S) }

    // === CHECKBOXES ===
    // checkbox 0 = Senior/PWD
    if (cbCnt > 0) await cbs.nth(0).check({ force: true }); await page.waitForTimeout(S)
    // checkbox 1 = Consignment (if visible)
    if (cbCnt > 1) {
      await cbs.nth(1).check({ force: true }); await page.waitForTimeout(1000)
      // Agreed Price now visible — last number input
      const nAfter = await nums().count()
      if (nAfter > 6) {
        await nums().nth(nAfter - 1).fill("900"); await page.waitForTimeout(S)
        console.log("Agreed Price filled")
      }
    }

    console.log(`Texts:${tCount} Nums:${nCount} CBs:${cbCnt}`)

    // SAVE
    await page.locator('[role="dialog"] button:has-text("Create Product")').click()
    await page.waitForTimeout(3000)
    console.log("DONE")
  })
})
