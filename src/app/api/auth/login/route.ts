import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { compare } from "bcryptjs"
import { signSession, setSessionCookie } from "@/lib/auth/session"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
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

        await db.from("time_logs").insert({
          employee_id: emp.id,
          login_at: new Date().toISOString(),
        })

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
