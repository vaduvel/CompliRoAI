"use client"

import { useMemo, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { Check, Download, ExternalLink, RefreshCw, Sparkles, X } from "lucide-react"

import type { GuidanceAction, GuidancePlan } from "@/lib/compliance/guidance-orchestrator"
import type { AIGuidancePlanRecord } from "@/lib/compliance/types"

type GuidancePlanPanelProps = {
  initialRecord: AIGuidancePlanRecord | null
  initialPlan: GuidancePlan
}

type ExplanationState = {
  actionId: string
  reason: string
} | null

export function GuidancePlanPanel({ initialRecord, initialPlan }: GuidancePlanPanelProps) {
  const [record, setRecord] = useState<AIGuidancePlanRecord | null>(initialRecord)
  const [previewPlan, setPreviewPlan] = useState(initialPlan)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [explanation, setExplanation] = useState<ExplanationState>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isPreviewNewerThanRecord = Boolean(record && previewPlan.fingerprint !== record.plan.fingerprint)
  const activeRecord = isPreviewNewerThanRecord ? null : record
  const plan = isPreviewNewerThanRecord ? previewPlan : record?.plan ?? previewPlan

  const statusLabel = useMemo(() => {
    if (isPreviewNewerThanRecord) return "actualizat"
    if (!activeRecord) return "preview"
    if (activeRecord.status === "accepted") return "acceptat"
    if (activeRecord.status === "rejected") return "respins"
    if (activeRecord.status === "superseded") return "înlocuit"
    return "generat"
  }, [activeRecord, isPreviewNewerThanRecord])

  async function createPersistedPlan(reason = "manual_regenerate"): Promise<AIGuidancePlanRecord | null> {
    const response = await fetch("/api/ai-guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate", reason }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(payload.error ?? "Nu am putut regenera planul.")
      return null
    }
    setRecord(payload.record)
    setPreviewPlan(payload.record.plan)
    setExplanation(null)
    return payload.record as AIGuidancePlanRecord
  }

  function regenerate(reason = "manual_regenerate") {
    setError(null)
    startTransition(async () => {
      await createPersistedPlan(reason)
    })
  }

  function decide(action: "accept" | "reject") {
    setError(null)
    startTransition(async () => {
      const targetRecord = activeRecord ?? await createPersistedPlan(
        isPreviewNewerThanRecord ? "after_action_refresh" : "manual_regenerate",
      )
      if (!targetRecord) return

      const response = await fetch("/api/ai-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          recordId: targetRecord.id,
          note: action === "reject" ? "Respins din UI de operator." : undefined,
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error ?? "Nu am putut salva decizia.")
        return
      }
      setRecord(payload.record)
    })
  }

  function explain(action: GuidanceAction) {
    setError(null)
    if (!activeRecord) {
      setExplanation({
        actionId: action.id,
        reason: action.omittedReason ?? "Nu apare în planul scurt pentru că planul complet are acțiuni cu prioritate mai mare.",
      })
      return
    }
    startTransition(async () => {
      const response = await fetch("/api/ai-guidance", {
        method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "explain-omitted",
            recordId: activeRecord.id,
            actionId: action.id,
          }),
        })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error ?? "Nu am putut explica omisiunea.")
        return
      }
      setExplanation({
        actionId: action.id,
        reason: payload.explanation.reason,
      })
    })
  }

  function exportPlan() {
    const markdown = buildClientMarkdown(activeRecord, plan)
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `compliroai-ai-guidance-${plan.fingerprint}.md`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section
      id="ai-guidance"
      className="cr-ai-plan"
      aria-label="Plan de lucru AI"
    >
      <div className="cr-ai-plan__header">
        <div className="cr-ai-plan__title-row">
          <div className="cr-ai-plan__icon">
            <Sparkles size={20} />
          </div>
          <div className="cr-ai-plan__title-copy">
            <div className="cr-ai-plan__heading-row">
              <h2 className="cr-ai-plan__title">
                {plan.headline}
              </h2>
              <span className="cr-badge cr-badge--info">AI · {plan.modelLabel === "mistral-assisted" ? "MISTRAL" : "DETERMINIST"}</span>
              <span className="cr-badge">{statusLabel}</span>
            </div>
            <p className="cr-ai-plan__meta">
              {plan.summary} · {plan.coverage.totalCandidates} candidate evaluate · {plan.stats.aiSystemsCount} sisteme AI · prompt {plan.promptVersion}
            </p>
            {activeRecord?.diffFromPrevious ? (
              <p className="cr-ai-plan__change">
                Schimbare față de planul anterior: {activeRecord.diffFromPrevious.summary}
              </p>
            ) : null}
          </div>
        </div>
        <div className="cr-ai-plan__header-actions">
          <button type="button" onClick={() => regenerate()} disabled={isPending} className="cr-btn cr-btn--sm">
            <RefreshCw size={15} /> Regenerează
          </button>
          <button type="button" onClick={() => setDrawerOpen(true)} className="cr-btn cr-btn--primary cr-btn--sm">
            Plan complet <ExternalLink size={15} />
          </button>
        </div>
      </div>

      {error ? (
        <div className="cr-alert cr-alert--danger">{error}</div>
      ) : null}

      {isPreviewNewerThanRecord ? (
        <div className="cr-alert cr-alert--warning">
          Plan recalculat după ultima acțiune. Acceptă sau regenerează ca să-l salvezi în jurnalul de audit.
        </div>
      ) : null}

      <div className="cr-ai-plan__body">
        {plan.actions.map((action) => (
          <ActionRow key={action.id} action={action} />
        ))}
      </div>
      <div className="cr-ai-plan__footer">
        <span>AI nu execută · doar recomandă · salvat în jurnal când generezi planul</span>
        <button type="button" onClick={() => setDrawerOpen(true)} className="cr-link-button">
          Vezi sursele și omisiunile →
        </button>
      </div>

      {drawerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Plan de lucru AI explicat"
          className="cr-drawer-backdrop"
        >
          <div className="cr-drawer">
            <div className="cr-drawer__header">
              <div>
                <h2 className="cr-title" style={{ margin: 0, fontSize: "24px" }}>
                  Plan de lucru AI · explicat
                </h2>
                <p className="cr-muted-copy">
                  Generat {formatDate(plan.generatedAtISO)} · {plan.modelLabel} · {plan.coverage.totalCandidates} candidate · fingerprint {plan.fingerprint.slice(0, 8)}
                </p>
              </div>
              <button type="button" aria-label="Închide planul" onClick={() => setDrawerOpen(false)} className="cr-btn cr-btn--sm">
                <X size={18} />
              </button>
            </div>

            <div className="cr-drawer__content">
              <div className="cr-card cr-paragraph">
                <strong style={{ color: "var(--ink)" }}>Cum funcționează:</strong> citește state-ul aplicației
                (sisteme AI, findings, deadline-uri, evidence), consultă acoperirea AI Act/GDPR și ordonează
                acțiunile după impact real. <strong style={{ color: "var(--ink)" }}>AI-ul nu execută</strong>:
                omul aprobă, atașează dovada și marchează rezolvat.
              </div>

              {activeRecord?.diffFromPrevious ? (
                <PlanDiffSummary record={activeRecord} />
              ) : null}

              <div>
                <SectionLabel>Acțiuni prioritizate</SectionLabel>
                <div className="cr-stack">
                  {plan.actions.map((action) => (
                    <ActionDetail key={action.id} action={action} />
                  ))}
                </div>
              </div>

              <div>
                <SectionLabel>De ce nu sunt toate în planul scurt?</SectionLabel>
                {plan.omittedActions.length === 0 ? (
                  <p className="cr-muted-copy">Nu există acțiuni omise.</p>
                ) : (
                  <div className="cr-stack">
                    {plan.omittedActions.map((action) => (
                      <div key={action.id} className="cr-omitted-row">
                        <div>
                          <strong>{action.title}</strong>
                          <div className="cr-muted-copy">
                            {action.legalReferences.join(", ") || "fără referință explicită"}
                          </div>
                          {explanation?.actionId === action.id ? (
                            <div className="cr-ai-plan__change">
                              {explanation.reason}
                            </div>
                          ) : null}
                        </div>
                        <button type="button" onClick={() => explain(action)} className="cr-btn cr-btn--sm">
                          De ce nu e în top?
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SectionLabel>Surse și guardrails</SectionLabel>
                <ul className="cr-source-list">
                  {plan.guardrails.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="cr-drawer__footer">
              <button type="button" onClick={() => decide("reject")} disabled={isPending} className="cr-btn cr-btn--danger">
                <X size={15} /> Respinge planul
              </button>
              <div className="cr-inline">
                <button type="button" onClick={exportPlan} className="cr-btn">
                  <Download size={15} /> Export plan
                </button>
                <button type="button" onClick={() => decide("accept")} disabled={isPending} className="cr-btn cr-btn--primary">
                  <Check size={15} /> Acceptă & prioritizează
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ActionRow({ action }: { action: GuidanceAction }) {
  return (
    <div className="cr-ai-action">
      <span className={rankClassName(action.severity)}>{action.rank}</span>
      <div>
        <div className="cr-ai-action__title">{action.title}</div>
        <div className="cr-ai-action__why">
          {action.why}
        </div>
        <div className="cr-ai-action__refs">
          {action.legalReferences.slice(0, 3).map((ref) => (
            <span key={ref} className="cr-badge">{ref}</span>
          ))}
        </div>
      </div>
      <div className="cr-ai-action__side">
        <div className="cr-ai-action__side-label">
          Acțiune sugerată
        </div>
        <strong>{action.suggestedAction}</strong>
        <div className="cr-muted">
          {ownerLabel(action.suggestedOwner)}
          {action.estimatedMinutes ? ` · ${action.estimatedMinutes} min` : ""}
        </div>
      </div>
      <Link href={action.targetHref} className="cr-btn cr-btn--primary cr-btn--sm">
        Deschide <ExternalLink size={15} />
      </Link>
    </div>
  )
}

function ActionDetail({ action }: { action: GuidanceAction }) {
  return (
    <article className="cr-card">
      <div className="cr-inline cr-inline--start">
        <span className={rankClassName(action.severity)}>{action.rank}</span>
        <div className="cr-stack">
          <h3>{action.title}</h3>
          <p className="cr-muted-copy">{action.why}</p>
          <SectionLabel>De ce e #{action.rank}</SectionLabel>
          <p className="cr-paragraph">
            {action.priority} · {severityLabel(action.severity)} · owner recomandat:{" "}
            <strong>{ownerLabel(action.suggestedOwner)}</strong>
            {action.estimatedMinutes ? ` · ${action.estimatedMinutes} minute estimate` : ""}.
          </p>
          <SectionLabel>Articole consultate</SectionLabel>
          <div className="cr-chip-group">
            {action.legalReferences.map((ref) => <span key={ref} className="cr-badge">{ref}</span>)}
          </div>
          <SectionLabel>Dovezi cerute</SectionLabel>
          <ul className="cr-source-list">
            {(action.evidenceRequired.length ? action.evidenceRequired : ["dovadă execuție"]).map((item) => <li key={item}>{item}</li>)}
          </ul>
          <Link href={action.targetHref} className="cr-btn cr-btn--primary">
            Deschide în aplicație <ExternalLink size={15} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function PlanDiffSummary({ record }: { record: AIGuidancePlanRecord }) {
  const diff = record.diffFromPrevious
  if (!diff) return null
  return (
    <div className="cr-diff-card">
      <SectionLabel>Planul de ieri vs azi</SectionLabel>
      <p>{diff.summary}</p>
      <div className="cr-diff-grid">
        <span>Adăugate: {diff.added.map((item) => item.title).join("; ") || "0"}</span>
        <span>Scoase: {diff.removed.map((item) => item.title).join("; ") || "0"}</span>
        <span>Reprioritizate: {diff.reprioritized.map((item) => `${item.title} (${item.previousRank} → ${item.currentRank})`).join("; ") || "0"}</span>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="cr-section-label">
      {children}
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function buildClientMarkdown(record: AIGuidancePlanRecord | null, plan: GuidancePlan): string {
  return [
    `# Plan AI Guidance — ${plan.orgName}`,
    "",
    `Status: ${record?.status ?? "preview"}`,
    `Generat: ${plan.generatedAtISO}`,
    `Model: ${plan.modelLabel}`,
    "",
    "## Acțiuni prioritizate",
    "",
    ...plan.actions.map((action) => `- ${action.rank}. ${action.title} — ${action.legalReferences.join(", ")}`),
    "",
    "## Acțiuni omise",
    "",
    ...(plan.omittedActions.length ? plan.omittedActions.map((action) => `- ${action.title}: ${action.omittedReason ?? ""}`) : ["Nu există."]),
    "",
  ].join("\n")
}

function rankClassName(severity: GuidanceAction["severity"]): string {
  if (severity === "critical") return "cr-rank cr-rank--critical"
  if (severity === "high") return "cr-rank cr-rank--high"
  return "cr-rank"
}

function ownerLabel(owner: GuidanceAction["suggestedOwner"]): string {
  const labels: Record<GuidanceAction["suggestedOwner"], string> = {
    DPO: "DPO",
    Legal: "Legal",
    IT: "IT",
    Product: "Product",
    Management: "Management",
    Security: "Security",
    Marketing: "Marketing",
    Cabinet: "Cabinet",
  }
  return labels[owner] ?? owner
}

function severityLabel(severity: GuidanceAction["severity"]): string {
  const labels: Record<GuidanceAction["severity"], string> = {
    critical: "critic",
    high: "ridicat",
    medium: "mediu",
    low: "scăzut",
  }
  return labels[severity]
}
