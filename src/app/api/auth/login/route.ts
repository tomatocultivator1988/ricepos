import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { compare } from "bcryptjs"
import { signSession, setSessionCookie } from "@/lib/auth/session"

const loginAttempts = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(key: string): boolean {
  const now = Date.now()

  // Periodic cleanup of expired entries every ~100 calls
  if (Math.random() < 0.01) {
    for (const [k, v] of loginAttempts) { if (now > v.resetAt) loginAttempts.delete(k) }
  }

  const entry = loginAttempts.get(key)
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + 60000 })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    if (!checkRateLimit(`${clientIp}:${username}`)) {
      return NextResponse.json({ error: "Too many attempts. Try again in 1 minute." }, { status: 429 })
    }

    const { data: allEmployees } = await db
      .from("employees")
      .select("id, name, role, pin_hash, store_id")
      .eq("name", username)
      .eq("is_active", true)

      for (const emp of allEmployees ?? []) {
      if (emp.pin_hash && await compare(password, emp.pin_hash)) {
        const session = {
          employeeId: emp.id,
          storeId: emp.store_id,
          name: emp.name,
          role: emp.role as "admin" | "cashier",
        }

        // Fire-and-forget time log (don't block login)
        db.from("time_logs").insert({
          employee_id: emp.id,
          login_at: new Date().toISOString(),
        }).then(() => {}, () => {})

        const token = signSession(session)
        const response = NextResponse.json(session)
        response.cookies.set(setSessionCookie(token))
        return response
      }
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
