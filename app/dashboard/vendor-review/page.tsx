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

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Filter,
  Globe,
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

const STATUS_COLORS: Record<VendorReviewStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  needs_dpa: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  needs_transfer_review: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  needs_security_review: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  approved: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  rejected: { bg: "rgba(148,163,184,0.18)", fg: "#94a3b8" },
  expired: { bg: "rgba(248,113,113,0.20)", fg: "#ef4444" },
}

const RISK_COLORS: Record<VendorRiskLevel, { bg: string; fg: string }> = {
  minimal: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
  low: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  medium: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  high: { bg: "rgba(251,146,60,0.16)", fg: "#fb923c" },
  critical: { bg: "rgba(248,113,113,0.20)", fg: "#ef4444" },
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

const DPA_COLORS: Record<DPAStatus, { bg: string; fg: string }> = {
  not_required: { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" },
  missing: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  draft_received: { bg: "rgba(251,191,36,0.14)", fg: "#fbbf24" },
  negotiating: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  signed: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  expired: { bg: "rgba(248,113,113,0.20)", fg: "#ef4444" },
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
    <div style={pageWrap}>
      <div>
        <h1 style={pageTitle}>
          <Package size={20} color="#a855f7" />
          Vendor AI — DPA + Transfer + AI Terms
        </h1>
        <p style={pageSubtitle}>
          GDPR Art. 28 (processor) + AI Act vendor obligations · risk evaluator automat + finding
          emission · brief markdown export pentru DPO/audit
        </p>
      </div>

      <StatsBar summary={summary} />

      {lifecycle && lifecycle.reminderNote && (
        <div style={reminderBox}>
          <AlertTriangle size={16} color="#fbbf24" />
          <span>{lifecycle.reminderNote}</span>
        </div>
      )}

      {error && (
        <div style={errBox}>
          <XCircle size={16} />
          {error}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <FilterTabs filter={filter} onChange={setFilter} records={records} />
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>
          <Plus size={14} />
          Adaugă vendor
        </button>
      </div>

      {loading ? (
        <div style={loadingBox}>
          <Loader2 size={16} className="spin" />
          Se încarcă...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div style={list}>
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

function StatsBar({ summary }: { summary: VendorSummary | null }) {
  if (!summary) return null
  const items = [
    { label: "Total", value: summary.total, color: "#94a3b8" },
    { label: "Aprobat", value: summary.approved, color: "#10b981" },
    { label: "Necesită DPA", value: summary.needsDpa, color: "#f87171" },
    { label: "Risc ridicat", value: summary.highRisk + summary.criticalRisk, color: "#fb923c" },
  ]
  return (
    <div style={statsRow}>
      {items.map((s) => (
        <div key={s.label} style={statBox}>
          <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: s.color, marginTop: 4 }}>
            {s.value}
          </div>
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
    for (const r of records) {
      map.set(r.reviewStatus, (map.get(r.reviewStatus) ?? 0) + 1)
    }
    return map
  }, [records])

  const tabs: { value: FilterValue; label: string; count?: number }[] = [
    { value: "all", label: `Toate (${records.length})` },
    ...ALL_STATUSES.filter((s) => (counts.get(s) ?? 0) > 0).map((s) => ({
      value: s as FilterValue,
      label: `${STATUS_LABELS[s]} (${counts.get(s) ?? 0})`,
    })),
  ]

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <Filter size={13} color="var(--ink-dim)" />
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          style={filter === t.value ? tabActive : tabIdle}
        >
          {t.label}
        </button>
      ))}
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
    <div style={card}>
      <button onClick={onToggle} style={cardHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>{REGION_FLAG[record.vendorRegion]}</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              {record.name}
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
              {record.serviceCategory} · {ROLE_LABELS[record.role]}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Badge bg={DPA_COLORS[record.dpaStatus].bg} fg={DPA_COLORS[record.dpaStatus].fg}>
            DPA: {DPA_LABELS[record.dpaStatus]}
          </Badge>
          <Badge bg={RISK_COLORS[record.riskLevel].bg} fg={RISK_COLORS[record.riskLevel].fg}>
            Risc {RISK_LABELS[record.riskLevel]}
          </Badge>
          <Badge
            bg={STATUS_COLORS[record.reviewStatus].bg}
            fg={STATUS_COLORS[record.reviewStatus].fg}
          >
            {STATUS_LABELS[record.reviewStatus]}
          </Badge>
          {expanded ? (
            <ChevronUp size={14} color="var(--ink-dim)" />
          ) : (
            <ChevronDown size={14} color="var(--ink-dim)" />
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
    </div>
  )
}

function Badge({ children, bg, fg }: { children: React.ReactNode; bg: string; fg: string }) {
  return (
    <span
      style={{
        background: bg,
        color: fg,
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 6,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
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

  async function patchAITerms(key: keyof VendorAITerms, value: VendorAITerms[keyof VendorAITerms]) {
    await patch({ aiTerms: { ...record.aiTerms, [key]: value } })
  }

  return (
    <div style={detailBox}>
      {/* Identification */}
      <Section title="1. Identificare">
        <Field label="Persoană juridică" value={record.legalEntity ?? "—"} />
        <Field label="Produs folosit" value={record.productUsed || "—"} />
        <Field label="Email contact" value={record.contactEmail ?? "—"} />
        <Field
          label="Categorie serviciu"
          value={`${record.serviceCategory} · ${ROLE_LABELS[record.role]}`}
        />
        <Field
          label="Linkage"
          value={`${record.linkedAISystemIds.length} AI systems · ${record.linkedAIDataMapIds.length} AI data maps · ${record.linkedFindingIds.length} findings`}
        />
      </Section>

      {/* DPA */}
      <Section title="2. DPA (Art. 28 GDPR)">
        <SelectField
          label="Status DPA"
          value={record.dpaStatus}
          options={ALL_DPA.map((s) => ({ value: s, label: DPA_LABELS[s] }))}
          onChange={(v) => patch({ dpaStatus: v })}
          disabled={busy}
        />
        <Field label="URL DPA" value={record.dpaUrl ?? "—"} href={record.dpaUrl} />
        <Field label="Semnat la" value={fmtDateRO(record.dpaSignedAtISO)} />
        <Field label="Expiră la" value={fmtDateRO(record.dpaExpiresAtISO)} />
      </Section>

      {/* Transfer */}
      <Section title="3. Transfer internațional (Art. 44-49 GDPR)">
        <SelectField
          label="Regiune vendor"
          value={record.vendorRegion}
          options={ALL_REGIONS.map((r) => ({ value: r, label: `${REGION_FLAG[r]} ${r}` }))}
          onChange={(v) => patch({ vendorRegion: v })}
          disabled={busy}
        />
        <SelectField
          label="Mecanism transfer"
          value={record.transferMechanism}
          options={ALL_TRANSFER.map((m) => ({ value: m, label: TRANSFER_LABELS[m] }))}
          onChange={(v) => patch({ transferMechanism: v })}
          disabled={busy}
        />
        <Field label="Notă TIA" value={record.transferAssessmentNote ?? "—"} />
      </Section>

      {/* Subprocessors */}
      <Section title="4. Subprocesatori">
        <Field
          label="URL listă publică"
          value={record.subprocessorsUrl ?? "—"}
          href={record.subprocessorsUrl}
        />
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={fieldLabel}>Subprocesatori cunoscuți</div>
          {record.subprocessorsList.length > 0 ? (
            <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12, color: "var(--ink)" }}>
              {record.subprocessorsList.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <div style={fieldValue}>—</div>
          )}
        </div>
      </Section>

      {/* Security */}
      <Section title="5. Securitate (Art. 32 GDPR)">
        <Checkbox
          label="ISO 27001"
          checked={record.securityEvidence.iso27001}
          onChange={(v) => patchSecurity("iso27001", v)}
          disabled={busy}
        />
        <Checkbox
          label="SOC 2"
          checked={record.securityEvidence.soc2}
          onChange={(v) => patchSecurity("soc2", v)}
          disabled={busy}
        />
        <Checkbox
          label="Penetration test recent"
          checked={record.securityEvidence.penTestRecent}
          onChange={(v) => patchSecurity("penTestRecent", v)}
          disabled={busy}
        />
        <Checkbox
          label="Criptare în tranzit"
          checked={record.securityEvidence.encryptionInTransit}
          onChange={(v) => patchSecurity("encryptionInTransit", v)}
          disabled={busy}
        />
        <Checkbox
          label="Criptare at rest"
          checked={record.securityEvidence.encryptionAtRest}
          onChange={(v) => patchSecurity("encryptionAtRest", v)}
          disabled={busy}
        />
        <Checkbox
          label="MFA aplicat"
          checked={record.securityEvidence.mfaEnforced}
          onChange={(v) => patchSecurity("mfaEnforced", v)}
          disabled={busy}
        />
        <Checkbox
          label="Audit logs disponibile"
          checked={record.securityEvidence.auditLogsAvailable}
          onChange={(v) => patchSecurity("auditLogsAvailable", v)}
          disabled={busy}
        />
        <Field
          label="SLA notificare incident (ore)"
          value={record.securityEvidence.incidentNotificationCommitmentHours?.toString() ?? "—"}
        />
      </Section>

      {/* AI Terms */}
      <Section title="6. Termeni AI specifici">
        <SelectField
          label="Opt-out training"
          value={record.aiTerms.trainingDataOptOut}
          options={[
            { value: "yes", label: "Da" },
            { value: "no", label: "Nu" },
            { value: "default_opt_out", label: "Default opt-out" },
            { value: "unknown", label: "Necunoscut" },
          ]}
          onChange={(v) => patchAITerms("trainingDataOptOut", v as VendorAITerms["trainingDataOptOut"])}
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
          onChange={(v) => patchAITerms("inputDataRetention", v as VendorAITerms["inputDataRetention"])}
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
          onChange={(v) =>
            patchAITerms("outputRightsOwnership", v as VendorAITerms["outputRightsOwnership"])
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
          onChange={(v) => patchAITerms("modelTransparency", v as VendorAITerms["modelTransparency"])}
          disabled={busy}
        />
        <Checkbox
          label="Garanții reproducibility"
          checked={record.aiTerms.reproducibilityGuarantees}
          onChange={(v) => patchAITerms("reproducibilityGuarantees", v)}
          disabled={busy}
        />
      </Section>

      {/* Risk panel */}
      <Section title="7. Risc + motivare">
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
          <Badge bg={RISK_COLORS[record.riskLevel].bg} fg={RISK_COLORS[record.riskLevel].fg}>
            {RISK_LABELS[record.riskLevel]}
          </Badge>
          {record.humanReviewRequired && (
            <Badge bg="rgba(248,113,113,0.16)" fg="#f87171">
              Review uman cerut
            </Badge>
          )}
          {record.reviewedByEmail && (
            <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
              Reviewer: {record.reviewedByEmail} · {fmtDateRO(record.reviewedAtISO)}
            </span>
          )}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={fieldLabel}>Motivare risc</div>
          {record.riskReasons.length > 0 ? (
            <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12, color: "var(--ink)" }}>
              {record.riskReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <div style={fieldValue}>Fără risc detectat</div>
          )}
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field
            label="Următoarea revalidare"
            value={fmtDateRO(record.nextRevalidationISO)}
          />
        </div>
      </Section>

      {/* Linked findings */}
      {record.linkedFindingIds.length > 0 && (
        <Section title="8. Findings linkate">
          <div style={{ gridColumn: "1 / -1" }}>
            <ul style={{ margin: "4px 0", paddingLeft: 18, fontSize: 12 }}>
              {record.linkedFindingIds.map((fid) => (
                <li key={fid}>
                  <a
                    href={`/dashboard/resolve?finding=${fid}`}
                    style={{ color: "#60a5fa", textDecoration: "underline" }}
                  >
                    {fid}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Notes */}
      {record.notes && (
        <Section title="9. Note interne">
          <div style={{ gridColumn: "1 / -1", whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink)" }}>
            {record.notes}
          </div>
        </Section>
      )}

      {/* Actions */}
      <div style={actionsBar}>
        <button onClick={approve} disabled={busy || record.reviewStatus === "approved"} style={btnSuccess}>
          <CheckCircle2 size={13} />
          Aprobă
        </button>
        <button onClick={reject} disabled={busy || record.reviewStatus === "rejected"} style={btnDanger}>
          <XCircle size={13} />
          Respinge
        </button>
        <button onClick={onDownloadBrief} disabled={busy} style={btnGhost}>
          <Download size={13} />
          Descarcă brief .md
        </button>
        <button onClick={onDelete} disabled={busy} style={btnDanger}>
          <Trash2 size={13} />
          Șterge
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={section}>
      <h3 style={sectionTitle}>{title}</h3>
      <div style={sectionGrid}>{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  href,
}: {
  label: string
  value: string
  href?: string
}) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <div style={fieldValue}>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}
          >
            {value}
          </a>
        ) : (
          value
        )}
      </div>
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
  options: { value: string; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div>
      <div style={fieldLabel}>{label}</div>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={selectInput}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--ink)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: "#10b981" }}
      />
      {label}
    </label>
  )
}

function EmptyState({ filter }: { filter: FilterValue }) {
  return (
    <div style={emptyBox}>
      <ShieldCheck size={28} color="var(--ink-dim)" />
      <div style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 8 }}>
        {filter === "all"
          ? "Niciun vendor înregistrat încă. Începe cu library prefill pentru OpenAI, Anthropic, Mistral etc."
          : "Niciun vendor în această categorie."}
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

  // Load initial catalog
  useEffect(() => {
    void fetch("/api/vendor-review/library")
      .then((r) => r.json())
      .then((d: { vendors: VendorLibraryEntry[] }) => setSuggestions(d.vendors ?? []))
  }, [])

  // Search debounced
  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(async () => {
      const res = await fetch(`/api/vendor-review/library?q=${encodeURIComponent(query)}`)
      const d = (await res.json()) as { vendors: VendorLibraryEntry[] }
      setSuggestions(d.vendors ?? [])
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  async function selectLibrary(entry: VendorLibraryEntry) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/vendor-review/library?prefill=${encodeURIComponent(entry.id)}`,
      )
      const data = (await res.json()) as PrefillResponse
      setSelected(entry)
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
    setStep("review")
  }

  async function save() {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/vendor-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({ error: "Eroare necunoscută" }))) as {
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

  return (
    <ModalShell title={step === "search" ? "Adaugă vendor — alege din library" : "Verifică datele"} onClose={onClose}>
      {step === "search" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={searchBox}>
            <Search size={14} color="var(--ink-dim)" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută: OpenAI, ChatGPT, Claude, Mistral..."
              style={searchInput}
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxHeight: 360, overflowY: "auto" }}>
            {suggestions.map((e) => (
              <button
                key={e.id}
                onClick={() => selectLibrary(e)}
                disabled={busy}
                style={vendorTile}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{REGION_FLAG[e.vendorRegion]}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.canonicalName}</span>
                </div>
                <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
                  {e.serviceCategory}
                </span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
            <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>
              Vendorul nu e în catalog? Continuă manual.
            </span>
            <button onClick={selectManual} style={btnGhost}>
              <Plus size={13} />
              Adaugă manual
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {selected && (
            <div style={infoBox}>
              <FileText size={14} color="#60a5fa" />
              <div>
                <strong>Match library:</strong> {selected.canonicalName} · {selected.serviceCategory} · {selected.vendorRegion}
                <br />
                <span style={{ fontSize: 11, color: "var(--ink-dim)" }}>{selected.complianceNote}</span>
              </div>
            </div>
          )}

          {draft && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <ModalField label="Nume *" value={draft.name ?? ""} onChange={(v) => setDraft({ ...draft, name: v })} />
              <ModalField label="Persoană juridică" value={draft.legalEntity ?? ""} onChange={(v) => setDraft({ ...draft, legalEntity: v })} />
              <ModalField label="Produs folosit" value={draft.productUsed ?? ""} onChange={(v) => setDraft({ ...draft, productUsed: v })} />
              <ModalField label="Email contact" value={draft.contactEmail ?? ""} onChange={(v) => setDraft({ ...draft, contactEmail: v })} />
              <ModalSelect
                label="Regiune"
                value={draft.vendorRegion ?? "unknown"}
                options={ALL_REGIONS.map((r) => ({ value: r, label: `${REGION_FLAG[r]} ${r}` }))}
                onChange={(v) => setDraft({ ...draft, vendorRegion: v as VendorRegion })}
              />
              <ModalSelect
                label="Rol"
                value={draft.role ?? "processor"}
                options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
                onChange={(v) => setDraft({ ...draft, role: v as VendorRole })}
              />
              <ModalField
                label="Categorie serviciu"
                value={draft.serviceCategory ?? ""}
                onChange={(v) => setDraft({ ...draft, serviceCategory: v })}
              />
              <ModalSelect
                label="Status DPA"
                value={draft.dpaStatus ?? "missing"}
                options={ALL_DPA.map((s) => ({ value: s, label: DPA_LABELS[s] }))}
                onChange={(v) => setDraft({ ...draft, dpaStatus: v as DPAStatus })}
              />
              <ModalField label="URL DPA" value={draft.dpaUrl ?? ""} onChange={(v) => setDraft({ ...draft, dpaUrl: v })} />
              <ModalSelect
                label="Mecanism transfer"
                value={draft.transferMechanism ?? "none"}
                options={ALL_TRANSFER.map((m) => ({ value: m, label: TRANSFER_LABELS[m] }))}
                onChange={(v) => setDraft({ ...draft, transferMechanism: v as VendorTransferMechanism })}
              />
              <div style={{ gridColumn: "1 / -1" }}>
                <ModalTextarea label="Note" value={draft.notes ?? ""} onChange={(v) => setDraft({ ...draft, notes: v })} />
              </div>
            </div>
          )}

          {error && <div style={errBox}>{error}</div>}

          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-soft)", paddingTop: 12 }}>
            <button onClick={() => setStep("search")} disabled={busy} style={btnGhost}>
              Înapoi
            </button>
            <button onClick={save} disabled={busy || !draft?.name} style={btnPrimary}>
              {busy ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />}
              Salvează vendor
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalContent} onClick={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: "var(--ink)" }}>{title}</h2>
          <button onClick={onClose} style={modalClose} aria-label="Închide">
            <X size={16} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
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
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={fieldLabel}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={textInput}
      />
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
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={fieldLabel}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        style={{ ...textInput, fontFamily: "var(--font-sans)", resize: "vertical" }}
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
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={fieldLabel}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectInput}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Styles
// ────────────────────────────────────────────────────────────────────────────

const pageWrap: React.CSSProperties = {
  padding: 32,
  maxWidth: 1100,
  display: "flex",
  flexDirection: "column",
  gap: 24,
}

const pageTitle: React.CSSProperties = {
  fontFamily: "var(--font-display-v3)",
  fontSize: 22,
  fontWeight: 600,
  color: "var(--ink)",
  margin: 0,
  letterSpacing: "-0.02em",
  display: "flex",
  alignItems: "center",
  gap: 10,
}

const pageSubtitle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--ink-muted)",
  marginTop: 6,
}

const statsRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 12,
}

const statBox: React.CSSProperties = {
  padding: 14,
  background: "var(--bg-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: 8,
}

const reminderBox: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "10px 14px",
  background: "rgba(251,191,36,0.08)",
  border: "1px solid rgba(251,191,36,0.2)",
  borderRadius: 8,
  color: "#fbbf24",
  fontSize: 12,
}

const errBox: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "10px 14px",
  background: "rgba(248,113,113,0.08)",
  border: "1px solid rgba(248,113,113,0.2)",
  borderRadius: 8,
  color: "#f87171",
  fontSize: 12,
  alignItems: "center",
}

const loadingBox: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  padding: 24,
  color: "var(--ink-dim)",
  fontSize: 13,
}

const emptyBox: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: 40,
  border: "1px dashed var(--border-soft)",
  borderRadius: 10,
  background: "var(--bg-card)",
}

const list: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
}

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-soft)",
  borderRadius: 8,
  overflow: "hidden",
}

const cardHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: "12px 16px",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
}

const detailBox: React.CSSProperties = {
  padding: 18,
  borderTop: "1px solid var(--border-soft)",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  background: "rgba(15,23,42,0.04)",
}

const section: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--ink-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  margin: 0,
}

const sectionGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: 12,
}

const fieldLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const fieldValue: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ink)",
  marginTop: 2,
}

const textInput: React.CSSProperties = {
  padding: "7px 10px",
  fontSize: 13,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--ink)",
  outline: "none",
}

const selectInput: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: 12,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--ink)",
  marginTop: 4,
  width: "100%",
}

const searchBox: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 12px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 6,
}

const searchInput: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--ink)",
  fontSize: 13,
}

const vendorTile: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: 12,
  background: "var(--bg)",
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  cursor: "pointer",
  textAlign: "left",
  color: "var(--ink)",
}

const infoBox: React.CSSProperties = {
  display: "flex",
  gap: 10,
  padding: "10px 12px",
  background: "rgba(96,165,250,0.08)",
  border: "1px solid rgba(96,165,250,0.16)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--ink)",
}

const tabIdle: React.CSSProperties = {
  padding: "6px 12px",
  background: "transparent",
  border: "1px solid var(--border-soft)",
  borderRadius: 6,
  color: "var(--ink-dim)",
  fontSize: 12,
  cursor: "pointer",
}

const tabActive: React.CSSProperties = {
  padding: "6px 12px",
  background: "rgba(168,85,247,0.16)",
  border: "1px solid rgba(168,85,247,0.3)",
  borderRadius: 6,
  color: "#a855f7",
  fontSize: 12,
  cursor: "pointer",
  fontWeight: 500,
}

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 6,
  border: "1px solid transparent",
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
}

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: "#a855f7",
  color: "#fff",
}

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  borderColor: "var(--border)",
  color: "var(--ink)",
}

const btnSuccess: React.CSSProperties = {
  ...btnBase,
  background: "rgba(52,211,153,0.16)",
  color: "#10b981",
  borderColor: "rgba(52,211,153,0.3)",
}

const btnDanger: React.CSSProperties = {
  ...btnBase,
  background: "rgba(248,113,113,0.14)",
  color: "#f87171",
  borderColor: "rgba(248,113,113,0.3)",
}

const actionsBar: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  padding: "12px 0 0",
  borderTop: "1px solid var(--border-soft)",
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  zIndex: 100,
}

const modalContent: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  overflowY: "auto",
}

const modalHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 18px",
  borderBottom: "1px solid var(--border-soft)",
}

const modalClose: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "var(--ink-dim)",
  cursor: "pointer",
  padding: 4,
}
