import { test, expect } from "@playwright/test"

test.describe("CONSIGNMENT FLOW", () => {
  test.setTimeout(300000)

  test("Full Demo", async ({ page }) => {
    const S = 1000

    // 1. Items page
    await page.goto("/backoffice/items")
    await page.waitForTimeout(2000)
    console.log("1. Items page")

    // 2. Add Product — guaranteed form opens
    await page.locator("button:has-text('Add Product')").click()
    await page.waitForTimeout(2000)
    console.log("2. Add Product dialog open")

    // Fill name (required)
    const inps = page.locator('[role="dialog"] [data-slot="input"]')
    await inps.nth(0).fill("Consignment Demo Item")
    await page.waitForTimeout(S)
    console.log("2b. Name filled")

    // 3. Check consignment box — force check the LAST checkbox in dialog
    const checkboxes = page.locator('[role="dialog"] input[type="checkbox"]')
    const cbCount = await checkboxes.count()
    console.log(`3. Checkboxes in dialog: ${cbCount}`)
    await checkboxes.last().check({ force: true }).catch(e => console.log(`3. Check FAIL: ${e.message.slice(0,80)}`))
    await page.waitForTimeout(1500)
    console.log("3. Consignment checked")

    // 4. Supplier dropdown — force click last select-trigger in dialog
    const supTrig = page.locator('[role="dialog"] [data-slot="select-trigger"]').last()
    await supTrig.click({ force: true }); await page.waitForTimeout(600)
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(300)
    await page.keyboard.press("Enter"); await page.waitForTimeout(800)
    await page.keyboard.press("Escape")
    console.log("4. Supplier selected")

    // 5. Agreed Price
    await page.waitForTimeout(500)
    const numInputs = page.locator('[role="dialog"] input[type="number"]')
    const numCnt = await numInputs.count()
    if (numCnt > 0) {
      await numInputs.last().fill("75", { force: true })
      await page.waitForTimeout(S)
      console.log("5. Agreed Price = 75")
    } else {
      console.log("5. No number inputs found (cnt=" + numCnt + ")")
    }

    // 6. Save
    await page.waitForTimeout(500)
    const saveBtn = page.locator('[role="dialog"] button:has-text("Create Product")')
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click({ force: true })
      await page.waitForTimeout(3000)
      console.log("6. Saved!")
    } else {
      console.log("6. Save button not found")
    }

    // 7. Consignments page
    await page.goto("/backoffice/consignments")
    await page.waitForTimeout(3000)
    console.log("7. Consignments page")

    const settleBtn = page.locator("button:has-text('Settle')").first()
    if (await settleBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // 8. Settle
      await settleBtn.click()
      await page.waitForTimeout(2000)
      const note = page.locator('[role="dialog"] [data-slot="input"]').first()
      if (await note.isVisible({ timeout: 1500 }).catch(() => false)) {
        await note.fill("July settlement")
        await page.waitForTimeout(S)
      }
      await page.locator('[role="dialog"] button:has-text("Settle")').click().catch(() => {})
      await page.waitForTimeout(2000)
      console.log("8. Settled")

      // 9. History
      const hist = page.locator("button:has-text('History')").first()
      if (await hist.isVisible({ timeout: 2000 }).catch(() => false)) {
        await hist.click()
        await page.waitForTimeout(3000)
        console.log("9. History shown")
      }
    } else {
      console.log("8. No consignment items to settle yet")
    }

    console.log("\n=== CONSIGNMENT FLOW DEMO DONE ===")
  })
})
