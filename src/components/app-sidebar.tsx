"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useRouter } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  ShoppingBagIcon,
  PackageIcon,
  FolderTreeIcon,
  PercentIcon,
  CalculatorIcon,
  BoxesIcon,
  UsersIcon,
  StoreIcon,
  LogOutIcon,
  TrendingUpIcon,
} from "lucide-react"
import { toast } from "sonner"

export function AppSidebar({ user, ...props }: { user?: { name: string; role: string } } & React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    toast.success("Signed out")
    router.push("/auth/login")
  }

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon className="size-4" /> },
    { title: "Sales", url: "/dashboard/sales", icon: <TrendingUpIcon className="size-4" /> },
    {
      title: "Catalog",
      url: "/backoffice/items",
      icon: <ShoppingBagIcon className="size-4" />,
      items: [
        { title: "Items", url: "/backoffice/items" },
        { title: "Categories", url: "/backoffice/categories" },
        { title: "Discounts", url: "/backoffice/discounts" },
        { title: "Tax Rates", url: "/backoffice/tax-rates" },
      ],
    },
    { title: "Inventory", url: "/backoffice/inventory", icon: <BoxesIcon className="size-4" /> },
    { title: "Employees", url: "/backoffice/employees", icon: <UsersIcon className="size-4" /> },
  ]

  const mainItems = navItems.map(item => ({
    ...item,
    isActive: item.url ? pathname.startsWith(item.url) : item.items?.some((sub: any) => pathname.startsWith(sub.url)),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2.5 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold overflow-hidden">
            <img src="/new logo.png" alt="RicePOS" className="h-full w-full object-contain p-0.5" />
          </div>
          <span className="text-sm font-bold text-white group-data-[collapsible=icon]:hidden">RicePOS</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <NavMain items={mainItems} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-stone-300">{user.role === "admin" ? "Administrator" : "Cashier"}</p>
            </div>
          </div>
        )}
        <SidebarMenuButton onClick={handleLogout} className="text-stone-300 hover:text-red-600">
          <LogOutIcon className="size-4" />
          <span>Sign Out</span>
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
