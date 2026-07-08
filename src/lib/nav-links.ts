import {
  StoreIcon, LayoutDashboardIcon, TrendingUpIcon,
  BoxesIcon, UsersIcon, PackageIcon, UserRoundIcon, 
  ReceiptIcon, SettingsIcon, FileTextIcon, ClockIcon,
  TruckIcon, ClipboardListIcon
} from "lucide-react"

export interface NavLink {
  label: string
  href: string
  icon: typeof StoreIcon
  hideLabel?: boolean
}

export const adminNavLinks: NavLink[] = [
  { label: "POS", href: "/pos", icon: StoreIcon },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Reports", href: "/dashboard/reports", icon: FileTextIcon },
  { label: "Sales", href: "/dashboard/sales", icon: TrendingUpIcon },
  { label: "Audit", href: "/dashboard/audit", icon: FileTextIcon },
  { label: "Expenses", href: "/backoffice/expenses", icon: ReceiptIcon },
  { label: "Items", href: "/backoffice/items", icon: PackageIcon },

  { label: "Inventory", href: "/backoffice/inventory", icon: BoxesIcon },
  { label: "Purchase Orders", href: "/backoffice/purchase-orders", icon: ClipboardListIcon },
  { label: "Suppliers", href: "/backoffice/suppliers", icon: TruckIcon },
  { label: "Customers", href: "/backoffice/customers", icon: UserRoundIcon },
  { label: "Staff", href: "/dashboard/staff", icon: UsersIcon },
  { label: "Settings", href: "/backoffice/settings", icon: SettingsIcon, hideLabel: true },
]
