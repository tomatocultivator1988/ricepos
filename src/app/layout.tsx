import type { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils/cn"
import "./globals.css"

import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

export const viewport: Viewport = {
  themeColor: "#4A235A",
}

export const metadata: Metadata = {
  title: "GroceryPOS",
  description: "Point of Sale for GroceryPOS",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground">
        {children}
        <Toaster closeButton position="top-right"
          toastOptions={{
            className: "!border !border-gold-500/30 !shadow-lg !shadow-gold-500/20 !text-brewhas-100",
            style: { background: "linear-gradient(135deg, #2a1b3d, #3d2260)", borderColor: "rgba(212, 175, 55, 0.3)" },
          }}
        />

      </body>
    </html>
  )
}
