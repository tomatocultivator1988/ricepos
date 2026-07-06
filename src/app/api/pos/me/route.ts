import { NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"

export async function GET() {
  try {
    const session = await getSession()

    return NextResponse.json({
      employee: {
        id: session.employeeId,
        name: session.name,
        role: session.role,
      },
      storeId: session.storeId,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
