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
  const active = pathname === href || pathname.startsWith(href + "/")

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: active ? 500 : 400,
        color: active ? "var(--ink)" : "var(--ink-muted)",
        background: active ? "var(--bg-hover)" : "transparent",
        textDecoration: "none",
        transition: "background 120ms, color 120ms",
      }}
    >
      <span style={{ color: active ? "var(--cobalt-400)" : "var(--ink-dim)", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          fontSize: "11px",
          fontWeight: 500,
          padding: "1px 6px",
          borderRadius: "10px",
          background: "var(--cobalt-soft)",
          color: "var(--cobalt-400)",
        }}>
          {badge}
        </span>
      )}
    </Link>
  )
}
