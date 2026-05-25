"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: string | number
}

export function NavItem({ href, label, icon, badge }: NavItemProps) {
  const pathname = usePathname()
  const active =
    href === "/dashboard"
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "cr-nav-item is-active" : "cr-nav-item"}
    >
      <span className="cr-nav-item__icon">{icon}</span>
      <span className="cr-nav-item__label">{label}</span>
      {badge != null && (
        <span className={typeof badge === "number" ? "cr-nav-count cr-nav-count--critical" : "cr-nav-count"}>
          {badge}
        </span>
      )}
    </Link>
  )
}
