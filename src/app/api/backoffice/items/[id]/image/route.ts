import { NextRequest, NextResponse } from "next/server"
import { getSession, unauth, forbid } from "@/lib/auth/session"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (session.role !== "admin") return forbid("Admin required")
    const { id } = await params

    const body = await request.json()
    const { image } = body

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "Image data required" }, { status: 400 })
    }

    // Decode base64: "data:image/png;base64,iVBOR..." -> extract content type + raw
    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) return NextResponse.json({ error: "Invalid image format" }, { status: 400 })

    const contentType = matches[1]
    const base64Data = matches[2]
    const buffer = Buffer.from(base64Data, "base64")
    const ext = contentType.split("/")[1] // png, jpeg, etc.
    const fileName = `${id}/${Date.now()}.${ext}`

    // Upload to Supabase Storage
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/item-images/${fileName}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": contentType,
        },
        body: buffer,
      }
    )

    if (!uploadRes.ok) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 })
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/item-images/${fileName}`

    // Update item with image URL
    const { db } = await import("@/lib/db/client")
    await db.from("items")
      .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", id)

    return NextResponse.json({ imageUrl: publicUrl })
  } catch (error: any) {
    if (error.message === "Unauthorized") return unauth()
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
