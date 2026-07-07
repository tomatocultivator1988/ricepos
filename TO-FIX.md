# RicePOS — Issues to Fix

*Audited: July 8, 2026 | 50+ files | 3 exploration passes*

---

## CRITICAL (5 issues)

### C1. Sale transaction not atomic — stock can go negative
**File:** `src\app\api\sales\route.ts:62-209`
**Problem:** 8 sequential non-atomic steps between stock verification and deduction. Two concurrent sales both pass verification, both deduct → stock negative.
**Fix:** Port to PostgreSQL RPC function with `FOR UPDATE` row locking (like `receive_purchase_order` RPC).

### C2. Logout functionally broken
**Files:** `src\app\pos\page.tsx:357-359`, `src\components\admin-shell.tsx:16-19`
**Problem:** `document.cookie` cannot delete httpOnly session cookie. `/api/auth/logout` route does not exist. User stays authenticated after logout.
**Fix:** Create `src\app\api\auth\logout\route.ts` that sets a cleared httpOnly cookie. Remove client-side `document.cookie` line.

### C3. Split payment: GCash silently dropped when Cash >= Total
**File:** `src\app\pos\page.tsx:253-255`
**Problem:** `gcashPayment = Math.min(gcash, remaining)` — when cash already covers total, remaining=0, gcashPayment=0 regardless of user input. Receipt shows both tendered but only cash recorded.
**Fix:** Restructure payment allocation to capture all tendered amounts separately. Track change per tender method.

### C4. Collection payment — double-allocation race condition
**File:** `src\app\api\collections\route.ts:20-95`
**Problem:** FIFO allocation reads open sales, loops allocating, updates one-at-a-time. Two concurrent calls can both allocate the same funds. Sequence counter `colNum` computed but never persisted.
**Fix:** Port to PostgreSQL RPC with `FOR UPDATE` locking. Persist sequence counter.

### C5. Void/Refund is a stub — users see success but nothing happens
**Files:** `src\app\api\sales\[id]\route.ts:1-9`, `src\app\dashboard\sales\page.tsx:163`
**Problem:** PUT returns `"Sale API — coming soon"`. Frontend shows success toast regardless of failure. Restock, payment reversal, status update — none executed.
**Fix:** Implement full void/refund: restock items, reverse payment records, update sale status, log to audit and journal.

---

## HIGH (5 issues)

### H1. Tax discount allocation wrong with non-eligible items
**File:** `src\hooks\use-cart.ts:140-147`
**Problem:** `discountShare = discountAmount * (lineTotal / subtotal)` — denominator `subtotal` includes non-eligible items. Inflates denominator, reduces discount share on eligible items.
**Fix:** Use `eligibleTotal` as denominator instead of `subtotal`.

### H2. No rate limiting on login — 4-digit PIN brute-force
**File:** `src\app\api\auth\login\route.ts:6-45`
**Problem:** Only 10,000 possible PINs. No rate limit, no lockout, no attempt tracking. Entire PIN space exhaustible in minutes with parallelization.
**Fix:** Add rate limiting (5 attempts/minute/IP). Consider account lockout or stronger authentication.

### H3. Middleware does NOT verify JWT signature for page access
**File:** `src\middleware.ts:26-38`
**Problem:** `parseJwt()` decodes payload without HMAC verification. Cashier can forge admin-role cookie and access admin pages. Sensitive UI exposed.
**Fix:** Verify JWT signature in middleware using `AUTH_SECRET`.

### H4. Auth secret has hardcoded fallback — JWT forgeable
**File:** `src\lib\auth\session.ts:5`
**Problem:** `const SECRET = process.env.AUTH_SECRET || "ricepos-dev-secret-replace-in-production"`. If env var missing in production, attacker can forge any JWT with a known key committed to public source.
**Fix:** Crash on startup if `AUTH_SECRET` unset. Remove fallback.

### H5. Backup restore wipes data with no safeguards
**File:** `src\app\api\backup\route.ts:44-73`
**Problem:** `DELETE` then `INSERT` with no validation, no pre-restore backup, no transaction. Half-failure = half-deleted data. Backup JSON includes `employees.pin_hash` (credential leak).
**Fix:** Validate backup data before deletion. Wrap in transaction. Back up current data first. Strip `pin_hash` from export.

---

## MEDIUM (9 issues)

### M1. Column name mismatch — `is_active` does not exist on items table
**File:** `src\app\api\backoffice\items\[id]\route.ts:68,102`
**Problem:** Uses `is_active` but schema has `status item_status`. Item deactivation silently fails.
**Fix:** Change `is_active` → `status`.

### M2. Column name mismatch — `discount_amt` vs `discount_amount`
**File:** `src\app\api\dashboard\reports\route.ts:14`
**Problem:** Query selects `discount_amt` but column is `discount_amount`. All discount data returns null in reports.
**Fix:** Change `discount_amt` → `discount_amount`.

### M3. Dashboard cash KPIs include refunded/voided sale payments
**File:** `src\app\api\dashboard\reports\route.ts`
**Problem:** Cash/GCash KPIs sum all payments without excluding those tied to voided/refunded sales. Amounts inflated.
**Fix:** Join with `sales` table, exclude voided/refunded statuses.

### M4. `-transtone-y-1/2` CSS typo in 8+ files
**Files:** `audit/page.tsx`, `journal/page.tsx`, `categories/page.tsx`, `discounts/page.tsx`, `employees/page.tsx`, `tax-rates/page.tsx`, `inventory/page.tsx`
**Problem:** Search icon positioning broken. Should be `-translate-y-1/2`.
**Fix:** Global find-replace `-transtone-y-1/2` → `-translate-y-1/2`.

### M5. No suppliers seeded — PO page unusable until manual creation
**File:** `src\lib\db\seed.ts`
**Problem:** Zero suppliers in seed data. PO requires at least one. User must find and use suppliers CRUD page first.
**Fix:** Seed 1-2 suppliers.

### M6. Delivery receiving does not write to `audit_log`
**File:** `src\app\api\backoffice\deliveries\route.ts:34-40`
**Problem:** Inventory adjustments log to both `inventory_log` AND `audit_log`. Deliveries only log to `inventory_log`. Audit gap.
**Fix:** Add `audit_log` insert to deliveries route.

### M7. Stored XSS risk in SOA HTML generation
**File:** `src\app\api\customers\[id]\soa\route.ts:85-132`
**Problem:** Customer name, store name, address interpolated directly into HTML without escaping. Script injection possible via customer name field.
**Fix:** HTML-escape all interpolated values or use a template with auto-escaping.

### M8. Desktop sales table `colSpan` wrong
**File:** `src\app\dashboard\sales\page.tsx:402,407`
**Problem:** Loading/empty states use `colSpan={6}` but table has 7 columns (including Actions). Layout misaligned.
**Fix:** Change to `colSpan={7}`.

### M9. Voids report filters by sale `created_at` not void date
**File:** Reports route
**Problem:** A sale created Monday and voided Friday appears under Monday's voids. Should be under Friday's.
**Fix:** Filter by a `voided_at` or `updated_at` field for void-type reports.

---

## LOW (6 issues)

### L1. Dead import: `calcDenomTotal` in POS
**File:** `src\app\pos\page.tsx:13`
**Fix:** Remove unused import.

### L2. Dead state: `user.employeeId` in POS
**File:** `src\app\pos\page.tsx:27`
**Fix:** Remove from interface.

### L3. Dead discount types: `custom_pct` / `custom_fixed`
**File:** `src\hooks\use-cart.ts:21`
**Problem:** Defined in interface but never offered in POS UI dropdown.
**Fix:** Either add to UI or remove from type.

### L4. Dead code: `navLinks`/`handleLogout` in CRUD pages
**Files:** `categories/page.tsx`, `discounts/page.tsx`, `employees/page.tsx`, `tax-rates/page.tsx`
**Problem:** `navLinks` array declared, `handleLogout` function defined, never used in JSX.
**Fix:** Remove dead code.

### L5. Missing index on `payments.created_at`
**File:** `supabase\migrations\0000_initial_schema.sql`
**Problem:** Queries filtering by `created_at` (shift cash computation, reports) do full table scans.
**Fix:** Add `CREATE INDEX idx_payments_created_at ON payments(created_at)`.

### L6. Misnamed column: `pos_carts.shift_id` stores `storeId`
**File:** `src\app\api\pos\cart\route.ts:8,28`
**Problem:** Column named `shift_id` but stores the store_id (no shift system active for carts). Misleading.
**Fix:** Rename column to `store_id` in migration, or add comment explaining.

---

## Summary

| Severity | Count |
|---|---|
| Critical | 5 |
| High | 5 |
| Medium | 9 |
| Low | 6 |
| **Total** | **25** |

Priority order for fixing: C1 → C2 → C5 → C3 → C4 (critical), then H3 → H4 → H1 → H2 → H5 (high), then medium/low.
