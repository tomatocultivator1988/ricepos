import { NextResponse } from "next/server"
import { db } from "@/lib/db/client"
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session"

export async function POST() {
  try {
    const session = await getSession()

    const { data: latestLog } = await db
      .from("time_logs")
      .select("id, login_at")
      .eq("employee_id", session.employeeId)
      .is("logout_at", null)
      .order("login_at", { ascending: false })
      .limit(1)
      .single()

    if (latestLog) {
      const now = new Date()
      const loginAt = new Date(latestLog.login_at)
      const durationMin = Math.round((now.getTime() - loginAt.getTime()) / 60000)
      await db.from("time_logs")
        .update({ logout_at: now.toISOString(), duration_minutes: durationMin })
        .eq("id", latestLog.id)
    }
  } catch { }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE_NAME, "", { maxAge: 0, path: "/" })
  return response
}
