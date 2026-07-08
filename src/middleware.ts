import { NextResponse, type NextRequest } from "next/server"

async function verifyJwt(token: string): Promise<Record<string, any> | null> {
  try {
    const secretStr = process.env.AUTH_SECRET
    if (!secretStr) return null

    const parts = token.split(".")
    if (parts.length !== 3) return null
    const [header, body, sig] = parts

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secretStr),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      Buffer.from(sig, "base64url"),
      encoder.encode(`${header}.${body}`)
    )

    if (!valid) return null
    return JSON.parse(Buffer.from(body, "base64url").toString())
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get("session")?.value

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.next()
  }

  const session = token ? await verifyJwt(token) : null

  if (!session) {
    if (pathname.startsWith("/pos") || pathname.startsWith("/dashboard") || pathname.startsWith("/backoffice")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  }

  if (session) {
    if (pathname.startsWith("/auth")) {
      const url = request.nextUrl.clone()
      url.pathname = "/pos"
      return NextResponse.redirect(url)
    }

    if (session.role === "cashier" && (pathname.startsWith("/dashboard") || pathname.startsWith("/backoffice"))) {
      const url = request.nextUrl.clone()
      url.pathname = "/pos"
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
}
