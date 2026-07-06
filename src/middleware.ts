import { NextResponse, type NextRequest } from "next/server"

function parseJwt(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], "base64url").toString())
  } catch {
    return null
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const token = request.cookies.get("session")?.value
  const session = token ? parseJwt(token) : null

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
