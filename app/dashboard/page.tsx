import Link from "next/link"
import {
  Bell,
  Building2,
  CheckSquare,
  ClipboardCheck,
  Cpu,
  Database,
  FileCheck,
  Mail,
  Package,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"

import { GuidancePlanPanel } from "@/components/ai-guidance/guidance-plan-panel"
import { buildGuidancePlan, type GuidancePlan } from "@/lib/compliance/guidance-orchestrator"
import type { AIGuidancePlanRecord } from "@/lib/compliance/types"
import type { ComplianceState } from "@/lib/compliance/types"
import { initialComplianceState } from "@/lib/compliance/engine"
import { buildGuidancePlanFromOrchestrator } from "@/lib/server/ai-orchestrator/to-guidance-plan"
import { type WorkspaceMode } from "@/lib/server/auth"
import { getOrgContext } from "@/lib/server/org-context"
import { readFreshStateForOrg } from "@/lib/server/store"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

type ActionCard = {
  href: string
  iconName: keyof typeof CARD_ICONS
  title: string
  subtitle: string
}

type CounterItem = {
  label: string
  count: number
  href: string
  accent: "amber" | "cobalt" | "red"
}

const CARD_ICONS = {
  Cpu,
  FileCheck,
  Package,
  Database,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Mail,
  CheckSquare,
  Bell,
  UserPlus,
  Users,
  Building2,
}

function nextActionsFor(mode: WorkspaceMode): ActionCard[] {
  if (mode === "ai-builder") {
    return [
      {
        href: "/dashboard/sisteme",
        iconName: "Cpu",
        title: "Adaugă primul sistem AI",
        subtitle: "Înregistrează modelul/serviciul construit pentru clasificare automată.",
      },
      {
        href: "/dashboard/sisteme/eu-db-wizard",
        iconName: "Database",
        title: "Înregistrare EU Database",
        subtitle: "Pregătește dosarul Annex IV pentru sistemele high-risk.",
      },
      {
        href: "/dashboard/logging-evidence",
        iconName: "ClipboardCheck",
        title: "Configurează jurnalizarea (Art. 12)",
        subtitle: "Declară logging-ul + retenția pentru sistemele tale.",
      },
    ]
  }
  if (mode === "cabinet") {
    return [
      {
        href: "/dashboard/portofoliu",
        iconName: "Users",
        title: "Adaugă primul client",
        subtitle: "Creează un workspace izolat pentru clientul tău.",
      },
      {
        href: "/dashboard/client-intake",
        iconName: "UserPlus",
        title: "Trimite Magic Link Intake",
        subtitle: "Cere clientului datele AI + GDPR fără parolă.",
      },
      {
        href: "/dashboard/rapoarte",
        iconName: "Sparkles",
        title: "Generează primul Audit Pack",
        subtitle: "Compilează evidența compliance într-un dosar semnat.",
      },
    ]
  }
  // imm-classic
  return [
    {
      href: "/dashboard/sisteme",
      iconName: "Cpu",
      title: "Adaugă primul sistem AI",
      subtitle: "Tot ce folosești cu AI (ChatGPT, Copilot, vendor SaaS) merge în inventar.",
    },
    {
      href: "/dashboard/role-assessment",
      iconName: "FileCheck",
      title: "Rulează evaluarea de rol",
      subtitle: "Determină rolul firmei tale conform Art. 3 (deployer, provider, etc).",
    },
    {
      href: "/dashboard/vendor-review",
      iconName: "Package",
      title: "Verifică furnizorii AI",
      subtitle: "Evaluează DPA + risc pentru fiecare furnizor AI folosit.",
    },
  ]
}

const ROLE_GREETING: Record<WorkspaceMode, { title: string; subtitle: string }> = {
  "imm-classic": {
    title: "Bun venit înapoi",
    subtitle: "Continuă inventarierea AI și completează obligațiile EU AI Act + GDPR.",
  },
  "ai-builder": {
    title: "Workspace AI Builder",
    subtitle: "Annex IV, EU Database, FRIA, API/SDK — toate aliniate la rolul de provider.",
  },
  cabinet: {
    title: "Cabinet compliance",
    subtitle: "Gestionează portofoliul de clienți, audit pack-uri și aprobări într-un singur loc.",
  },
}

async function buildDashboardGuidancePlan(input: {
  orgId: string
  orgName: string
  workspaceMode: WorkspaceMode
  userId: string
  state: ComplianceState
}): Promise<GuidancePlan> {
  try {
    return await buildGuidancePlanFromOrchestrator({
      orgId: input.orgId,
      orgName: input.orgName,
      workspaceMode: input.workspaceMode,
      state: input.state,
      user: { id: input.userId },
      preferMistral: false,
    })
  } catch (error) {
    console.error("Dashboard guidance fallback failed over to deterministic plan", error)
    return buildGuidancePlan({
      state: input.state,
      workspaceMode: input.workspaceMode,
      orgName: input.orgName,
    })
  }
}

export default async function DashboardHomePage() {
  try {
    const ctx = await getOrgContext()
    const workspaceMode = ctx.workspaceMode
    const orgName = ctx.orgName ?? ""

    // Best-effort state read for counters + recent events.
    let pending = { findings: 0, dsar: 0, breach: 0, approvals: 0 }
    let snapshot = {
      aiSystems: 0,
      literacyRecords: 0,
      loggingConfigs: 0,
      pmmPlans: 0,
      aiIncidentsOpen: 0,
    }
    let recent: Array<{ id: string; createdAtISO: string; message: string; type: string }> = []
    let guidanceRecord: AIGuidancePlanRecord | null = null
    let guidancePlan: GuidancePlan | null = null
    let dashboardState: ComplianceState = structuredClone(initialComplianceState)
    try {
      const state = await readFreshStateForOrg(ctx.orgId, ctx.orgName)
      dashboardState = state
      pending = {
        findings:
          state.findings?.filter(
            (f) => f.findingStatus === "open" || f.findingStatus === "confirmed"
          ).length ?? 0,
        dsar:
          state.dsarRequests?.filter(
            (r) =>
              r.status === "received" ||
              r.status === "in_progress" ||
              r.status === "awaiting_verification"
          ).length ?? 0,
        breach:
          state.breachRecords?.filter(
            (b) => b.status !== "closed" && b.status !== "no_notification_required"
          ).length ?? 0,
        approvals:
          state.approvalRequests?.filter((a) => a.status === "pending").length ?? 0,
      }
      snapshot = {
        aiSystems: state.aiSystems?.length ?? 0,
        literacyRecords: state.literacyRecords?.length ?? 0,
        loggingConfigs: state.loggingEvidence?.length ?? 0,
        pmmPlans: state.pmmPlans?.length ?? 0,
        aiIncidentsOpen:
          state.aiIncidents?.filter(
            (incident) => incident.status !== "closed" && incident.status !== "not_reportable"
          ).length ?? 0,
      }
      recent = (state.events ?? [])
        .slice(-5)
        .reverse()
        .map((e) => ({ id: e.id, createdAtISO: e.createdAtISO, message: e.message, type: e.type }))
      guidanceRecord = state.aiGuidancePlans?.[0] ?? null
      guidancePlan =
        guidanceRecord?.plan ??
        await buildDashboardGuidancePlan({
          orgId: ctx.orgId,
          orgName: orgName || "Organizația curentă",
          workspaceMode,
          state,
          userId: ctx.userId,
        })
    } catch {
      // swallow — empty defaults are safe
    }

    if (!guidancePlan) {
      try {
        const state = await readFreshStateForOrg(ctx.orgId, ctx.orgName)
        dashboardState = state
        guidancePlan = await buildDashboardGuidancePlan({
          orgId: ctx.orgId,
          orgName: orgName || "Organizația curentă",
          workspaceMode,
          state,
          userId: ctx.userId,
        })
      } catch (error) {
        console.error("Dashboard state fallback failed; using empty deterministic guidance", error)
        guidancePlan = buildGuidancePlan({
          state: dashboardState,
          workspaceMode,
          orgName: orgName || "Organizația curentă",
        })
      }
    }

    const actions = nextActionsFor(workspaceMode)
    const greeting = ROLE_GREETING[workspaceMode]
    const counters = dashboardCountersFor(workspaceMode, pending, snapshot)

    return (
      <div className="cr-page cr-page--full cr-stack">
        <header className="cr-hero">
          <div className="cr-hero__copy">
            <span className="cr-eyebrow">Acasă</span>
            <h1 className="cr-title">
              {greeting.title}
              {orgName ? <span className="cr-title__muted">, {orgName}</span> : null}
            </h1>
            <div className="cr-subtitle">
              {greeting.subtitle}
            </div>
          </div>
        </header>

        <GuidancePlanPanel initialRecord={guidanceRecord} initialPlan={guidancePlan} />

        <div className="cr-stat-strip cr-stat-strip--auto">
          {counters.map((counter) => (
            <CounterCard
              key={`${counter.label}-${counter.href}`}
              {...counter}
            />
          ))}
        </div>

        <section className="cr-stack">
          <h2 className="cr-eyebrow">
            Următorii 3 pași
          </h2>
          <div className="cr-grid cr-grid--cards">
            {actions.map((a) => {
              const Icon = CARD_ICONS[a.iconName]
              return (
                <Link
                  key={a.href + a.title}
                  href={a.href}
                  className="cr-card cr-action-card"
                >
                  <div className="cr-action-card__icon">
                    <Icon size={16} />
                  </div>
                  <div className="cr-action-card__title">{a.title}</div>
                  <div className="cr-action-card__body">
                    {a.subtitle}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="cr-stack">
          <h2 className="cr-eyebrow">
            Activitate recentă
          </h2>
          {recent.length === 0 ? (
            <div className="cr-empty">
              Niciun eveniment înregistrat încă. Pe măsură ce adaugi sisteme, training-uri și
              rapoarte, ele apar aici.
            </div>
          ) : (
            <div className="cr-feed">
              {recent.map((e) => (
                <div
                  key={e.id}
                  className="cr-feed-row"
                >
                  <span className="cr-feed-time">
                    {new Date(e.createdAtISO).toLocaleString("ro-RO", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="cr-feed-message">{e.message}</span>
                  <span className="cr-badge cr-badge--info">
                    {e.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  } catch (error) {
    console.error("DashboardHomePage fatal fallback", error)
    const guidancePlan = buildGuidancePlan({
      state: structuredClone(initialComplianceState),
      workspaceMode: "imm-classic",
      orgName: "Organizația curentă",
    })

    return (
      <div className="cr-page cr-page--full cr-stack">
        <header className="cr-hero">
          <div className="cr-hero__copy">
            <span className="cr-eyebrow">Acasă</span>
            <h1 className="cr-title">
              Workspace CompliRoAI
            </h1>
            <div className="cr-subtitle">
              Dashboard-ul a intrat în fallback local. Poți continua în modulele de lucru.
            </div>
          </div>
        </header>

        <GuidancePlanPanel initialRecord={null} initialPlan={guidancePlan} />

        <div className="cr-empty">
          Datele de overview se recalculează. Deschide `De rezolvat`, `Inventar AI` sau `Portofoliu`
          ca să continui execuția fără să pierzi sesiunea curentă.
        </div>
      </div>
    )
  }
}

function dashboardCountersFor(
  mode: WorkspaceMode,
  pending: { findings: number; dsar: number; breach: number; approvals: number },
  snapshot: {
    aiSystems: number
    literacyRecords: number
    loggingConfigs: number
    pmmPlans: number
    aiIncidentsOpen: number
  },
): CounterItem[] {
  if (mode === "ai-builder") {
    return [
      { label: "De rezolvat", count: pending.findings, href: "/dashboard/resolve", accent: "amber" },
      { label: "Sisteme AI", count: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
      { label: "Jurnalizare", count: snapshot.loggingConfigs, href: "/dashboard/logging-evidence", accent: "cobalt" },
      { label: "Planuri PMM", count: snapshot.pmmPlans, href: "/dashboard/post-market-monitoring", accent: "cobalt" },
    ]
  }

  if (mode === "cabinet") {
    return [
      { label: "De rezolvat", count: pending.findings, href: "/dashboard/resolve", accent: "amber" },
      { label: "Sisteme AI", count: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
      { label: "Aprobări pending", count: pending.approvals, href: "/dashboard/approvals", accent: "cobalt" },
      { label: "Incidente date", count: pending.breach, href: "/dashboard/breach", accent: "red" },
    ]
  }

  return [
    { label: "De rezolvat", count: pending.findings, href: "/dashboard/resolve", accent: "amber" },
    { label: "Sisteme AI", count: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
    { label: "AI Literacy", count: snapshot.literacyRecords, href: "/dashboard/literacy", accent: "cobalt" },
    { label: "DSAR în curs", count: pending.dsar, href: "/dashboard/dsar", accent: "amber" },
  ]
}

function CounterCard({
  label,
  count,
  href,
  accent,
}: {
  label: string
  count: number
  href: string
  accent: "amber" | "cobalt" | "red"
}) {
  const color =
    accent === "amber"
      ? "var(--amber-400)"
      : accent === "red"
        ? "var(--red-400)"
        : "var(--cobalt-400)"
  return (
    <Link
      href={href}
      className={cn(
        "cr-stat",
        accent === "red" && "cr-stat--critical",
        accent === "amber" && "cr-stat--warning",
        accent === "cobalt" && "cr-stat--info"
      )}
      style={{ textDecoration: "none" }}
    >
      <div className="cr-stat__label">
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span className="cr-stat__value" style={{ color: count > 0 ? color : "var(--ink-muted)" }}>
          {count}
        </span>
        {count > 0 && accent !== "cobalt" && (
          <span className={`cr-soft-pill ${accent === "red" ? "cr-soft-pill--danger" : "cr-soft-pill--warning"}`}>
            atenție
          </span>
        )}
      </div>
    </Link>
  )
}
