"use client"
import { useRouter } from "next/navigation"
import { Cpu, FileCheck, BookOpen, LogOut } from "lucide-react"
import { NavItem } from "./nav-item"

interface Props {
  children: React.ReactNode
  userEmail?: string
  orgName?: string
}

export function DashboardShell({ children, userEmail, orgName }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "232px 1fr", minHeight: "100vh", background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside style={{
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        padding: "16px 12px",
        gap: "4px",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "8px 12px 20px", borderBottom: "1px solid var(--border-soft)", marginBottom: "8px" }}>
          <div style={{ fontFamily: "var(--font-display-v3)", fontSize: "15px", fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.02em" }}>
            AI Act
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>Conformitate EU · România</div>
        </div>

        {/* Nav */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          <NavItem href="/dashboard/sisteme" label="Sisteme AI" icon={<Cpu size={15} />} />
          <NavItem href="/dashboard/conformitate" label="Conformitate" icon={<FileCheck size={15} />} />
          <NavItem href="/dashboard/literacy" label="AI Literacy" icon={<BookOpen size={15} />} />
        </nav>

        {/* User footer */}
        <div style={{ borderTop: "1px solid var(--border-soft)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {orgName && (
            <div style={{ fontSize: "12px", color: "var(--ink-muted)", padding: "4px 12px", fontWeight: 500 }}>{orgName}</div>
          )}
          {userEmail && (
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", padding: "0 12px 6px" }}>{userEmail}</div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 12px", borderRadius: "6px", border: "none",
              background: "transparent", cursor: "pointer",
              fontSize: "13px", color: "var(--ink-dim)", width: "100%", textAlign: "left",
            }}
          >
            <LogOut size={14} />
            Ieși din cont
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ background: "var(--bg)", overflowY: "auto", minHeight: "100vh" }}>
        {children}
      </main>
    </div>
  )
}
