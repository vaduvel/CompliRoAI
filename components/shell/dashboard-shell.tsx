"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Code,
  Cog,
  Compass,
  Cpu,
  Database,
  Eye,
  FileBadge,
  FileBarChart,
  FileCheck,
  FileSearch,
  FileText,
  History,
  Home,
  Link2,
  LogOut,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Palette,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react"
import { NavItem } from "./nav-item"
import { WorkspaceSwitcher } from "./workspace-switcher"
import {
  getNavForRole,
  type NavBadge,
  type NavItemConfig,
} from "./nav-config"
import type { BillingTier } from "@/lib/compliance/types"
import type { WorkspaceMode } from "@/lib/server/auth"

// Lucide icon registry — mapped by string name so nav-config can stay framework-free.
const ICON_REGISTRY: Record<string, React.ComponentType<{ size?: number }>> = {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardCheck,
  Code,
  Cog,
  Compass,
  Cpu,
  Database,
  Eye,
  FileBadge,
  FileBarChart,
  FileCheck,
  FileSearch,
  FileText,
  History,
  Home,
  Link2,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Palette,
  Radar,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
}

interface Props {
  children: React.ReactNode
  userEmail?: string
  orgName?: string
  workspaceMode?: WorkspaceMode
  /** Active billing tier — null when no subscription yet. Defaults to "free_trial". */
  tier?: BillingTier
  /** ISO string when trial ends — used to compute days remaining. */
  trialEndsAtISO?: string
}

const BANNER_DISMISS_KEY = "compliroai_trial_banner_dismissed"

function badgeStyleFor(badge: NavBadge | undefined) {
  if (!badge) return undefined
  if (badge === "coming-soon") return "Curând"
  if (badge === "new") return "Nou"
  if (badge === "trial") return "Trial"
  return undefined
}

function renderIcon(iconName: string): React.ReactNode {
  const Component = ICON_REGISTRY[iconName]
  if (!Component) return <Cpu size={15} />
  return <Component size={15} />
}

function computeTrialDaysLeft(trialEndsAtISO?: string): number | null {
  if (!trialEndsAtISO) return null
  const end = new Date(trialEndsAtISO).getTime()
  if (Number.isNaN(end)) return null
  const diffMs = end - Date.now()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

export function DashboardShell({
  children,
  userEmail,
  orgName,
  workspaceMode = "imm-classic",
  tier = "free_trial",
  trialEndsAtISO,
}: Props) {
  const router = useRouter()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(BANNER_DISMISS_KEY) === "1") setBannerDismissed(true)
  }, [])

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
  }

  function dismissBanner() {
    setBannerDismissed(true)
    try {
      sessionStorage.setItem(BANNER_DISMISS_KEY, "1")
    } catch {
      // Ignore — sessionStorage may be unavailable in private mode.
    }
  }

  const navGroups = getNavForRole(workspaceMode, tier)
  const trialDaysLeft = tier === "free_trial" ? computeTrialDaysLeft(trialEndsAtISO) : null
  const showTrialBanner =
    tier === "free_trial" && !bannerDismissed && trialDaysLeft !== null
  const isUrgent = trialDaysLeft !== null && trialDaysLeft <= 3

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
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
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "8px 12px 14px",
            borderBottom: "1px solid var(--border-soft)",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            CompliRoAI
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
            {workspaceMode === "cabinet"
              ? "Mod cabinet · AI Act + GDPR"
              : workspaceMode === "ai-builder"
                ? "Mod AI Builder · Annex IV + FRIA"
                : "AI Act · România"}
          </div>
        </div>

        {/* Workspace switcher — only renders when there's >1 workspace. */}
        <div style={{ padding: "0 4px 8px" }}>
          <WorkspaceSwitcher />
        </div>

        {/* Nav — grouped by section */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {navGroups.map((group) => (
            <div key={group.section} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {group.label && (
                <div
                  style={{
                    padding: "10px 12px 4px",
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--ink-subtle)",
                  }}
                >
                  {group.label}
                </div>
              )}
              {group.items.map((item: NavItemConfig) => (
                <NavItem
                  key={`${item.section}-${item.href}-${item.label}`}
                  href={item.href}
                  label={item.label}
                  icon={renderIcon(item.iconName)}
                  badge={badgeStyleFor(item.badge)}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: "1px solid var(--border-soft)",
            paddingTop: "12px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {orgName && (
            <div
              style={{
                fontSize: "12px",
                color: "var(--ink-muted)",
                padding: "4px 12px",
                fontWeight: 500,
              }}
            >
              {orgName}
            </div>
          )}
          {userEmail && (
            <div style={{ fontSize: "11px", color: "var(--ink-dim)", padding: "0 12px 6px" }}>
              {userEmail}
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "13px",
              color: "var(--ink-dim)",
              width: "100%",
              textAlign: "left",
            }}
          >
            <LogOut size={14} />
            Ieși din cont
          </button>
        </div>
      </aside>

      {/* Main */}
      <main
        style={{
          background: "var(--bg)",
          overflowY: "auto",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {showTrialBanner && (
          <div
            role="status"
            style={{
              background: isUrgent
                ? "var(--red-soft)"
                : "var(--cobalt-soft)",
              borderBottom: `1px solid ${isUrgent ? "var(--red-500)" : "var(--cobalt-soft-strong)"}`,
              color: "var(--ink)",
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "13px",
            }}
          >
            <Sparkles size={15} color={isUrgent ? "var(--red-400)" : "var(--cobalt-400)"} />
            <div style={{ flex: 1 }}>
              <strong>Trial CompliRoAI:</strong>{" "}
              {trialDaysLeft === 0
                ? "trial-ul expiră astăzi"
                : trialDaysLeft === 1
                  ? "o zi rămasă"
                  : `${trialDaysLeft} zile rămase`}
              .{" "}
              <a
                href="/dashboard/setari/billing/checkout"
                style={{
                  color: isUrgent ? "var(--red-400)" : "var(--cobalt-400)",
                  textDecoration: "underline",
                  fontWeight: 500,
                }}
              >
                Activează abonament
              </a>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Închide banner trial"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ink-dim)",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                padding: "0 4px",
              }}
            >
              ×
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
