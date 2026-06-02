"use client"

/**
 * Sprint 010 — /dashboard/vendor-review
 *
 * Pagina mature Vendor AI Assessment + DPA Review:
 * - Header: "Vendor AI — DPA + Transfer + AI Terms"
 * - Stats: total / approved / needs_dpa / high_risk
 * - Filter tabs by reviewStatus
 * - Add vendor button → modal cu library search → prefill → save
 * - Row: nume + region flag + DPA badge + risk badge + status + expand
 * - Expand inline: identification + DPA + transfer + subprocesori +
 *   security 7 checkboxes + AI terms 5 fields + risc panel + actions
 *   (approve/reject/download brief) + linked findings/audit
 *
 * Style: inline + v3 design tokens, fara shadcn/Tailwind. Romanian copy.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  Loader2,
  Package,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react"

import type {
  DPAStatus,
  VendorAITerms,
  VendorRecord,
  VendorRegion,
  VendorReviewStatus,
  VendorRiskLevel,
  VendorRole,
  VendorSecurityEvidence,
  VendorTransferMechanism,
} from "@/lib/compliance/types"
import type { VendorSummary } from "@/lib/server/vendor-review-store"
import type { VendorLifecycleSummary } from "@/lib/compliance/vendor-review-lifecycle"
import type { VendorLibraryEntry } from "@/lib/compliance/vendor-library"

// ────────────────────────────────────────────────────────────────────────────
//   Labels
// ────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<VendorReviewStatus, string> = {
  draft: "Schiță",
  in_review: "În review",
  needs_dpa: "Necesită DPA",
  needs_transfer_review: "Necesită transfer",
  needs_security_review: "Necesită securitate",
  approved: "Aprobat",
  rejected: "Respins",
  expired: "Expirat",
}

const RISK_LABELS: Record<VendorRiskLevel, string> = {
  minimal: "Minim",
  low: "Scăzut",
  medium: "Mediu",
  high: "Ridicat",
  critical: "Critic",
}

const DPA_LABELS: Record<DPAStatus, string> = {
  not_required: "Nu e cerut",
  missing: "Lipsă",
  draft_received: "Draft primit",
  negotiating: "În negociere",
  signed: "Semnat",
  expired: "Expirat",
}

const REGION_FLAG: Record<VendorRegion, string> = {
  EU: "🇪🇺",
  US: "🇺🇸",
  UK: "🇬🇧",
  other: "🌐",
  unknown: "❓",
}

const TRANSFER_LABELS: Record<VendorTransferMechanism, string> = {
  none: "Niciun mecanism",
  adequacy_decision: "Decizie adecvare",
  scc_controller_processor: "SCC controller-processor",
  scc_processor_processor: "SCC processor-processor",
  bcr: "BCR",
  derogation_art_49: "Derogare Art. 49",
  unknown: "Necunoscut",
}

const ROLE_LABELS: Record<VendorRole, string> = {
  processor: "Processor",
  controller: "Controller",
  joint_controller: "Joint controller",
  subprocessor: "Subprocessor",
}

const ALL_STATUSES: VendorReviewStatus[] = [
  "draft",
  "in_review",
  "needs_dpa",
  "needs_transfer_review",
  "needs_security_review",
  "approved",
  "rejected",
  "expired",
]

const ALL_REGIONS: VendorRegion[] = ["EU", "US", "UK", "other", "unknown"]
const ALL_ROLES: VendorRole[] = ["processor", "controller", "joint_controller", "subprocessor"]
const ALL_DPA: DPAStatus[] = [
  "not_required",
  "missing",
  "draft_received",
  "negotiating",
  "signed",
  "expired",
]
const ALL_TRANSFER: VendorTransferMechanism[] = [
  "none",
  "adequacy_decision",
  "scc_controller_processor",
  "scc_processor_processor",
  "bcr",
  "derogation_art_49",
  "unknown",
]

// ────────────────────────────────────────────────────────────────────────────
//   Types
// ────────────────────────────────────────────────────────────────────────────

type ListResponse = {
  records: VendorRecord[]
  summary: VendorSummary
  lifecycle: VendorLifecycleSummary
}

type FilterValue = "all" | VendorReviewStatus

function fmtDateRO(iso?: string): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function VendorReviewPage() {
  const [records, setRecords] = useState<VendorRecord[]>([])
  const [summary, setSummary] = useState<VendorSummary | null>(null)
  const [lifecycle, setLifecycle] = useState<VendorLifecycleSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterValue>("all")

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor-review")
      if (!res.ok) {
        setError("Nu am putut încărca lista de vendori.")
        return
      }
      const data = (await res.json()) as ListResponse
      setRecords(data.records)
      setSummary(data.summary)
      setLifecycle(data.lifecycle)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    if (filter === "all") return records
    return records.filter((r) => r.reviewStatus === filter)
  }, [records, filter])

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest vendor? Apare în audit trail.")) return
    const res = await fetch(`/api/vendor-review/${id}`, { method: "DELETE" })
    if (res.ok) {
      if (expandedId === id) setExpandedId(null)
      await load()
    }
  }

  function handleDownloadBrief(id: string) {
    window.open(`/api/vendor-review/${id}/brief?format=download`, "_blank")
  }

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <Package size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Discovery & risc</div>
            <h1 className="cr-title">Furnizori AI</h1>
            <p className="cr-subtitle">
              GDPR Art. 28 + AI Act vendor obligations · evaluator de risc automat,
              finding emission și brief exportabil pentru DPO/audit.
            </p>
          </div>
        </div>
      </div>

      <StatsBar summary={summary} />

      {lifecycle && lifecycle.reminderNote && (
        <div className="cr-alert cr-alert--warning">
          <AlertTriangle size={16} color="#fbbf24" />
          <span>{lifecycle.reminderNote}</span>
        </div>
      )}

      {error && (
        <div className="cr-alert cr-alert--danger">
          <XCircle size={16} />
          {error}
        </div>
      )}

      <div className="cr-toolbar">
        <FilterTabs filter={filter} onChange={setFilter} records={records} />
        <button onClick={() => setShowCreate(true)} className="cr-btn cr-btn--primary">
          <Plus size={14} />
          Adaugă vendor
        </button>
      </div>

      {loading ? (
        <div className="cr-inline-note">
          <Loader2 size={16} className="spin" />
          Se încarcă...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div className="cr-vendor-review-list">
          {filtered.map((v) => (
            <VendorRow
              key={v.id}
              record={v}
              expanded={expandedId === v.id}
              onToggle={() => setExpandedId(expandedId === v.id ? null : v.id)}
              onDelete={() => handleDelete(v.id)}
              onDownloadBrief={() => handleDownloadBrief(v.id)}
              onReload={load}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Subcomponents
// ────────────────────────────────────────────────────────────────────────────

type BadgeTone = "neutral" | "info" | "medium" | "high" | "critical" | "ok"

type FieldOption = {
  value: string
  label: string
}

function badgeToneForStatus(status: VendorReviewStatus): BadgeTone {
  switch (status) {
    case "approved":
      return "ok"
    case "in_review":
      return "info"
    case "needs_transfer_review":
      return "high"
    case "needs_security_review":
      return "medium"
    case "needs_dpa":
    case "rejected":
    case "expired":
      return "critical"
    case "draft":
    default:
      return "neutral"
  }
}

function badgeToneForRisk(level: VendorRiskLevel): BadgeTone {
  switch (level) {
    case "critical":
      return "critical"
    case "high":
      return "high"
    case "medium":
      return "medium"
    case "low":
      return "info"
    case "minimal":
    default:
      return "neutral"
  }
}

function badgeToneForDpa(status: DPAStatus): BadgeTone {
  switch (status) {
    case "signed":
      return "ok"
    case "negotiating":
      return "info"
    case "draft_received":
      return "medium"
    case "missing":
    case "expired":
      return "critical"
    case "not_required":
    default:
      return "neutral"
  }
}

function badgeClassName(tone: BadgeTone): string {
  return tone === "neutral" ? "cr-badge" : `cr-badge cr-badge--${tone}`
}

function ToneBadge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={badgeClassName(tone)}>{children}</span>
}

function StatsBar({ summary }: { summary: VendorSummary | null }) {
  if (!summary) return null

  const items = [
    {
      label: "Total",
      value: summary.total,
      accentClass: "",
      valueClass: "",
      sub: "Toți furnizorii AI înregistrați",
    },
    {
      label: "Aprobat",
      value: summary.approved,
      accentClass: " cr-stat--ok",
      valueClass: " cr-stat__value--ok",
      sub: "Vendori validați pentru uz operațional",
    },
    {
      label: "Necesită DPA",
      value: summary.needsDpa,
      accentClass: " cr-stat--critical",
      valueClass: " cr-stat__value--critical",
      sub: "Blocaje directe pe Art. 28 / transfer",
    },
    {
      label: "Risc ridicat",
      value: summary.highRisk + summary.criticalRisk,
      accentClass: " cr-stat--warning",
      valueClass: " cr-stat__value--warning",
      sub: "Vendori care cer tratament prioritar",
    },
  ]

  return (
    <div className="cr-stat-strip cr-stat-strip--four">
      {items.map((item) => (
        <div key={item.label} className={`cr-stat${item.accentClass}`}>
          <div className="cr-stat__label">{item.label}</div>
          <div className={`cr-stat__value${item.valueClass}`}>{item.value}</div>
          <div className="cr-stat__sub">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

function FilterTabs({
  filter,
  onChange,
  records,
}: {
  filter: FilterValue
  onChange: (f: FilterValue) => void
  records: VendorRecord[]
}) {
  const counts = useMemo(() => {
    const map = new Map<VendorReviewStatus, number>()
    for (const record of records) {
      map.set(record.reviewStatus, (map.get(record.reviewStatus) ?? 0) + 1)
    }
    return map
  }, [records])

  const tabs: Array<{ value: FilterValue; label: string; count: number }> = [
    { value: "all", label: "Toate", count: records.length },
    ...ALL_STATUSES.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      count: counts.get(status) ?? 0,
    })),
  ]

  return (
    <div className="cr-toolbar__filters">
      <Filter size={13} color="var(--ink-dim)" />
      <div className="cr-segment-bar">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={`cr-tab${filter === tab.value ? " is-active" : ""}`}
          >
            <span>{tab.label}</span>
            <span className="cr-tab__count">{tab.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function VendorRow({
  record,
  expanded,
  onToggle,
  onDelete,
  onDownloadBrief,
  onReload,
}: {
  record: VendorRecord
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onDownloadBrief: () => void
  onReload: () => Promise<void>
}) {
  return (
    <article className="cr-card cr-vendor-review-card">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="cr-vendor-review-card__toggle"
      >
        <div className="cr-vendor-review-card__summary">
          <span className="cr-vendor-review-card__flag">{REGION_FLAG[record.vendorRegion]}</span>
          <div className="cr-vendor-review-card__identity">
            <div className="cr-vendor-review-card__name">{record.name}</div>
            <div className="cr-vendor-review-card__meta">
              <span>{record.serviceCategory}</span>
              <span>·</span>
              <span>{ROLE_LABELS[record.role]}</span>
              {record.productUsed && (
                <>
                  <span>·</span>
                  <span>{record.productUsed}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="cr-vendor-review-card__badges">
          <ToneBadge tone={badgeToneForDpa(record.dpaStatus)}>
            DPA: {DPA_LABELS[record.dpaStatus]}
          </ToneBadge>
          <ToneBadge tone={badgeToneForRisk(record.riskLevel)}>
            Risc: {RISK_LABELS[record.riskLevel]}
          </ToneBadge>
          {record.humanReviewRequired && (
            <ToneBadge tone="critical">
              <ShieldAlert size={12} />
              Review uman
            </ToneBadge>
          )}
          <ToneBadge tone={badgeToneForStatus(record.reviewStatus)}>
            {STATUS_LABELS[record.reviewStatus]}
          </ToneBadge>
          {expanded ? (
            <ChevronUp size={16} color="var(--ink-dim)" />
          ) : (
            <ChevronDown size={16} color="var(--ink-dim)" />
          )}
        </div>
      </button>

      {expanded && (
        <VendorDetail
          record={record}
          onDelete={onDelete}
          onDownloadBrief={onDownloadBrief}
          onReload={onReload}
        />
      )}
    </article>
  )
}

function VendorDetail({
  record,
  onDelete,
  onDownloadBrief,
  onReload,
}: {
  record: VendorRecord
  onDelete: () => void
  onDownloadBrief: () => void
  onReload: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    try {
      await fetch(`/api/vendor-review/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      await onReload()
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    const email = prompt("Email reviewer (DPO/legal):", record.reviewedByEmail ?? "")
    if (!email?.trim()) return
    await patch({ action: "approve", reviewerEmail: email.trim() })
  }

  async function reject() {
    const reason = prompt("Motivul respingerii:")
    if (!reason?.trim()) return
    await patch({ action: "reject", reason: reason.trim() })
  }

  async function patchSecurity(key: keyof VendorSecurityEvidence, value: boolean | number) {
    await patch({ securityEvidence: { ...record.securityEvidence, [key]: value } })
  }

  async function patchAITerms(
    key: keyof VendorAITerms,
    value: VendorAITerms[keyof VendorAITerms],
  ) {
    await patch({ aiTerms: { ...record.aiTerms, [key]: value } })
  }

  return (
    <div className="cr-vendor-review-card__detail">
      {busy && (
        <div className="cr-inline-note">
          <Loader2 size={14} className="spin" />
          Salvăm actualizările vendorului…
        </div>
      )}

      <div className="cr-detail-grid">
        <SectionPanel eyebrow="1. Identificare" title="Context vendor">
          <DisplayField label="Persoană juridică" value={record.legalEntity} />
          <DisplayField label="Produs folosit" value={record.productUsed} />
          <DisplayField label="Email contact" value={record.contactEmail} />
          <DisplayField
            label="Categorie serviciu"
            value={`${record.serviceCategory} · ${ROLE_LABELS[record.role]}`}
          />
          <DisplayField
            label="Linkuri interne"
            value={`${record.linkedAISystemIds.length} sisteme AI · ${record.linkedAIDataMapIds.length} data map-uri AI · ${record.linkedFindingIds.length} findings`}
            spanTwo
          />
        </SectionPanel>

        <SectionPanel eyebrow="2. DPA" title="Art. 28 GDPR">
          <SelectField
            label="Status DPA"
            value={record.dpaStatus}
            options={ALL_DPA.map((status) => ({ value: status, label: DPA_LABELS[status] }))}
            onChange={(value) => patch({ dpaStatus: value })}
            disabled={busy}
          />
          <DisplayField label="URL DPA" value={record.dpaUrl} href={record.dpaUrl} />
          <DisplayField label="Semnat la" value={fmtDateRO(record.dpaSignedAtISO)} />
          <DisplayField label="Expiră la" value={fmtDateRO(record.dpaExpiresAtISO)} />
        </SectionPanel>

        <SectionPanel eyebrow="3. Transfer" title="Art. 44-49 GDPR">
          <SelectField
            label="Regiune vendor"
            value={record.vendorRegion}
            options={ALL_REGIONS.map((region) => ({
              value: region,
              label: `${REGION_FLAG[region]} ${region}`,
            }))}
            onChange={(value) => patch({ vendorRegion: value })}
            disabled={busy}
          />
          <SelectField
            label="Mecanism transfer"
            value={record.transferMechanism}
            options={ALL_TRANSFER.map((mechanism) => ({
              value: mechanism,
              label: TRANSFER_LABELS[mechanism],
            }))}
            onChange={(value) => patch({ transferMechanism: value })}
            disabled={busy}
          />
          <DisplayField label="Notă TIA" value={record.transferAssessmentNote} spanTwo />
        </SectionPanel>

        <SectionPanel eyebrow="4. Subprocesatori" title="Lanțul de procesare">
          <DisplayField
            label="URL listă publică"
            value={record.subprocessorsUrl}
            href={record.subprocessorsUrl}
          />
          <DisplayField label="Subprocesatori cunoscuți" spanTwo>
            {record.subprocessorsList.length > 0 ? (
              <ul className="cr-vendor-review-bullets">
                {record.subprocessorsList.map((subprocessor, index) => (
                  <li key={`${subprocessor}-${index}`}>{subprocessor}</li>
                ))}
              </ul>
            ) : (
              <span className="cr-muted">—</span>
            )}
          </DisplayField>
        </SectionPanel>

        <SectionPanel eyebrow="5. Securitate" title="Art. 32 GDPR" spanTwo>
          <div className="cr-field cr-field--span-2">
            <div className="cr-field-label">Controale verificate</div>
            <div className="cr-vendor-review-checkbox-grid">
              <Checkbox
                label="ISO 27001"
                checked={record.securityEvidence.iso27001}
                onChange={(value) => patchSecurity("iso27001", value)}
                disabled={busy}
              />
              <Checkbox
                label="SOC 2"
                checked={record.securityEvidence.soc2}
                onChange={(value) => patchSecurity("soc2", value)}
                disabled={busy}
              />
              <Checkbox
                label="Penetration test recent"
                checked={record.securityEvidence.penTestRecent}
                onChange={(value) => patchSecurity("penTestRecent", value)}
                disabled={busy}
              />
              <Checkbox
                label="Criptare în tranzit"
                checked={record.securityEvidence.encryptionInTransit}
                onChange={(value) => patchSecurity("encryptionInTransit", value)}
                disabled={busy}
              />
              <Checkbox
                label="Criptare at rest"
                checked={record.securityEvidence.encryptionAtRest}
                onChange={(value) => patchSecurity("encryptionAtRest", value)}
                disabled={busy}
              />
              <Checkbox
                label="MFA aplicat"
                checked={record.securityEvidence.mfaEnforced}
                onChange={(value) => patchSecurity("mfaEnforced", value)}
                disabled={busy}
              />
              <Checkbox
                label="Audit logs disponibile"
                checked={record.securityEvidence.auditLogsAvailable}
                onChange={(value) => patchSecurity("auditLogsAvailable", value)}
                disabled={busy}
              />
            </div>
          </div>
          <DisplayField
            label="SLA notificare incident (ore)"
            value={record.securityEvidence.incidentNotificationCommitmentHours?.toString()}
          />
        </SectionPanel>

        <SectionPanel eyebrow="6. Termeni AI" title="Obligații specifice vendorului" spanTwo>
          <SelectField
            label="Opt-out training"
            value={record.aiTerms.trainingDataOptOut}
            options={[
              { value: "yes", label: "Da" },
              { value: "no", label: "Nu" },
              { value: "default_opt_out", label: "Default opt-out" },
              { value: "unknown", label: "Necunoscut" },
            ]}
            onChange={(value) =>
              patchAITerms("trainingDataOptOut", value as VendorAITerms["trainingDataOptOut"])
            }
            disabled={busy}
          />
          <SelectField
            label="Retenție input"
            value={record.aiTerms.inputDataRetention}
            options={[
              { value: "no_retention", label: "Fără retenție" },
              { value: "session_only", label: "Doar sesiune" },
              { value: "days_30", label: "30 zile" },
              { value: "indefinite", label: "Nedefinit" },
              { value: "unknown", label: "Necunoscut" },
            ]}
            onChange={(value) =>
              patchAITerms(
                "inputDataRetention",
                value as VendorAITerms["inputDataRetention"],
              )
            }
            disabled={busy}
          />
          <SelectField
            label="Drepturi output"
            value={record.aiTerms.outputRightsOwnership}
            options={[
              { value: "client", label: "Client" },
              { value: "vendor", label: "Vendor" },
              { value: "shared", label: "Partajat" },
              { value: "unknown", label: "Necunoscut" },
            ]}
            onChange={(value) =>
              patchAITerms(
                "outputRightsOwnership",
                value as VendorAITerms["outputRightsOwnership"],
              )
            }
            disabled={busy}
          />
          <SelectField
            label="Transparență model"
            value={record.aiTerms.modelTransparency}
            options={[
              { value: "documented", label: "Documentat" },
              { value: "partial", label: "Parțial" },
              { value: "opaque", label: "Opac" },
              { value: "unknown", label: "Necunoscut" },
            ]}
            onChange={(value) =>
              patchAITerms(
                "modelTransparency",
                value as VendorAITerms["modelTransparency"],
              )
            }
            disabled={busy}
          />
          <Checkbox
            label="Garanții reproducibility"
            checked={record.aiTerms.reproducibilityGuarantees}
            onChange={(value) => patchAITerms("reproducibilityGuarantees", value)}
            disabled={busy}
            spanTwo
          />
        </SectionPanel>

        <SectionPanel eyebrow="7. Risc" title="Scor și motivare" spanTwo>
          <DisplayField label="Status curent" spanTwo>
            <div className="cr-summary-row">
              <ToneBadge tone={badgeToneForRisk(record.riskLevel)}>
                {RISK_LABELS[record.riskLevel]}
              </ToneBadge>
              {record.humanReviewRequired && (
                <ToneBadge tone="critical">
                  <ShieldAlert size={12} />
                  Review uman cerut
                </ToneBadge>
              )}
              {record.reviewedByEmail && (
                <span>
                  Reviewer: {record.reviewedByEmail} · {fmtDateRO(record.reviewedAtISO)}
                </span>
              )}
            </div>
          </DisplayField>
          <DisplayField label="Motivare risc" spanTwo>
            {record.riskReasons.length > 0 ? (
              <ul className="cr-vendor-review-bullets">
                {record.riskReasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            ) : (
              <span className="cr-muted">Fără risc detectat</span>
            )}
          </DisplayField>
          <DisplayField
            label="Următoarea revalidare"
            value={fmtDateRO(record.nextRevalidationISO)}
          />
        </SectionPanel>

        {record.linkedFindingIds.length > 0 && (
          <SectionPanel eyebrow="8. Findings" title="Legături operaționale" spanTwo>
            <DisplayField label="Finding-uri asociate" spanTwo>
              <ul className="cr-vendor-review-bullets">
                {record.linkedFindingIds.map((findingId) => (
                  <li key={findingId}>
                    <a href={`/dashboard/resolve?finding=${findingId}`} className="cr-link">
                      {findingId}
                    </a>
                  </li>
                ))}
              </ul>
            </DisplayField>
          </SectionPanel>
        )}

        {record.notes && (
          <SectionPanel eyebrow="9. Note" title="Context intern" spanTwo>
            <DisplayField label="Observații" spanTwo>
              <div className="cr-vendor-review-value cr-vendor-review-copy">{record.notes}</div>
            </DisplayField>
          </SectionPanel>
        )}
      </div>

      <div className="cr-vendor-review-actions">
        <button
          type="button"
          onClick={approve}
          disabled={busy || record.reviewStatus === "approved"}
          className="cr-btn cr-btn--primary"
        >
          <CheckCircle2 size={14} />
          Aprobă
        </button>
        <button
          type="button"
          onClick={reject}
          disabled={busy || record.reviewStatus === "rejected"}
          className="cr-btn cr-btn--danger"
        >
          <XCircle size={14} />
          Respinge
        </button>
        <button
          type="button"
          onClick={onDownloadBrief}
          disabled={busy}
          className="cr-btn cr-btn--secondary"
        >
          <Download size={14} />
          Descarcă brief .md
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="cr-btn cr-btn--danger"
        >
          <Trash2 size={14} />
          Șterge
        </button>
      </div>
    </div>
  )
}

function SectionPanel({
  eyebrow,
  title,
  children,
  spanTwo = false,
}: {
  eyebrow: string
  title: string
  children: ReactNode
  spanTwo?: boolean
}) {
  return (
    <section className={`cr-detail-panel${spanTwo ? " cr-field--span-2" : ""}`}>
      <div className="cr-vendor-review-panel__heading">
        <div className="cr-field-label">{eyebrow}</div>
        <h3 className="cr-panel__title">{title}</h3>
      </div>
      <div className="cr-form-grid cr-vendor-review-form-grid">{children}</div>
    </section>
  )
}

function DisplayField({
  label,
  value,
  href,
  spanTwo = false,
  children,
}: {
  label: string
  value?: string | null
  href?: string | null
  spanTwo?: boolean
  children?: ReactNode
}) {
  const content =
    children ??
    (href && value ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="cr-link cr-vendor-review-value"
      >
        {value}
      </a>
    ) : (
      <div className="cr-vendor-review-value">{value && value.length > 0 ? value : "—"}</div>
    ))

  return (
    <div className={`cr-field${spanTwo ? " cr-field--span-2" : ""}`}>
      <div className="cr-field-label">{label}</div>
      {content}
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: string
  options: FieldOption[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <label className="cr-field">
      <span className="cr-field-label">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="cr-input"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled,
  spanTwo = false,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  spanTwo?: boolean
}) {
  return (
    <label
      className={`cr-checkbox-row cr-vendor-review-checkbox-row${spanTwo ? " cr-field--span-2" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="cr-vendor-review-checkbox"
      />
      <span>{label}</span>
    </label>
  )
}

function EmptyState({ filter }: { filter: FilterValue }) {
  return (
    <div className="cr-empty">
      <div>
        <ShieldCheck size={28} color="var(--ink-dim)" />
        <div className="cr-form-title cr-vendor-review-empty-title">
          {filter === "all" ? "Niciun vendor înregistrat încă" : "Filtrul curent este gol"}
        </div>
        <p className="cr-muted-copy">
          {filter === "all"
            ? "Începe cu un vendor din library pentru OpenAI, Anthropic, Mistral sau completează manual datele contractuale."
            : "Schimbă statusul selectat sau adaugă un vendor nou ca să continui review-ul."}
        </p>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Create modal cu library search + prefill
// ────────────────────────────────────────────────────────────────────────────

type PrefillResponse = {
  libraryEntry: VendorLibraryEntry | null
  draft: Partial<VendorRecord> | null
  alternativeMatches: VendorLibraryEntry[]
  notes: string[]
}

function CreateModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [step, setStep] = useState<"search" | "review">("search")
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<VendorLibraryEntry[]>([])
  const [selected, setSelected] = useState<VendorLibraryEntry | null>(null)
  const [draft, setDraft] = useState<Partial<VendorRecord> | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetch("/api/vendor-review/library")
      .then((response) => response.json())
      .then((data: { vendors: VendorLibraryEntry[] }) => {
        if (!cancelled) setSuggestions(data.vendors ?? [])
      })
      .catch(() => {
        if (!cancelled) setError("Nu am putut încărca catalogul de vendori.")
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!query.trim()) return

    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/vendor-review/library?q=${encodeURIComponent(query)}`)
          const data = (await response.json()) as { vendors: VendorLibraryEntry[] }
          setSuggestions(data.vendors ?? [])
          setError(null)
        } catch {
          setError("Nu am putut căuta în catalogul de vendori.")
        }
      })()
    }, 200)

    return () => clearTimeout(timeout)
  }, [query])

  async function selectLibrary(entry: VendorLibraryEntry) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/vendor-review/library?prefill=${encodeURIComponent(entry.id)}`,
      )
      const data = (await response.json()) as PrefillResponse
      setSelected(data.libraryEntry ?? entry)
      setDraft(data.draft)
      setStep("review")
    } catch {
      setError("Nu am putut prepara prefill-ul.")
    } finally {
      setBusy(false)
    }
  }

  function selectManual() {
    setSelected(null)
    setDraft({
      name: query.trim() || "Vendor nou",
      vendorRegion: "unknown",
      role: "processor",
      serviceCategory: "Other",
      dpaStatus: "missing",
      transferMechanism: "none",
    })
    setError(null)
    setStep("review")
  }

  async function save() {
    if (!draft) return

    setBusy(true)
    setError(null)
    try {
      const response = await fetch("/api/vendor-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => ({ error: "Eroare necunoscută" }))) as {
          error?: string
        }
        setError(data.error ?? "Nu am putut crea vendorul.")
        return
      }

      await onCreated()
    } finally {
      setBusy(false)
    }
  }

  const footer =
    step === "search" ? (
      <>
        <div className="cr-inline cr-vendor-review-support-note">
          <Search size={14} />
          Vendorul nu e în catalog? Continuă manual și completezi restul în review.
        </div>
        <div className="cr-toolbar__actions">
          <button type="button" onClick={selectManual} disabled={busy} className="cr-btn cr-btn--secondary">
            <Plus size={14} />
            Adaugă manual
          </button>
        </div>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={() => setStep("search")}
          disabled={busy}
          className="cr-btn cr-btn--secondary"
        >
          Înapoi
        </button>
        <div className="cr-toolbar__actions">
          <button
            type="button"
            onClick={save}
            disabled={busy || !draft?.name}
            className="cr-btn cr-btn--primary"
          >
            {busy ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
            Salvează vendor
          </button>
        </div>
      </>
    )

  return (
    <ModalShell
      title={step === "search" ? "Adaugă vendor din library" : "Verifică datele vendorului"}
      subtitle={
        step === "search"
          ? "Caută în catalogul intern și pornește de la un prefill de compliance."
          : "Confirmă atributele contractuale înainte de a crea fișa de review."
      }
      footer={footer}
      onClose={onClose}
    >
      {step === "search" ? (
        <>
          <label className="cr-field">
            <span className="cr-field-label">Caută vendor</span>
            <div className="cr-vendor-review-search">
              <Search size={16} color="var(--ink-dim)" />
              <input
                value={query}
                onChange={(event) => {
                  setError(null)
                  setQuery(event.target.value)
                }}
                placeholder="Caută: OpenAI, ChatGPT, Claude, Mistral..."
                className="cr-input"
                autoFocus
              />
            </div>
          </label>

          {error && <div className="cr-alert cr-alert--danger">{error}</div>}

          {suggestions.length === 0 ? (
            <div className="cr-empty">
              <div>
                Nu am găsit niciun vendor pentru această căutare.
              </div>
            </div>
          ) : (
            <div className="cr-form-grid cr-vendor-review-form-grid cr-vendor-review-suggestions">
              {suggestions.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectLibrary(entry)}
                  disabled={busy}
                  className={`cr-client-card cr-vendor-review-suggestion${busy ? " cr-client-card--busy" : ""}`}
                >
                  <span className="cr-vendor-review-card__flag">{REGION_FLAG[entry.vendorRegion]}</span>
                  <div className="cr-vendor-review-card__identity">
                    <div className="cr-vendor-review-card__name">{entry.canonicalName}</div>
                    <div className="cr-vendor-review-card__meta">
                      <span>{entry.serviceCategory}</span>
                      {entry.complianceNote && (
                        <>
                          <span>·</span>
                          <span>{entry.complianceNote}</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {selected && (
            <div className="cr-alert cr-alert--info">
              <FileText size={16} />
              <div>
                <strong>Potrivire catalog:</strong> {selected.canonicalName} · {selected.serviceCategory} ·{" "}
                {selected.vendorRegion}
                {selected.complianceNote && (
                  <div className="cr-modal__subtitle">{selected.complianceNote}</div>
                )}
              </div>
            </div>
          )}

          {draft && (
            <div className="cr-form-grid cr-vendor-review-form-grid">
              <ModalField
                label="Nume *"
                value={draft.name ?? ""}
                onChange={(value) => setDraft({ ...draft, name: value })}
              />
              <ModalField
                label="Persoană juridică"
                value={draft.legalEntity ?? ""}
                onChange={(value) => setDraft({ ...draft, legalEntity: value })}
              />
              <ModalField
                label="Produs folosit"
                value={draft.productUsed ?? ""}
                onChange={(value) => setDraft({ ...draft, productUsed: value })}
              />
              <ModalField
                label="Email contact"
                value={draft.contactEmail ?? ""}
                onChange={(value) => setDraft({ ...draft, contactEmail: value })}
              />
              <ModalSelect
                label="Regiune"
                value={draft.vendorRegion ?? "unknown"}
                options={ALL_REGIONS.map((region) => ({
                  value: region,
                  label: `${REGION_FLAG[region]} ${region}`,
                }))}
                onChange={(value) => setDraft({ ...draft, vendorRegion: value as VendorRegion })}
              />
              <ModalSelect
                label="Rol"
                value={draft.role ?? "processor"}
                options={ALL_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }))}
                onChange={(value) => setDraft({ ...draft, role: value as VendorRole })}
              />
              <ModalField
                label="Categorie serviciu"
                value={draft.serviceCategory ?? ""}
                onChange={(value) => setDraft({ ...draft, serviceCategory: value })}
              />
              <ModalSelect
                label="Status DPA"
                value={draft.dpaStatus ?? "missing"}
                options={ALL_DPA.map((status) => ({ value: status, label: DPA_LABELS[status] }))}
                onChange={(value) => setDraft({ ...draft, dpaStatus: value as DPAStatus })}
              />
              <ModalField
                label="URL DPA"
                value={draft.dpaUrl ?? ""}
                onChange={(value) => setDraft({ ...draft, dpaUrl: value })}
              />
              <ModalSelect
                label="Mecanism transfer"
                value={draft.transferMechanism ?? "none"}
                options={ALL_TRANSFER.map((mechanism) => ({
                  value: mechanism,
                  label: TRANSFER_LABELS[mechanism],
                }))}
                onChange={(value) =>
                  setDraft({
                    ...draft,
                    transferMechanism: value as VendorTransferMechanism,
                  })
                }
              />
              <ModalTextarea
                label="Note"
                value={draft.notes ?? ""}
                onChange={(value) => setDraft({ ...draft, notes: value })}
              />
            </div>
          )}

          {error && <div className="cr-alert cr-alert--danger">{error}</div>}
        </>
      )}
    </ModalShell>
  )
}

function ModalShell({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  return (
    <div className="cr-modal-backdrop" onClick={onClose}>
      <div className="cr-modal cr-modal--lg" onClick={(event) => event.stopPropagation()}>
        <div className="cr-modal__header">
          <div>
            <h2 className="cr-modal__title">{title}</h2>
            <div className="cr-modal__subtitle">{subtitle}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cr-icon-button cr-modal__close"
            aria-label="Închide"
          >
            <X size={16} />
          </button>
        </div>
        <div className="cr-modal__body">{children}</div>
        {footer && <div className="cr-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}

function ModalField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="cr-field">
      <span className="cr-field-label">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="cr-input" />
    </label>
  )
}

function ModalTextarea({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="cr-field cr-field--span-2">
      <span className="cr-field-label">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="cr-input cr-vendor-review-textarea"
      />
    </label>
  )
}

function ModalSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: FieldOption[]
  onChange: (value: string) => void
}) {
  return (
    <label className="cr-field">
      <span className="cr-field-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="cr-input">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
