import {
  StoreIcon, LayoutDashboardIcon, TrendingUpIcon,
  BoxesIcon, UsersIcon, PackageIcon, UserRoundIcon, 
  ReceiptIcon, SettingsIcon, FileTextIcon
} from "lucide-react"

export interface NavLink {
  label: string
  href: string
  icon: typeof StoreIcon
}

export const adminNavLinks: NavLink[] = [
  { label: "POS", href: "/pos", icon: StoreIcon },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
  { label: "Reports", href: "/dashboard/reports", icon: FileTextIcon },
  { label: "Items", href: "/backoffice/items", icon: PackageIcon },
  { label: "Inventory", href: "/backoffice/inventory", icon: BoxesIcon },
  { label: "Customers", href: "/backoffice/customers", icon: UserRoundIcon },
  { label: "Expenses", href: "/backoffice/expenses", icon: ReceiptIcon },
  { label: "Employees", href: "/backoffice/employees", icon: UsersIcon },
  { label: "Settings", href: "/backoffice/settings", icon: SettingsIcon },
]
