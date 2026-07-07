import "dotenv/config"
import { db } from "./client"
import { hash } from "bcryptjs"
import { v4 as uuid } from "uuid"

async function seed() {
  const { data: existingStore } = await db.from("stores").select("id").limit(1).single()
  if (existingStore) {
    console.log("Seed already run — skipping")
    process.exit(0)
  }

  // ── STORE ──
  const { data: store } = await db
    .from("stores")
    .insert({
      id: uuid(),
      name: "GroceryPOS Store",
      tin: "000-000-000-000",
      address: "Market Street, Iloilo City",
      contact: "0900-000-0000",
      currency: "PHP",
      currency_symbol: "\u20B1",
      timezone: "Asia/Manila",
    })
    .select()
    .single()

  // ── TAX RATES ──
  await db.from("tax_rates").insert([
    { id: uuid(), store_id: store.id, name: "VAT 12%", rate: "0.12" },
    { id: uuid(), store_id: store.id, name: "VAT Exempt", rate: "0.00" },
  ])
  const { data: taxRates } = await db.from("tax_rates").select("*").eq("store_id", store.id)
  const vat12 = taxRates!.find((t: any) => t.name === "VAT 12%")
  const vatExempt = taxRates!.find((t: any) => t.name === "VAT Exempt")

  // ── DISCOUNTS ──
  await db.from("discounts").insert([
    { id: uuid(), store_id: store.id, name: "Senior 20%", type: "senior", value: "20.00", is_active: true },
    { id: uuid(), store_id: store.id, name: "PWD 20%", type: "pwd", value: "20.00", is_active: true },
  ])

  // ── EMPLOYEES ──
  const adminHash = await hash("1234", 10)
  const cashierHash = await hash("5678", 10)
  await db.from("employees").insert([
    { id: uuid(), store_id: store.id, name: "Admin", role: "admin", pin_hash: adminHash, is_active: true },
    { id: uuid(), store_id: store.id, name: "Maria", role: "cashier", pin_hash: cashierHash, is_active: true },
  ])

  // ── CATEGORIES ──
  const catData = [
    { name: "Rice", sort_order: 0, color: "#16a34a" },
    { name: "Canned Goods", sort_order: 1, color: "#dc2626" },
    { name: "Noodles", sort_order: 2, color: "#f59e0b" },
    { name: "Beverages", sort_order: 3, color: "#3b82f6" },
    { name: "Snacks", sort_order: 4, color: "#ec4899" },
    { name: "Toiletries", sort_order: 5, color: "#8b5cf6" },
    { name: "Condiments", sort_order: 6, color: "#84cc16" },
    { name: "Others", sort_order: 7, color: "#6b7280" },
  ]
  for (const c of catData) {
    await db.from("categories").insert({ id: uuid(), store_id: store.id, ...c })
  }
  const { data: categories } = await db.from("categories").select("*").eq("store_id", store.id)
  const cat = (name: string) => categories!.find((c: any) => c.name === name)

  // ── HELPER: create item ──
  async function createItem(opts: {
    name: string; categoryName: string; sellBy: "weight" | "unit";
    cost: string; barcode?: string; stockQty: string; minStock: string;
    taxId: any; discountEligible: boolean;
    units: { name: string; baseQty: string; price: string; isDefault?: boolean; sortOrder?: number }[];
  }) {
    const itemId = uuid()
    await db.from("items").insert({
      id: itemId,
      store_id: store.id,
      name: opts.name,
      category_id: cat(opts.categoryName)!.id,
      sell_by: opts.sellBy,
      cost: opts.cost,
      barcode: opts.barcode || null,
      stock_qty: opts.stockQty,
      min_stock: opts.minStock,
      tax_rate_id: opts.taxId.id,
      discount_eligible: opts.discountEligible,
      status: "active",
    })
    for (const u of opts.units) {
      await db.from("selling_units").insert({
        id: uuid(),
        item_id: itemId,
        name: u.name,
        base_qty: u.baseQty,
        price: u.price,
        min_qty: opts.sellBy === "weight" ? "0.001" : "1",
        is_default: u.isDefault || false,
        sort_order: u.sortOrder || 0,
        is_active: true,
      })
    }
    return itemId
  }

  // ── RICE VARIETIES ──
  await createItem({
    name: "Sinandomeng", categoryName: "Rice", sellBy: "weight",
    cost: "42.00", stockQty: "500", minStock: "100",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Sack 50kg", baseQty: "50", price: "2500", sortOrder: 0 },
      { name: "Sack 25kg", baseQty: "25", price: "1300", sortOrder: 1 },
      { name: "10kg Pack", baseQty: "10", price: "523", sortOrder: 2 },
      { name: "Per Kilo", baseQty: "1", price: "55", isDefault: true, sortOrder: 3 },
      { name: "5kg Pack", baseQty: "5", price: "275", sortOrder: 4 },
      { name: "1kg Pack", baseQty: "1", price: "56", sortOrder: 5 },
    ],
  })

  await createItem({
    name: "Dinorado", categoryName: "Rice", sellBy: "weight",
    cost: "48.00", stockQty: "350", minStock: "80",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Sack 50kg", baseQty: "50", price: "2800", sortOrder: 0 },
      { name: "Sack 25kg", baseQty: "25", price: "1450", sortOrder: 1 },
      { name: "10kg Pack", baseQty: "10", price: "589", sortOrder: 2 },
      { name: "Per Kilo", baseQty: "1", price: "62", isDefault: true, sortOrder: 3 },
      { name: "5kg Pack", baseQty: "5", price: "310", sortOrder: 4 },
    ],
  })

  await createItem({
    name: "Jasmine Rice", categoryName: "Rice", sellBy: "weight",
    cost: "52.00", stockQty: "250", minStock: "60",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Sack 50kg", baseQty: "50", price: "3000", sortOrder: 0 },
      { name: "Sack 25kg", baseQty: "25", price: "1550", sortOrder: 1 },
      { name: "10kg Pack", baseQty: "10", price: "646", sortOrder: 2 },
      { name: "Per Kilo", baseQty: "1", price: "68", isDefault: true, sortOrder: 3 },
      { name: "5kg Pack", baseQty: "5", price: "340", sortOrder: 4 },
    ],
  })

  // ── GROCERY ITEMS (with barcodes) ──
  await createItem({
    name: "Lucky Me Pancit Canton", categoryName: "Noodles", sellBy: "unit",
    cost: "12.00", barcode: "4800016644931", stockQty: "200", minStock: "20",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "16", isDefault: true },
      { name: "Pack of 6", baseQty: "6", price: "90" },
    ],
  })

  await createItem({
    name: "Lucky Me Beef", categoryName: "Noodles", sellBy: "unit",
    cost: "12.00", barcode: "4800016644948", stockQty: "150", minStock: "15",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "16", isDefault: true },
    ],
  })

  await createItem({
    name: "Mega Sardines", categoryName: "Canned Goods", sellBy: "unit",
    cost: "20.00", barcode: "4800014210051", stockQty: "120", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "25", isDefault: true },
    ],
  })

  await createItem({
    name: "555 Tuna", categoryName: "Canned Goods", sellBy: "unit",
    cost: "28.00", barcode: "4800014740062", stockQty: "80", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "35", isDefault: true },
    ],
  })

  await createItem({
    name: "C2 Green Tea", categoryName: "Beverages", sellBy: "unit",
    cost: "12.00", barcode: "4803931000237", stockQty: "100", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "16", isDefault: true },
    ],
  })

  await createItem({
    name: "Coca-Cola 1.5L", categoryName: "Beverages", sellBy: "unit",
    cost: "68.00", barcode: "4801981110014", stockQty: "60", minStock: "5",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "85", isDefault: true },
    ],
  })

  await createItem({
    name: "Safeguard Soap", categoryName: "Toiletries", sellBy: "unit",
    cost: "32.00", barcode: "4902430423933", stockQty: "90", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "45", isDefault: true },
    ],
  })

  await createItem({
    name: "Sunsilk Shampoo", categoryName: "Toiletries", sellBy: "unit",
    cost: "5.50", barcode: "4800888200053", stockQty: "200", minStock: "15",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "8", isDefault: true },
    ],
  })

  await createItem({
    name: "Piattos Chips", categoryName: "Snacks", sellBy: "unit",
    cost: "12.00", barcode: "4800092101425", stockQty: "75", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "16", isDefault: true },
    ],
  })

  await createItem({
    name: "Silver Swan Soy Sauce", categoryName: "Condiments", sellBy: "unit",
    cost: "10.00", barcode: "4806501910033", stockQty: "130", minStock: "10",
    taxId: vat12, discountEligible: true,
    units: [
      { name: "Piece", baseQty: "1", price: "14", isDefault: true },
    ],
  })

  // ── LOOSE WEIGHT ITEMS ──
  await createItem({
    name: "White Sugar", categoryName: "Condiments", sellBy: "weight",
    cost: "58.00", stockQty: "150", minStock: "20",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Per Kilo", baseQty: "1", price: "75", isDefault: true },
      { name: "Per Pack (50g)", baseQty: "0.05", price: "5" },
    ],
  })

  await createItem({
    name: "Brown Sugar", categoryName: "Condiments", sellBy: "weight",
    cost: "52.00", stockQty: "100", minStock: "15",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Per Kilo", baseQty: "1", price: "68", isDefault: true },
    ],
  })

  await createItem({
    name: "Coffee (Brewed/Kilo)", categoryName: "Beverages", sellBy: "weight",
    cost: "280.00", stockQty: "20", minStock: "3",
    taxId: vatExempt, discountEligible: true,
    units: [
      { name: "Per Kilo", baseQty: "1", price: "350", isDefault: true },
      { name: "Per 250g", baseQty: "0.25", price: "90" },
    ],
  })

  // ── CUSTOMERS ──
  await db.from("customers").insert([
    { id: uuid(), store_id: store.id, name: "Juan Dela Cruz", contact: "09123456789", address: "Brgy. San Jose, Iloilo City", status: "active" },
    { id: uuid(), store_id: store.id, name: "Maria Santos", contact: "09187654321", address: "Brgy. Molo, Iloilo City", status: "active" },
    { id: uuid(), store_id: store.id, name: "Pedro Penduko", contact: "09151234567", address: "Brgy. Jaro, Iloilo City", status: "active" },
    { id: uuid(), store_id: store.id, name: "Lorna's Sari-Sari Store", contact: "09201112233", address: "Brgy. Lapaz, Iloilo City", status: "active" },
    { id: uuid(), store_id: store.id, name: "Nena's Canteen", contact: "09178889990", address: "Brgy. Mandurriao, Iloilo City", status: "active" },
  ])

  console.log("Seed complete!")
  console.log("  Store: GroceryPOS Store")
  console.log("  Admin login:   Admin / 1234")
  console.log("  Cashier login: Maria / 5678")
  console.log("  Products: 3 rice + 10 grocery + 3 loose = 16 items")
  console.log("  Customers: 5")
  process.exit(0)
}

seed().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
