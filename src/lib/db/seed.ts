import "dotenv/config"
import { db } from "./client"
import { hash } from "bcryptjs"

async function seed() {
  const { data: existingStore } = await db.from("stores").select("id").limit(1).single()
  if (existingStore) {
    console.log("Seed already run \u2014 skipping")
    process.exit(0)
  }

  const { data: store } = await db
    .from("stores")
    .insert({
      owner_id: "00000000-0000-0000-0000-000000000000",
      name: "Brewhas Coffeehouse",
      currency: "PHP",
      currency_symbol: "\u20B1",
      timezone: "Asia/Manila",
    })
    .select()
    .single()

  await db.from("tax_rates").insert([
    { store_id: store.id, name: "VAT 12%", rate: "12.00" },
    { store_id: store.id, name: "VAT Exempt", rate: "0.00" },
  ])

  const { data: coffeeCat } = await db
    .from("categories")
    .insert({ store_id: store.id, name: "Coffee", sort_order: 0 })
    .select()
    .single()

  const { data: signatureCat } = await db
    .from("categories")
    .insert({ store_id: store.id, name: "Signature Drinks", sort_order: 1 })
    .select()
    .single()

  const { data: nonCoffeeCat } = await db
    .from("categories")
    .insert({ store_id: store.id, name: "Non-Coffee", sort_order: 2 })
    .select()
    .single()

  const { data: snacksCat } = await db
    .from("categories")
    .insert({ store_id: store.id, name: "Snacks", sort_order: 3 })
    .select()
    .single()

  await db.from("discounts").insert([
    { store_id: store.id, name: "Senior/PWD 20%", type: "percentage", value: "20.00", is_active: true },
  ])

  const adminHash = await hash("brewhasadmin", 10)
  const cashierHash = await hash("brewhas2026", 10)

  await db.from("employees").insert([
    { store_id: store.id, name: "Admin", role: "admin", pin_hash: adminHash, is_active: true },
    { store_id: store.id, name: "Cashier", role: "cashier", pin_hash: cashierHash, is_active: true },
  ])

  await db.from("items").insert([
    { store_id: store.id, category_id: coffeeCat.id, name: "Americano", price: "85.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Cafe Latte", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Cappuccino", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Macchiato", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Dirty Matcha", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Spanish Latte", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: coffeeCat.id, name: "Cafe Mocha", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: signatureCat.id, name: "Velvet Elixir", price: "150.00", track_stock: false },
    { store_id: store.id, category_id: signatureCat.id, name: "Golden Eclipse", price: "150.00", track_stock: false },
    { store_id: store.id, category_id: signatureCat.id, name: "Amber Mystique", price: "150.00", track_stock: false },
    { store_id: store.id, category_id: nonCoffeeCat.id, name: "Matcha Latte", price: "100.00", track_stock: false },
    { store_id: store.id, category_id: nonCoffeeCat.id, name: "Fruit Soda", price: "80.00", track_stock: false },
    { store_id: store.id, category_id: nonCoffeeCat.id, name: "Tea", price: "75.00", track_stock: false },
    { store_id: store.id, category_id: snacksCat.id, name: "Grilled Sandwich", price: "100.00", track_stock: true, stock_qty: "30", min_stock: "5" },
    { store_id: store.id, category_id: snacksCat.id, name: "Cookies", price: "80.00", track_stock: true, stock_qty: "25", min_stock: "5" },
    { store_id: store.id, category_id: snacksCat.id, name: "Banana Loaf", price: "60.00", track_stock: true, stock_qty: "10", min_stock: "3" },
    // Ingredients (track_stock=true)
    { store_id: store.id, category_id: null, name: "Espresso Beans (per kg)", price: "0.00", cost: "800.00", track_stock: true, stock_qty: "5", min_stock: "1" },
    { store_id: store.id, category_id: null, name: "Fresh Milk (per liter)", price: "0.00", cost: "120.00", track_stock: true, stock_qty: "10", min_stock: "2" },
    { store_id: store.id, category_id: null, name: "Ube Syrup (per liter)", price: "0.00", cost: "350.00", track_stock: true, stock_qty: "2", min_stock: "0.5" },
    { store_id: store.id, category_id: null, name: "Chocolate Syrup (per liter)", price: "0.00", cost: "280.00", track_stock: true, stock_qty: "3", min_stock: "0.5" },
    { store_id: store.id, category_id: null, name: "Caramel Syrup (per liter)", price: "0.00", cost: "260.00", track_stock: true, stock_qty: "2", min_stock: "0.5" },
    { store_id: store.id, category_id: null, name: "Matcha Powder (per kg)", price: "0.00", cost: "900.00", track_stock: true, stock_qty: "1", min_stock: "0.2" },
    { store_id: store.id, category_id: null, name: "Condensed Milk (per liter)", price: "0.00", cost: "150.00", track_stock: true, stock_qty: "3", min_stock: "1" },
    { store_id: store.id, category_id: null, name: "Paper Cups 12oz (per pc)", price: "0.00", cost: "3.00", track_stock: true, stock_qty: "500", min_stock: "50" },
    { store_id: store.id, category_id: null, name: "Paper Cups 16oz (per pc)", price: "0.00", cost: "4.00", track_stock: true, stock_qty: "300", min_stock: "30" },
    { store_id: store.id, category_id: null, name: "Lids (per pc)", price: "0.00", cost: "2.00", track_stock: true, stock_qty: "800", min_stock: "100" },
    { store_id: store.id, category_id: null, name: "Cookie Dough (per pc)", price: "0.00", cost: "25.00", track_stock: true, stock_qty: "40", min_stock: "10" },
    { store_id: store.id, category_id: null, name: "Banana Loaf Mix (per pc)", price: "0.00", cost: "18.00", track_stock: true, stock_qty: "20", min_stock: "5" },
  ])

  console.log("Seed complete!")
  console.log("Admin: admin / brewhasadmin")
  console.log("Cashier: cashier / brewhas2026")
  process.exit(0)
}

seed().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
