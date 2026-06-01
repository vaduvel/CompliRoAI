import Link from "next/link"
import { createHash } from "node:crypto"
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
import {
  buildDashboardExecutionState,
  buildGuidancePlanCoherence,
  exportReadinessLabel,
  type DashboardExecutionState,
  type DashboardSnapshot,
} from "@/lib/compliance/dashboard-coherence"
import { buildGuidancePlan, type GuidancePlan } from "@/lib/compliance/guidance-orchestrator"
import type { AIGuidancePlanRecord } from "@/lib/compliance/types"
import type { ComplianceState } from "@/lib/compliance/types"
import { initialComplianceState } from "@/lib/compliance/engine"
import { buildGuidancePlanFromOrchestrator } from "@/lib/server/ai-orchestrator/to-guidance-plan"
import { type WorkspaceMode } from "@/lib/server/auth"
import { getOrgContext } from "@/lib/server/org-context"
import { readFreshStateForOrg } from "@/lib/server/store"
import { getMembership } from "@/lib/server/tenancy"
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
  value: number | string
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

function nextActionsFor(
  mode: WorkspaceMode,
  options?: {
    isClientExecution?: boolean
    snapshot?: DashboardSnapshot
  },
): ActionCard[] {
  if (mode === "cabinet" && options?.isClientExecution) {
    const snapshot = options.snapshot
    const hasCandidates = (snapshot?.aiUseCasesCandidateCount ?? 0) > 0
    const exportBlocked = snapshot?.exportReadinessStatus === "blocked"
    const hasMissingEvidence = (snapshot?.evidenceMissingCount ?? 0) > 0

    return [
      hasCandidates
        ? {
            href: "/dashboard/sisteme",
            iconName: "CheckSquare",
            title: "Confirmă candidate AI",
            subtitle: "Separă utilizările AI detectate de sistemele confirmate înainte de concluzii.",
          }
        : {
            href: "/dashboard/client-intake",
            iconName: "UserPlus",
            title: "Trimite intake clientului",
            subtitle: "Cere fapte canonice despre AI, vendor, date personale și dovezi disponibile.",
          },
      {
        href: "/dashboard/audit-pack",
        iconName: "ShieldAlert",
        title: exportBlocked ? "Rezolvă blocker-ele Audit Pack" : "Pregătește Audit Pack",
        subtitle: exportBlocked
          ? "Vezi ce dovezi și review-uri blochează exportul final."
          : "Verifică dosarul înainte de trimitere sau export.",
      },
      {
        href: hasMissingEvidence ? "/dashboard/resolve" : "/dashboard/approvals",
        iconName: hasMissingEvidence ? "FileCheck" : "ClipboardCheck",
        title: hasMissingEvidence ? "Atașează dovezi lipsă" : "Trimite la review",
        subtitle: hasMissingEvidence
          ? "Completează screenshot-uri, DPA-uri, RoPA/DPIA și note operaționale."
          : "Trimite acțiunile pregătite către DPO, legal sau client.",
      },
    ]
  }

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


function DashboardCoherencePanel({ executionState }: { executionState: DashboardExecutionState }) {
  const { snapshot, exportBlockers } = executionState
  const visibleBlockers = exportBlockers.slice(0, 5)

  return (
    <section className="cr-card cr-stack cr-dashboard-coherence" aria-labelledby="dashboard-coherence-heading">
      <div className="cr-section-heading">
        <div>
          <p className="cr-eyebrow">Dashboard Coherence</p>
          <h2 id="dashboard-coherence-heading">Starea reală a dosarului</h2>
          <p className="cr-muted">{executionState.provenanceLabel}</p>
        </div>
        <Link className={"cr-button cr-button--" + executionState.auditPackCta.tone} href={executionState.auditPackCta.href}>
          {executionState.auditPackCta.label}
        </Link>
      </div>

      <div className="cr-stat-strip cr-stat-strip--auto" aria-label="Contoare operaționale pentru dosar">
        <div className="cr-stat">
          <span className="cr-stat__label">AI candidate</span>
          <strong className="cr-stat__value">{snapshot.aiUseCasesCandidateCount}</strong>
        </div>
        <div className="cr-stat">
          <span className="cr-stat__label">AI confirmate</span>
          <strong className="cr-stat__value">{snapshot.aiUseCasesConfirmedCount}</strong>
        </div>
        <div className="cr-stat">
          <span className="cr-stat__label">Sisteme AI</span>
          <strong className="cr-stat__value">{snapshot.aiSystems}</strong>
        </div>
        <div className="cr-stat cr-stat--warning">
          <span className="cr-stat__label">Dovezi lipsă</span>
          <strong className="cr-stat__value">{snapshot.evidenceMissingCount}</strong>
        </div>
        <div className="cr-stat cr-stat--info">
          <span className="cr-stat__label">Review pending</span>
          <strong className="cr-stat__value">{snapshot.reviewPendingCount}</strong>
        </div>
        <div className={cn("cr-stat", snapshot.exportReadinessStatus === "blocked" ? "cr-stat--critical" : "cr-stat--info")}>
          <span className="cr-stat__label">Export</span>
          <strong className="cr-stat__value">{exportReadinessLabel(snapshot.exportReadinessStatus)}</strong>
        </div>
      </div>

      <div className="cr-grid cr-grid--2">
        <div className="cr-card cr-card--subtle">
          <p className="cr-eyebrow">Export readiness</p>
          <h3>{exportReadinessLabel(snapshot.exportReadinessStatus)}</h3>
          <p>
            Audit Pack-ul poate fi exportat doar când blocker-ele sunt închise, dovezile cerute sunt atașate și review gate-urile sunt trecute de oameni responsabili.
          </p>
        </div>
        <div className="cr-card cr-card--subtle">
          <p className="cr-eyebrow">Blocker-ele Audit Pack</p>
          {visibleBlockers.length > 0 ? (
            <div className="cr-stack">
              {visibleBlockers.map((blocker) => (
                <article className="cr-stack" key={blocker.id}>
                  <div className="cr-row cr-row--between">
                    <span className="cr-soft-pill cr-soft-pill--warning">{blocker.code}</span>
                    <Link className="cr-link" href={blocker.href}>Deschide</Link>
                  </div>
                  <h4>{blocker.title}</h4>
                  <p>{blocker.statusLabel} · {blocker.ownerRole} · {blocker.reviewGate}</p>
                  {blocker.requiredEvidence.length > 0 ? (
                    <p>Dovadă cerută: {blocker.requiredEvidence.slice(0, 2).join("; ")}</p>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p>Nu există blocker canonic deschis pentru export. Următorul pas este review-ul uman înainte de livrare.</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default async function DashboardHomePage() {
  try {
    const ctx = await getOrgContext()
    const workspaceMode = ctx.workspaceMode
    const orgName = ctx.orgName ?? ""

    // Best-effort state read for counters + recent events.
    let pending = { findings: 0, dsar: 0, breach: 0, approvals: 0 }
    let snapshot: DashboardSnapshot = {
      aiSystems: 0,
      aiUseCasesCandidateCount: 0,
      aiUseCasesConfirmedCount: 0,
      vendorsCount: 0,
      evidenceMissingCount: 0,
      reviewPendingCount: 0,
      exportReadinessStatus: "draft_only",
      exportBlockersCount: 0,
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
      const openFindings = state.findings?.filter(isOpenFinding) ?? []
      const evidenceMissingCount = openFindings.filter(needsEvidence).length
      const useCases = state.aiUseCases ?? []
      const vendors = state.vendorRecords ?? []
      const criticalOpenFindings = openFindings.filter((finding) => finding.severity === "critical").length
      const reviewPendingCount =
        (state.approvalRequests?.filter((a) => a.status === "pending").length ?? 0) +
        openFindings.filter((finding) =>
          finding.requiresHumanReview ||
          finding.reviewState === "unreviewed" ||
          finding.reviewState === "confirmed"
        ).length
      const exportBlockersCount = criticalOpenFindings + evidenceMissingCount
      pending = {
        findings: openFindings.length,
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
        aiUseCasesCandidateCount: useCases.length,
        aiUseCasesConfirmedCount: useCases.filter((item) =>
          item.reviewStatus === "reviewed" ||
          item.reviewStatus === "approved" ||
          item.certaintyStatus === "dpo_reviewed" ||
          item.certaintyStatus === "lawyer_reviewed" ||
          item.certaintyStatus === "consultant_reviewed" ||
          item.certaintyStatus === "client_approved"
        ).length,
        vendorsCount: vendors.length,
        evidenceMissingCount,
        reviewPendingCount,
        exportReadinessStatus: exportReadinessFor({
          hasOperationalData:
            useCases.length > 0 ||
            (state.aiSystems?.length ?? 0) > 0 ||
            openFindings.length > 0,
          exportBlockersCount,
          reviewPendingCount,
        }),
        exportBlockersCount,
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
        guidanceRecord
          ? sanitizeGuidancePlanForDashboardState(guidanceRecord.plan, state)
          :
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

    const currentMembership = await getMembership(ctx.userId, ctx.orgId).catch(() => null)
    const isClientExecution = workspaceMode === "cabinet" && currentMembership?.role === "partner_manager"
    const executionState = buildDashboardExecutionState(dashboardState, { isClientExecution })
    snapshot = executionState.snapshot
    const actions = nextActionsFor(workspaceMode, { isClientExecution, snapshot })
    const greeting = ROLE_GREETING[workspaceMode]
    const counters = dashboardCountersFor(workspaceMode, pending, snapshot, isClientExecution)
    const guidanceCoherence = buildGuidancePlanCoherence(executionState)

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

        <DashboardCoherencePanel executionState={executionState} />

        <GuidancePlanPanel initialRecord={guidanceRecord} initialPlan={guidancePlan} coherence={guidanceCoherence} />

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
  snapshot: DashboardSnapshot,
  isClientExecution = false,
): CounterItem[] {
  if (mode === "ai-builder") {
    return [
      { label: "De rezolvat", value: pending.findings, href: "/dashboard/resolve", accent: "amber" },
      { label: "Sisteme AI", value: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
      { label: "Dovezi lipsă", value: snapshot.evidenceMissingCount, href: "/dashboard/resolve", accent: "amber" },
      { label: "Review pending", value: snapshot.reviewPendingCount, href: "/dashboard/approvals", accent: "cobalt" },
    ]
  }

  if (mode === "cabinet") {
    if (isClientExecution) {
      return [
        { label: "Findings deschise", value: pending.findings, href: "/dashboard/resolve", accent: "amber" },
        { label: "AI candidate", value: snapshot.aiUseCasesCandidateCount, href: "/dashboard/sisteme", accent: "cobalt" },
        { label: "AI confirmate", value: snapshot.aiUseCasesConfirmedCount, href: "/dashboard/sisteme", accent: "cobalt" },
        { label: "Sisteme AI", value: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
        { label: "Dovezi lipsă", value: snapshot.evidenceMissingCount, href: "/dashboard/resolve", accent: "amber" },
        {
          label: "Export readiness",
          value: exportReadinessLabel(snapshot.exportReadinessStatus),
          href: "/dashboard/audit-pack",
          accent: snapshot.exportReadinessStatus === "blocked" ? "red" : "cobalt",
        },
      ]
    }

    return [
      { label: "De rezolvat", value: pending.findings, href: "/dashboard/resolve", accent: "amber" },
      { label: "Clienți / portofoliu", value: snapshot.vendorsCount, href: "/dashboard/portofoliu", accent: "cobalt" },
      { label: "Dovezi lipsă", value: snapshot.evidenceMissingCount, href: "/dashboard/resolve", accent: "amber" },
      { label: "Aprobări pending", value: pending.approvals, href: "/dashboard/approvals", accent: "cobalt" },
    ]
  }

  return [
    { label: "De rezolvat", value: pending.findings, href: "/dashboard/resolve", accent: "amber" },
    { label: "Sisteme AI", value: snapshot.aiSystems, href: "/dashboard/sisteme", accent: "cobalt" },
    { label: "Dovezi lipsă", value: snapshot.evidenceMissingCount, href: "/dashboard/resolve", accent: "amber" },
    { label: "DSAR în curs", value: pending.dsar, href: "/dashboard/dsar", accent: "amber" },
  ]
}

function CounterCard({
  label,
  value,
  href,
  accent,
}: {
  label: string
  value: number | string
  href: string
  accent: "amber" | "cobalt" | "red"
}) {
  const hasAttention = typeof value === "number" ? value > 0 : value === "Blocat" || value === "blocked"
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
        <span className="cr-stat__value" style={{ color: hasAttention ? color : "var(--ink-muted)" }}>
          {value}
        </span>
        {hasAttention && accent !== "cobalt" && (
          <span className={`cr-soft-pill ${accent === "red" ? "cr-soft-pill--danger" : "cr-soft-pill--warning"}`}>
            atenție
          </span>
        )}
      </div>
    </Link>
  )
}

function isOpenFinding(finding: { findingStatus?: string; reviewState?: string }) {
  const status = finding.findingStatus ?? "open"
  if (status === "resolved" || status === "dismissed" || status === "under_monitoring") return false
  if (finding.reviewState === "closed" || finding.reviewState === "monitoring") return false
  return status === "open" || status === "confirmed" || finding.reviewState === "unreviewed" || finding.reviewState === "evidence_attached"
}

function sanitizeGuidancePlanForDashboardState(
  plan: GuidancePlan,
  state: ComplianceState,
): GuidancePlan {
  const inactiveFindings = (state.findings ?? []).filter((finding) => !isOpenFinding(finding))
  if (inactiveFindings.length === 0) return plan

  const inactiveTokens = inactiveFindings.flatMap((finding) =>
    [finding.id, finding.title].filter((value): value is string => Boolean(value && value.length >= 8))
  )
  if (inactiveTokens.length === 0) return plan

  const allActions = [...plan.actions, ...plan.omittedActions]
  const filtered = allActions.filter((action) => {
    if (action.source !== "finding") return true
    const haystack = [
      action.id,
      action.title,
      action.why,
      action.targetHref,
      ...action.sourceIds,
    ].join(" ")
    return !inactiveTokens.some((token) => haystack.includes(token))
  })

  if (filtered.length === allActions.length) return plan

  const maxActions = Math.max(1, plan.actions.length)
  const reranked = filtered.map((action, index) => ({
    ...action,
    rank: index + 1,
    omittedReason: index < maxActions ? undefined : action.omittedReason,
  }))
  const actions = reranked.slice(0, maxActions)
  const omittedActions = reranked.slice(maxActions)
  const fingerprint = createHash("sha1")
    .update(JSON.stringify({
      previous: plan.fingerprint,
      actions: actions.map((action) => action.id),
      omitted: omittedActions.map((action) => action.id),
      findings: (state.findings ?? []).map((finding) => [
        finding.id,
        finding.findingStatus,
        finding.reviewState,
      ]),
    }))
    .digest("hex")
    .slice(0, 16)

  return {
    ...plan,
    actions,
    omittedActions,
    summary: `${actions.length} acțiuni prioritizate (${plan.stats.criticalFindingsCount} critice), ${omittedActions.length} în planul complet.`,
    coverage: {
      shown: actions.length,
      omitted: omittedActions.length,
      totalCandidates: reranked.length,
    },
    stats: {
      ...plan.stats,
      openFindingsCount: (state.findings ?? []).filter(isOpenFinding).length,
    },
    fingerprint: `${plan.fingerprint}-live-${fingerprint}`,
  }
}

function needsEvidence(finding: {
  evidenceRequired?: string
  requiredEvidenceKinds?: string[]
  reviewState?: string
}) {
  const hasEvidenceRequirement =
    Boolean(finding.evidenceRequired?.trim()) ||
    Boolean(finding.requiredEvidenceKinds?.length)
  const hasEvidenceAttached =
    finding.reviewState === "evidence_attached" ||
    finding.reviewState === "closed" ||
    finding.reviewState === "monitoring"
  return hasEvidenceRequirement && !hasEvidenceAttached
}

function exportReadinessFor(input: {
  hasOperationalData: boolean
  exportBlockersCount: number
  reviewPendingCount: number
}): DashboardSnapshot["exportReadinessStatus"] {
  if (input.exportBlockersCount > 0) return "blocked"
  if (input.reviewPendingCount > 0) return "ready_for_review"
  if (input.hasOperationalData) return "approved"
  return "draft_only"
}

