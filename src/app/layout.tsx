import type { Metadata, Viewport } from "next"
import { Toaster } from "sonner"
import { cn } from "@/lib/utils/cn"
import "./globals.css"
import "./rices-bg.css"

import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" })

export const viewport: Viewport = {
  themeColor: "#059669",
}

export const metadata: Metadata = {
  title: "GroceryPOS / RicePOS",
  description: "Tablet POS for rice retail & grocery",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GroceryPOS" },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans antialiased", inter.variable)}>
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-screen text-foreground">
        <div className="rices-bg min-h-screen">
          {children}
        </div>
        <Toaster closeButton position="top-right"
          toastOptions={{
            className: "!border !border-amber-500/30 !shadow-lg !shadow-amber-500/20 !text-stone-100",
            style: { background: "linear-gradient(135deg, #3d2800, #5c3d02)", borderColor: "rgba(245, 158, 11, 0.3)" },
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        ` }} />
      </body>
    </html>
  )
}
