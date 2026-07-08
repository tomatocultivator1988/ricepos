import { createHmac } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

const SECRET = process.env.AUTH_SECRET
if (!SECRET) throw new Error("AUTH_SECRET environment variable is required")
const AUTH_SECRET: string = SECRET
export const SESSION_COOKIE_NAME = "session"

export interface SessionPayload {
  employeeId: string
  storeId: string
  name: string
  role: "admin" | "cashier"
}

export function signSession(payload: SessionPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest("base64url")
  return `${header}.${body}.${sig}`
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expected = createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest("base64url")
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(body, "base64url").toString())
  } catch {
    return null
  }
}

export async function getSession(): Promise<SessionPayload> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) throw new Error("Unauthorized")
  const session = verifySession(token)
  if (!session) throw new Error("Unauthorized")
  return session
}

export function setSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12,
  }
}

export function unauth(message = "Unauthorized") {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 })
}

export function forbid(message = "Forbidden") {
  return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 })
}

export function notfind(message = "Not found") {
  return NextResponse.json({ error: { code: "NOT_FOUND", message } }, { status: 404 })
}

export function validationErr(errors: Record<string, string[]>) {
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Validation failed", errors } }, { status: 400 })
}
