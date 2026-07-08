import { NextResponse } from "next/server"
import { setSessionCookie } from "@/lib/auth/session"

export async function POST() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    ...setSessionCookie(""),
    maxAge: 0,
  })
  return response
}
