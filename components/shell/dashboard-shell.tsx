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
  const modeLabel =
    workspaceMode === "cabinet"
      ? "Cabinet"
      : workspaceMode === "ai-builder"
        ? "AI Builder"
        : "IMM"

  return (
    <div className="cr-app-shell">
      {/* Sidebar */}
      <aside className="cr-app-sidebar">
        {/* Logo */}
        <div className="cr-app-brandbar">
          <div aria-hidden="true" className="cr-app-logo">
            C
          </div>
          <div className="cr-app-brand">
            <div className="cr-app-brand__name">
              CompliRoAI
            </div>
            <div className="cr-app-brand__sub">
              {workspaceMode === "cabinet"
                ? "Cabinet · AI Act + GDPR"
                : workspaceMode === "ai-builder"
                  ? "AI Builder · Annex IV + FRIA"
                  : "IMM · AI Act readiness"}
            </div>
          </div>
          <div
            aria-label="3 notificări"
            title="3 notificări"
            className="cr-app-bell"
          >
            <Bell size={15} />
            <span className="cr-app-bell__count">
              3
            </span>
          </div>
        </div>

        {/* Workspace switcher — only renders when there's >1 workspace. */}
        <div className="cr-app-switcher-slot">
          <WorkspaceSwitcher />
        </div>

        {/* Nav — grouped by section */}
        <nav className="cr-nav">
          {navGroups.map((group) => (
            <div key={group.section} className="cr-nav-section">
              {group.label && (
                <div className="cr-nav-label">
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
        <div className="cr-sidebar-footer">
          {orgName && (
            <div className="cr-sidebar-footer__org">
              {orgName}
            </div>
          )}
          {userEmail && (
            <div className="cr-sidebar-footer__email">
              {userEmail}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="cr-sidebar-logout"
          >
            <LogOut size={14} />
            Ieși din cont
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="cr-app-main cr-shell-surface">
        {orgName ? (
          <div className="cr-work-context">
            <div className="cr-work-context__copy">
              <span aria-hidden="true" className="cr-work-context__dot" />
              <span className="cr-no-wrap">Lucrezi pentru</span>
              <strong
                className="cr-work-context__strong"
              >
                {orgName}
              </strong>
              <span className="cr-work-context__sep">·</span>
              <span>mod {modeLabel}</span>
            </div>
            {workspaceMode === "cabinet" ? (
              <a
                href="/dashboard/portofoliu"
                className="cr-btn cr-btn--sm"
              >
                ← Ieși din execuție
              </a>
            ) : null}
          </div>
        ) : null}
        {showTrialBanner && (
          <div
            role="status"
            className={isUrgent ? "cr-trial-banner cr-trial-banner--urgent" : "cr-trial-banner"}
          >
            <Sparkles size={15} />
            <div className="cr-trial-banner__copy">
              <strong>Trial CompliRoAI:</strong>{" "}
              {trialDaysLeft === 0
                ? "trial-ul expiră astăzi"
                : trialDaysLeft === 1
                  ? "o zi rămasă"
                  : `${trialDaysLeft} zile rămase`}
              .{" "}
              <a
                href="/dashboard/setari/billing/checkout"
                className="cr-trial-banner__link"
              >
                Activează abonament
              </a>
            </div>
            <button
              type="button"
              onClick={dismissBanner}
              aria-label="Închide banner trial"
              className="cr-trial-banner__close"
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
