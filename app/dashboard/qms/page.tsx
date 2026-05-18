"use client"

/**
 * Sprint 021 — /dashboard/qms
 *
 * UI mature pentru QMS Workspace (Art. 17 EU AI Act umbrella module pentru
 * providers of high-risk AI systems):
 *  - Top card: organization size + simplified mode toggle + version + approval
 *    status + next review countdown
 *  - Stats bar (totale sectiuni / documentate / aprobate / needs_update /
 *    lessons / attestations / high-risk fara attestation)
 *  - 4 tab-uri:
 *      Sections — 13 carduri (a)-(m) cu inline edit + attach docs + status
 *      Lessons Learned — aggregated + manual + "Refresh auto" + "Adauga lectie"
 *      System Attestations — matrice sisteme × sectiuni; modal attest
 *      Cross-module Health — dashboard cross-module + gap-uri
 *  - "Aproba QMS" button → modal approve
 *  - Export MD/JSON button (top-right) → GET /api/qms/export?format=md|json
 *
 * Style: inline + v3 design tokens (no shadcn / no Tailwind).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import Link from "next/link"
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileBadge,
  FileText,
  FolderCheck,
  Lightbulb,
  Link2,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import {
  QMS_COMPLETENESS_LABELS,
  QMS_DOCUMENT_TYPE_LABELS,
  QMS_LESSON_SOURCE_LABELS,
  QMS_ORGANIZATION_SIZE_LABELS,
  QMS_SCHEMA_V1,
  QMS_SECTION_STATUS_LABELS,
  QMS_WORKSPACE_STATUS_LABELS,
} from "@/lib/compliance/qms-schema"
import type {
  AISystemRecord,
  QmsCompleteness,
  QmsDocumentReferenceType,
  QmsOrganizationSize,
  QmsSectionContent,
  QmsSectionKey,
  QmsSectionStatus,
  QmsSystemAttestation,
  QmsWorkspace,
  QmsWorkspaceStatus,
} from "@/lib/compliance/types"
import type { QmsSummary } from "@/lib/server/qms-store"

const STATUS_COLORS: Record<QmsSectionStatus, { bg: string; fg: string }> = {
  not_started: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_progress: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa" },
  documented: { bg: "rgba(52,211,153,0.18)", fg: "#10b981" },
  approved: { bg: "rgba(52,211,153,0.32)", fg: "#34d399" },
  needs_update: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
}

const COMPLETENESS_COLORS: Record<QmsCompleteness, { bg: string; fg: string }> = {
  incomplete: { bg: "rgba(248,113,113,0.18)", fg: "#f87171" },
  partial: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24" },
  complete: { bg: "rgba(52,211,153,0.24)", fg: "#10b981" },
}

const WORKSPACE_STATUS_COLORS: Record<QmsWorkspaceStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(96,165,250,0.18)", fg: "#60a5fa" },
  approved: { bg: "rgba(52,211,153,0.24)", fg: "#10b981" },
  obsolete: { bg: "rgba(148,163,184,0.10)", fg: "#94a3b8" },
}

const DOC_TYPE_OPTIONS: QmsDocumentReferenceType[] = [
  "policy",
  "procedure",
  "standard",
  "specification",
  "template",
  "report",
  "audit_record",
  "other",
]

const SECTION_STATUS_OPTIONS: QmsSectionStatus[] = [
  "not_started",
  "in_progress",
  "documented",
  "approved",
  "needs_update",
]

const ORG_SIZE_OPTIONS: QmsOrganizationSize[] = ["sme", "midsize", "large"]

type TabKey = "sections" | "lessons" | "attestations" | "health"

export default function QmsPage() {
  const [workspace, setWorkspace] = useState<QmsWorkspace | null>(null)
  const [summary, setSummary] = useState<QmsSummary | null>(null)
  const [systems, setSystems] = useState<AISystemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<TabKey>("sections")
  const [expandedSectionKey, setExpandedSectionKey] = useState<QmsSectionKey | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showAttachDocFor, setShowAttachDocFor] = useState<QmsSectionKey | null>(null)
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [showAttestModal, setShowAttestModal] = useState<string | null>(null)
  const [errorBanner, setErrorBanner] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [qmsRes, sysRes] = await Promise.all([
        fetch("/api/qms"),
        fetch("/api/ai-systems"),
      ])
      if (qmsRes.ok) {
        const data = await qmsRes.json()
        setWorkspace(data.workspace ?? null)
        setSummary(data.summary ?? null)
      }
      if (sysRes.ok) {
        const data = await sysRes.json()
        setSystems((data.systems ?? []) as AISystemRecord[])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function initQms() {
    setBusy(true)
    try {
      const res = await fetch("/api/qms", { method: "POST" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorBanner(data.error ?? "Nu am putut inițializa QMS.")
      } else {
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  async function patchSection(sectionKey: QmsSectionKey, patch: Record<string, unknown>) {
    setBusy(true)
    setErrorBanner(null)
    try {
      const res = await fetch(`/api/qms/section/${sectionKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorBanner(data.error ?? "Nu am putut actualiza secțiunea.")
      } else {
        await load()
      }
    } finally {
      setBusy(false)
    }
  }

  async function toggleSimplifiedMode(next: boolean) {
    setBusy(true)
    try {
      await fetch("/api/qms/simplified-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simplifiedMode: next }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function changeOrgSize(next: QmsOrganizationSize) {
    setBusy(true)
    try {
      await fetch("/api/qms/org-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationSize: next }),
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function refreshAuto() {
    setBusy(true)
    try {
      await fetch("/api/qms/lessons?refresh=auto", { method: "POST" })
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function removeDoc(sectionKey: QmsSectionKey, docId: string) {
    if (!confirm("Sigur ștergi documentul?")) return
    setBusy(true)
    try {
      await fetch(
        `/api/qms/document?sectionKey=${encodeURIComponent(sectionKey)}&docId=${encodeURIComponent(docId)}`,
        { method: "DELETE" },
      )
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function revokeAtt(systemId: string) {
    if (!confirm("Sigur revoci atestarea pentru acest sistem?")) return
    setBusy(true)
    try {
      await fetch(`/api/qms/system-attestation?systemId=${encodeURIComponent(systemId)}`, {
        method: "DELETE",
      })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const highRiskSystems = useMemo(
    () => systems.filter((s) => s.riskLevel === "high"),
    [systems],
  )

  if (loading) {
    return (
      <div style={pageStyle}>
        <Header />
        <p style={{ color: "var(--ink-dim)", fontSize: "13px" }}>Se încarcă...</p>
      </div>
    )
  }
  if (!workspace) {
    return (
      <div style={pageStyle}>
        <Header />
        <div
          style={{
            ...cardStyle,
            padding: "32px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <FileBadge size={48} style={{ color: "var(--cobalt-400)" }} />
          <h2 style={{ ...sectionTitle, textAlign: "center" }}>
            QMS Workspace neinițializat
          </h2>
          <p style={{ color: "var(--ink-dim)", fontSize: "13px", maxWidth: "600px" }}>
            QMS-ul (Sistem Management Calitate, Art. 17 EU AI Act) este umbrella
            module pentru providerii de sisteme AI high-risk. Reprezintă 13
            secțiuni documentate (a)-(m).
          </p>
          <button type="button" onClick={initQms} disabled={busy} style={primaryButton}>
            {busy ? <Loader2 size={14} /> : <FileBadge size={14} />}
            Inițializează QMS Workspace
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <Header />
      {errorBanner && (
        <div style={errorBannerStyle}>
          <ShieldAlert size={14} />
          <span style={{ flex: 1 }}>{errorBanner}</span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            style={iconButton}
            aria-label="Închide"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <TopCard
        workspace={workspace}
        summary={summary}
        busy={busy}
        onToggleSimplified={toggleSimplifiedMode}
        onChangeOrgSize={changeOrgSize}
        onApprove={() => setShowApproveModal(true)}
      />

      <StatsBar summary={summary} highRiskCount={highRiskSystems.length} />

      <div style={tabsContainer}>
        <button type="button" onClick={() => setTab("sections")} style={tabButton(tab === "sections")}>
          <FolderCheck size={13} /> Secțiuni Art. 17(1)(a)-(m)
        </button>
        <button type="button" onClick={() => setTab("lessons")} style={tabButton(tab === "lessons")}>
          <Lightbulb size={13} /> Lecții ({workspace.lessonsLearned.length})
        </button>
        <button type="button" onClick={() => setTab("attestations")} style={tabButton(tab === "attestations")}>
          <Award size={13} /> Atestări sisteme ({workspace.systemAttestations.length})
        </button>
        <button type="button" onClick={() => setTab("health")} style={tabButton(tab === "health")}>
          <Link2 size={13} /> Cross-module health
        </button>
        <div style={{ flex: 1 }} />
        <a href="/api/qms/export?format=md" target="_blank" rel="noreferrer" style={exportButton}>
          <Download size={13} /> Export MD
        </a>
        <a href="/api/qms/export?format=json" target="_blank" rel="noreferrer" style={exportButton}>
          <Download size={13} /> Export JSON
        </a>
      </div>

      {tab === "sections" && (
        <SectionsTab
          workspace={workspace}
          busy={busy}
          expandedSectionKey={expandedSectionKey}
          setExpandedSectionKey={setExpandedSectionKey}
          onPatchSection={patchSection}
          onOpenAttachDoc={(k) => setShowAttachDocFor(k)}
          onRemoveDoc={removeDoc}
        />
      )}
      {tab === "lessons" && (
        <LessonsTab
          workspace={workspace}
          systems={systems}
          busy={busy}
          onRefreshAuto={refreshAuto}
          onOpenAddLesson={() => setShowAddLessonModal(true)}
        />
      )}
      {tab === "attestations" && (
        <AttestationsTab
          workspace={workspace}
          systems={systems}
          highRiskSystems={highRiskSystems}
          busy={busy}
          onOpenAttest={(sysId) => setShowAttestModal(sysId)}
          onRevoke={revokeAtt}
        />
      )}
      {tab === "health" && <HealthTab workspace={workspace} highRiskCount={highRiskSystems.length} />}

      {showApproveModal && (
        <ApproveModal
          onClose={() => setShowApproveModal(false)}
          onApproved={async () => {
            setShowApproveModal(false)
            await load()
          }}
        />
      )}
      {showAttachDocFor && (
        <AttachDocModal
          sectionKey={showAttachDocFor}
          onClose={() => setShowAttachDocFor(null)}
          onAttached={async () => {
            setShowAttachDocFor(null)
            await load()
          }}
        />
      )}
      {showAddLessonModal && (
        <AddLessonModal
          systems={systems}
          onClose={() => setShowAddLessonModal(false)}
          onAdded={async () => {
            setShowAddLessonModal(false)
            await load()
          }}
        />
      )}
      {showAttestModal && (
        <AttestModal
          systemId={showAttestModal}
          systemName={systems.find((s) => s.id === showAttestModal)?.name ?? showAttestModal}
          existingAttestation={workspace.systemAttestations.find((a) => a.systemId === showAttestModal)}
          onClose={() => setShowAttestModal(null)}
          onAttested={async () => {
            setShowAttestModal(null)
            await load()
          }}
        />
      )}
    </div>
  )
}

function Header() {
  return (
    <div>
      <h1 style={pageTitleStyle}>QMS — Sistem Management Calitate</h1>
      <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
        Art. 17 EU AI Act · umbrella module pentru providers of high-risk AI systems · 13 secțiuni
        documentate (a)-(m) + lessons learned + per-system attestations
      </p>
    </div>
  )
}

function TopCard({
  workspace,
  summary,
  busy,
  onToggleSimplified,
  onChangeOrgSize,
  onApprove,
}: {
  workspace: QmsWorkspace
  summary: QmsSummary | null
  busy: boolean
  onToggleSimplified: (next: boolean) => void
  onChangeOrgSize: (next: QmsOrganizationSize) => void
  onApprove: () => void
}) {
  const sc = WORKSPACE_STATUS_COLORS[workspace.status]
  const cc = COMPLETENESS_COLORS[workspace.completeness]
  return (
    <div style={cardStyle}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          padding: "16px 20px",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "240px" }}>
          <div style={smallLabel}>Versiune QMS</div>
          <div style={{ ...big, fontFamily: "var(--font-mono-v3)" }}>{workspace.versionLabel}</div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <span style={pill(sc.bg, sc.fg)}>{QMS_WORKSPACE_STATUS_LABELS[workspace.status]}</span>
            <span style={pill(cc.bg, cc.fg)}>{QMS_COMPLETENESS_LABELS[workspace.completeness]}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "200px" }}>
          <div style={smallLabel}>Mărime organizație (Art. 17(2))</div>
          <select
            disabled={busy}
            value={workspace.organizationSize}
            onChange={(e) => onChangeOrgSize(e.target.value as QmsOrganizationSize)}
            style={selectStyle}
          >
            {ORG_SIZE_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {QMS_ORGANIZATION_SIZE_LABELS[o]}
              </option>
            ))}
          </select>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              color: "var(--ink-muted)",
              marginTop: "4px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={workspace.simplifiedMode}
              onChange={(e) => onToggleSimplified(e.target.checked)}
              disabled={busy}
            />
            Mod simplificat (Art. 17(3) SME)
          </label>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "200px" }}>
          <div style={smallLabel}>Aprobare</div>
          {workspace.approvedAtISO ? (
            <>
              <div style={{ fontSize: "12px", color: "var(--ink)" }}>
                Aprobat: {new Date(workspace.approvedAtISO).toLocaleDateString("ro-RO")}
              </div>
              <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                de {workspace.approvedByEmail ?? "—"}
              </div>
              {workspace.nextReviewISO && (
                <div style={{ fontSize: "11px", color: "var(--amber-400)" }}>
                  Următor review: {new Date(workspace.nextReviewISO).toLocaleDateString("ro-RO")}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>QMS neaprobat</div>
          )}
        </div>

        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
          {summary && (
            <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
              {summary.highRiskSystemsCount} sistem(e) high-risk ·{" "}
              {summary.highRiskSystemsWithoutAttestation} fără attestation
            </div>
          )}
          <button
            type="button"
            onClick={onApprove}
            style={{
              ...primaryButton,
              background:
                workspace.completeness === "complete" ? "var(--emerald-400)" : "var(--bg-raised)",
              color:
                workspace.completeness === "complete" ? "var(--inverse)" : "var(--ink)",
              border:
                workspace.completeness === "complete"
                  ? "1px solid var(--emerald-400)"
                  : "1px solid var(--border)",
            }}
            disabled={busy}
          >
            <ShieldCheck size={14} /> Aprobă QMS
          </button>
        </div>
      </div>
    </div>
  )
}

function StatsBar({
  summary,
  highRiskCount,
}: {
  summary: QmsSummary | null
  highRiskCount: number
}) {
  if (!summary) return null
  const items: Array<{ label: string; value: number; color?: string }> = [
    { label: "Total secțiuni", value: summary.totalSections },
    { label: "Documentate", value: summary.documentedSections },
    { label: "Aprobate", value: summary.approvedSections },
    {
      label: "Necesită update",
      value: summary.needsUpdateSections,
      color: summary.needsUpdateSections > 0 ? "#fbbf24" : undefined,
    },
    { label: "Lessons", value: summary.lessonsLearnedCount },
    { label: `Atestări (${highRiskCount} hr)`, value: summary.systemAttestationsCount },
    {
      label: "HR fără attest.",
      value: summary.highRiskSystemsWithoutAttestation,
      color: summary.highRiskSystemsWithoutAttestation > 0 ? "#f87171" : "#10b981",
    },
  ]
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
      {items.map((it) => (
        <div key={it.label} style={statCardStyle}>
          <div style={smallLabel}>{it.label}</div>
          <div style={{ ...big, color: it.color ?? "var(--ink)" }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

function SectionsTab({
  workspace,
  busy,
  expandedSectionKey,
  setExpandedSectionKey,
  onPatchSection,
  onOpenAttachDoc,
  onRemoveDoc,
}: {
  workspace: QmsWorkspace
  busy: boolean
  expandedSectionKey: QmsSectionKey | null
  setExpandedSectionKey: (k: QmsSectionKey | null) => void
  onPatchSection: (k: QmsSectionKey, patch: Record<string, unknown>) => Promise<void>
  onOpenAttachDoc: (k: QmsSectionKey) => void
  onRemoveDoc: (k: QmsSectionKey, docId: string) => Promise<void>
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {workspace.sections.map((section) => {
        const schemaSec = QMS_SCHEMA_V1.sections.find((s) => s.key === section.key)
        if (!schemaSec) return null
        const isAdvanced = schemaSec.tier === "advanced"
        if (workspace.simplifiedMode && isAdvanced) return null
        const expanded = expandedSectionKey === section.key
        const sc = STATUS_COLORS[section.status]
        return (
          <div key={section.key} style={cardStyle}>
            <div
              onClick={() => setExpandedSectionKey(expanded ? null : section.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-mono-v3)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--cobalt-400)",
                }}
              >
                {schemaSec.letter}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                  {schemaSec.displayLabel}
                </div>
                <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                  {schemaSec.articleRef} · tier: {isAdvanced ? "advanced" : "essential"} ·{" "}
                  {section.documentReferences.length} doc(s)
                </div>
              </div>
              <span style={pill(sc.bg, sc.fg)}>
                {QMS_SECTION_STATUS_LABELS[section.status]}
              </span>
              {expanded ? (
                <ChevronUp size={14} style={{ color: "var(--ink-dim)" }} />
              ) : (
                <ChevronDown size={14} style={{ color: "var(--ink-dim)" }} />
              )}
            </div>
            {expanded && (
              <SectionEditor
                section={section}
                schemaSec={schemaSec}
                busy={busy}
                onPatch={(p) => onPatchSection(section.key, p)}
                onAttachDoc={() => onOpenAttachDoc(section.key)}
                onRemoveDoc={(docId) => onRemoveDoc(section.key, docId)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function SectionEditor({
  section,
  schemaSec,
  busy,
  onPatch,
  onAttachDoc,
  onRemoveDoc,
}: {
  section: QmsSectionContent
  schemaSec: {
    displayLabel: string
    description: string
    articleRef: string
    suggestedDocuments: string[]
  }
  busy: boolean
  onPatch: (patch: Record<string, unknown>) => Promise<void>
  onAttachDoc: () => void
  onRemoveDoc: (docId: string) => Promise<void>
}) {
  const [description, setDescription] = useState(section.description)
  const [procedureSummary, setProcedureSummary] = useState(section.procedureSummary)
  const [responsibleRole, setResponsibleRole] = useState(section.responsibleRole)
  const [responsibleEmail, setResponsibleEmail] = useState(section.responsibleEmail ?? "")
  const [notes, setNotes] = useState(section.notes ?? "")

  useEffect(() => {
    setDescription(section.description)
    setProcedureSummary(section.procedureSummary)
    setResponsibleRole(section.responsibleRole)
    setResponsibleEmail(section.responsibleEmail ?? "")
    setNotes(section.notes ?? "")
  }, [section])

  async function save() {
    await onPatch({ description, procedureSummary, responsibleRole, responsibleEmail, notes })
  }

  return (
    <div
      style={{
        borderTop: "1px solid var(--border)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
        {schemaSec.description}
      </p>

      <div style={fieldGrid}>
        <Field label="Descriere narrativă (min 30 caractere)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={textareaStyle}
            rows={4}
            disabled={busy}
            placeholder="Cum este îndeplinită această secțiune..."
          />
        </Field>
        <Field label="Procedură step-by-step (min 30 caractere)">
          <textarea
            value={procedureSummary}
            onChange={(e) => setProcedureSummary(e.target.value)}
            style={textareaStyle}
            rows={4}
            disabled={busy}
            placeholder="Pașii procedurali aplicați..."
          />
        </Field>
      </div>

      <div style={fieldGrid}>
        <Field label="Rol responsabil (ex: Quality Manager)">
          <input
            type="text"
            value={responsibleRole}
            onChange={(e) => setResponsibleRole(e.target.value)}
            style={inputStyle}
            disabled={busy}
          />
        </Field>
        <Field label="Email responsabil">
          <input
            type="email"
            value={responsibleEmail}
            onChange={(e) => setResponsibleEmail(e.target.value)}
            style={inputStyle}
            disabled={busy}
          />
        </Field>
      </div>

      <Field label="Note suplimentare (opțional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={textareaStyle}
          rows={2}
          disabled={busy}
        />
      </Field>

      {(section.linkedRopaActivityCount !== undefined ||
        section.linkedAIDataMapCount !== undefined ||
        section.linkedDpiaCount !== undefined ||
        section.linkedFriaCount !== undefined ||
        section.linkedFindingCount !== undefined ||
        section.linkedPmmPlanCount !== undefined ||
        section.linkedAIIncidentCount !== undefined ||
        section.linkedLoggingConfigCount !== undefined) && (
        <div
          style={{
            background: "var(--bg-raised)",
            borderRadius: "8px",
            padding: "10px 12px",
            border: "1px solid var(--border)",
          }}
        >
          <div style={smallLabel}>Cross-module references (auto-populate)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
            {section.linkedRopaActivityCount !== undefined && (
              <RefBadge label="RoPA" value={section.linkedRopaActivityCount} href="/dashboard/ropa" />
            )}
            {section.linkedAIDataMapCount !== undefined && (
              <RefBadge label="AI Data Map" value={section.linkedAIDataMapCount} href="/dashboard/ropa" />
            )}
            {section.linkedDpiaCount !== undefined && (
              <RefBadge label="DPIA" value={section.linkedDpiaCount} href="/dashboard/dpia" />
            )}
            {section.linkedFriaCount !== undefined && (
              <RefBadge label="FRIA" value={section.linkedFriaCount} href="/dashboard/fria" />
            )}
            {section.linkedFindingCount !== undefined && (
              <RefBadge label="Findings (open)" value={section.linkedFindingCount} href="/dashboard/resolve" />
            )}
            {section.linkedPmmPlanCount !== undefined && (
              <RefBadge label="PMM" value={section.linkedPmmPlanCount} href="/dashboard/post-market-monitoring" />
            )}
            {section.linkedAIIncidentCount !== undefined && (
              <RefBadge label="AI Incidents" value={section.linkedAIIncidentCount} href="/dashboard/ai-incidents" />
            )}
            {section.linkedLoggingConfigCount !== undefined && (
              <RefBadge label="Logging" value={section.linkedLoggingConfigCount} href="/dashboard/logging-evidence" />
            )}
          </div>
        </div>
      )}

      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div style={smallLabel}>Documente atașate ({section.documentReferences.length})</div>
          <button type="button" onClick={onAttachDoc} style={secondaryButton} disabled={busy}>
            <Plus size={12} /> Atașează document
          </button>
        </div>
        {section.documentReferences.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--ink-dim)", padding: "8px 0" }}>
            Nicio dovadă atașată. Sugestii: {schemaSec.suggestedDocuments.slice(0, 2).join("; ")}.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {section.documentReferences.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 10px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                <FileText size={12} style={{ color: "var(--cobalt-400)" }} />
                <span style={{ fontWeight: 500, color: "var(--ink)" }}>{d.title}</span>
                <span style={{ color: "var(--ink-dim)" }}>
                  · {QMS_DOCUMENT_TYPE_LABELS[d.type]}
                  {d.versionLabel ? ` · ${d.versionLabel}` : ""}
                </span>
                <span style={{ flex: 1 }} />
                {d.url && (
                  <a href={d.url} target="_blank" rel="noreferrer" style={{ color: "var(--cobalt-400)" }}>
                    link
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveDoc(d.id)}
                  style={iconButton}
                  aria-label="Șterge document"
                  disabled={busy}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={smallLabel}>Status:</div>
        {SECTION_STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPatch({ status: s })}
            disabled={busy || section.status === s}
            style={{ ...secondaryButton, opacity: section.status === s ? 0.5 : 1 }}
          >
            {QMS_SECTION_STATUS_LABELS[s]}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" onClick={save} style={primaryButton} disabled={busy}>
          {busy ? <Loader2 size={12} /> : <CheckCircle2 size={12} />}
          Salvează
        </button>
      </div>
    </div>
  )
}

function RefBadge({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "6px",
        background: value > 0 ? "rgba(96,165,250,0.14)" : "rgba(148,163,184,0.10)",
        color: value > 0 ? "#60a5fa" : "#94a3b8",
        fontSize: "11px",
        fontWeight: 500,
        textDecoration: "none",
      }}
    >
      {label}: {value}
    </span>
  )
  if (href && value > 0) {
    return (
      <Link href={href} style={{ textDecoration: "none" }}>
        {body}
      </Link>
    )
  }
  return body
}

function LessonsTab({
  workspace,
  systems,
  busy,
  onRefreshAuto,
  onOpenAddLesson,
}: {
  workspace: QmsWorkspace
  systems: AISystemRecord[]
  busy: boolean
  onRefreshAuto: () => Promise<void>
  onOpenAddLesson: () => void
}) {
  const sysById = new Map<string, AISystemRecord>()
  for (const s of systems) sysById.set(s.id, s)
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          justifyContent: "flex-end",
        }}
      >
        <button type="button" onClick={onRefreshAuto} style={secondaryButton} disabled={busy}>
          {busy ? <Loader2 size={12} /> : <BookOpen size={12} />}
          Sincronizează auto (din incidente + PMM + findings)
        </button>
        <button type="button" onClick={onOpenAddLesson} style={primaryButton} disabled={busy}>
          <Plus size={12} /> Adaugă lecție manuală
        </button>
      </div>
      {workspace.lessonsLearned.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            padding: "32px",
            textAlign: "center",
            color: "var(--ink-dim)",
            fontSize: "13px",
          }}
        >
          Nicio lecție înregistrată. Apasă „Sincronizează auto\" pentru a aduce lecții din incidente AI
          închise, anomalii PMM rezolvate (high/critical) și findings critical rezolvate.
        </div>
      ) : (
        workspace.lessonsLearned.map((lesson) => {
          const systemNames = lesson.applicableToSystems
            .map((id) => sysById.get(id)?.name ?? id)
            .join(", ")
          return (
            <div key={lesson.id} style={{ ...cardStyle, padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <Lightbulb size={14} style={{ color: "var(--amber-400)", marginTop: "3px" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                    {lesson.title}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                    {QMS_LESSON_SOURCE_LABELS[lesson.source]} ·{" "}
                    {new Date(lesson.recordedAtISO).toLocaleDateString("ro-RO")} ·{" "}
                    {lesson.recordedByEmail}
                    {systemNames && ` · sisteme: ${systemNames}`}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "8px" }}>
                    <strong>Cauză rădăcină:</strong> {lesson.rootCauseSummary}
                  </div>
                  {lesson.preventiveActionsTaken.length > 0 && (
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px" }}>
                      <strong>Măsuri preventive:</strong>
                      <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                        {lesson.preventiveActionsTaken.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lesson.resultingPolicyChange && (
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px" }}>
                      <strong>Schimbare politică:</strong> {lesson.resultingPolicyChange}
                    </div>
                  )}
                  {lesson.resultingProcessChange && (
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px" }}>
                      <strong>Schimbare proces:</strong> {lesson.resultingProcessChange}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

function AttestationsTab({
  workspace,
  systems,
  highRiskSystems,
  busy,
  onOpenAttest,
  onRevoke,
}: {
  workspace: QmsWorkspace
  systems: AISystemRecord[]
  highRiskSystems: AISystemRecord[]
  busy: boolean
  onOpenAttest: (sysId: string) => void
  onRevoke: (sysId: string) => Promise<void>
}) {
  const attsById = new Map<string, QmsSystemAttestation>()
  for (const a of workspace.systemAttestations) attsById.set(a.systemId, a)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
        Per-system attestations confirmă explicit că QMS-ul acoperă fiecare sistem AI high-risk (Art.
        17(1)(a) coverage). Recomandare: atestare la plasarea sistemului pe piață + la fiecare release
        substantial (Art. 43(4)).
      </p>
      {systems.length === 0 ? (
        <div
          style={{
            ...cardStyle,
            padding: "32px",
            textAlign: "center",
            color: "var(--ink-dim)",
            fontSize: "13px",
          }}
        >
          Niciun sistem AI înregistrat. Adaugă mai întâi sisteme în{" "}
          <Link href="/dashboard/sisteme" style={{ color: "var(--cobalt-400)" }}>
            /dashboard/sisteme
          </Link>
          .
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {systems.map((s) => {
            const att = attsById.get(s.id)
            const isHighRisk = s.riskLevel === "high"
            return (
              <div
                key={s.id}
                style={{
                  ...cardStyle,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  borderLeft:
                    isHighRisk && !att
                      ? "3px solid #f87171"
                      : att
                      ? "3px solid #10b981"
                      : "3px solid var(--border)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                    {s.name}
                    {isHighRisk && (
                      <span
                        style={{
                          marginLeft: "8px",
                          ...pill("rgba(248,113,113,0.16)", "#f87171"),
                          fontSize: "10px",
                        }}
                      >
                        high-risk
                      </span>
                    )}
                  </div>
                  {att ? (
                    <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
                      Atestat: {new Date(att.attestedAtISO).toLocaleDateString("ro-RO")} de{" "}
                      {att.attestedByEmail} · {att.sectionsConfirmedCovered.length}/13 sectiuni acoperite
                      {att.gapsAcknowledged.length > 0 &&
                        ` · ${att.gapsAcknowledged.length} gap(uri) recunoscute`}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "11px",
                        color: isHighRisk ? "#f87171" : "var(--ink-dim)",
                        marginTop: "2px",
                      }}
                    >
                      {isHighRisk
                        ? "Sistem high-risk fără atestare QMS — necesită action."
                        : "Sistem neatestat (atestare nu este obligatorie pentru non-high-risk)."}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAttest(s.id)}
                  style={att ? secondaryButton : primaryButton}
                  disabled={busy}
                >
                  {att ? "Editează" : "Atestă sistem"}
                </button>
                {att && (
                  <button
                    type="button"
                    onClick={() => onRevoke(s.id)}
                    style={iconButton}
                    aria-label="Revocă atestarea"
                    disabled={busy}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {highRiskSystems.length === 0 && systems.length > 0 && (
        <div
          style={{
            ...cardStyle,
            padding: "12px 16px",
            background: "var(--emerald-soft)",
            border: "1px solid rgba(52,211,153,0.2)",
            color: "#10b981",
            fontSize: "12px",
          }}
        >
          Nu există sisteme AI high-risk în inventar. Atestare QMS nu este obligatorie momentan.
        </div>
      )}
    </div>
  )
}

function HealthTab({
  workspace,
  highRiskCount,
}: {
  workspace: QmsWorkspace
  highRiskCount: number
}) {
  const rows = workspace.sections
    .map((section) => {
      const schemaSec = QMS_SCHEMA_V1.sections.find((s) => s.key === section.key)
      if (!schemaSec) return null
      const totalRefs =
        (section.linkedRopaActivityCount ?? 0) +
        (section.linkedAIDataMapCount ?? 0) +
        (section.linkedDpiaCount ?? 0) +
        (section.linkedFriaCount ?? 0) +
        (section.linkedFindingCount ?? 0) +
        (section.linkedPmmPlanCount ?? 0) +
        (section.linkedAIIncidentCount ?? 0) +
        (section.linkedLoggingConfigCount ?? 0)
      return {
        section,
        schemaSec,
        totalRefs,
        hasModuleLinks: schemaSec.crossModuleLinks.length > 0,
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.hasModuleLinks)

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
        Cross-module health verifică câte intrări din modulele CompliRoAI (RoPA, DPIA, FRIA, findings,
        PMM, AI Incidents, Logging Evidence) sunt legate la fiecare secțiune QMS. Secțiunile fără
        linkages la modulele așteptate sunt evidențiate ca lacune.
      </p>
      <div style={{ ...cardStyle, padding: "12px 16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "60px 1fr 100px 100px",
            gap: "8px",
            fontSize: "11px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            padding: "4px 0",
            borderBottom: "1px solid var(--border)",
            marginBottom: "8px",
          }}
        >
          <div>Litera</div>
          <div>Secțiune + module așteptate</div>
          <div>Total refs</div>
          <div>Status</div>
        </div>
        {rows.map(({ section, schemaSec, totalRefs }) => {
          const expectedModules = schemaSec.crossModuleLinks.join(", ")
          const allEmpty = totalRefs === 0 && highRiskCount > 0
          return (
            <div
              key={section.key}
              style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 100px 100px",
                gap: "8px",
                fontSize: "12px",
                padding: "10px 0",
                alignItems: "center",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono-v3)",
                  fontWeight: 600,
                  color: "var(--cobalt-400)",
                }}
              >
                {schemaSec.letter}
              </div>
              <div>
                <div style={{ color: "var(--ink)", fontWeight: 500 }}>{schemaSec.displayLabel}</div>
                <div style={{ color: "var(--ink-dim)", fontSize: "11px", marginTop: "2px" }}>
                  Module: {expectedModules}
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono-v3)",
                  color: allEmpty ? "#f87171" : "var(--ink)",
                }}
              >
                {totalRefs}
              </div>
              <div>
                {allEmpty ? (
                  <span style={pill("rgba(248,113,113,0.16)", "#f87171")}>Gap</span>
                ) : totalRefs === 0 ? (
                  <span style={pill("rgba(148,163,184,0.16)", "#94a3b8")}>—</span>
                ) : (
                  <span style={pill("rgba(52,211,153,0.18)", "#10b981")}>OK</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Modals ───────────────────────────────────────────────────────────────────

function ApproveModal({
  onClose,
  onApproved,
}: {
  onClose: () => void
  onApproved: () => void
}) {
  const [email, setEmail] = useState("")
  const [months, setMonths] = useState(12)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/qms/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvedByEmail: email, nextReviewMonths: months }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare aprobare.")
      } else {
        onApproved()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal onClose={onClose} title="Aprobă QMS">
      <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
        Aprobarea înregistrează versiune nouă + responsabil + termen review (12 luni default).
      </p>
      <Field label="Email aprobant">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          placeholder="ceo@organizatie.ro"
        />
      </Field>
      <Field label="Termen review (luni)">
        <input
          type="number"
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          style={inputStyle}
          min={1}
          max={36}
        />
      </Field>
      {error && <div style={{ color: "#f87171", fontSize: "12px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={secondaryButton}>
          Anulează
        </button>
        <button type="button" onClick={submit} style={primaryButton} disabled={busy || !email}>
          {busy ? <Loader2 size={12} /> : <ShieldCheck size={12} />}
          Aprobă
        </button>
      </div>
    </Modal>
  )
}

function AttachDocModal({
  sectionKey,
  onClose,
  onAttached,
}: {
  sectionKey: QmsSectionKey
  onClose: () => void
  onAttached: () => void
}) {
  const [type, setType] = useState<QmsDocumentReferenceType>("policy")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [versionLabel, setVersionLabel] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/qms/document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey, type, title, url, versionLabel, notes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare atașare.")
      } else {
        onAttached()
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title={`Atașează document — secțiunea ${sectionKey}`}>
      <Field label="Tip">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QmsDocumentReferenceType)}
          style={selectStyle}
        >
          {DOC_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {QMS_DOCUMENT_TYPE_LABELS[o]}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Titlu">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
          placeholder="Politica QMS v1.0"
        />
      </Field>
      <Field label="URL (opțional)">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
          placeholder="https://drive.example/qms-policy"
        />
      </Field>
      <Field label="Versiune (ex: v1.0 — 2026-05)">
        <input
          type="text"
          value={versionLabel}
          onChange={(e) => setVersionLabel(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Note">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={textareaStyle}
          rows={2}
        />
      </Field>
      {error && <div style={{ color: "#f87171", fontSize: "12px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={secondaryButton}>
          Anulează
        </button>
        <button type="button" onClick={submit} style={primaryButton} disabled={busy || !title}>
          {busy ? <Loader2 size={12} /> : <Plus size={12} />}
          Atașează
        </button>
      </div>
    </Modal>
  )
}

function AddLessonModal({
  systems,
  onClose,
  onAdded,
}: {
  systems: AISystemRecord[]
  onClose: () => void
  onAdded: () => void
}) {
  const [title, setTitle] = useState("")
  const [rootCauseSummary, setRootCauseSummary] = useState("")
  const [preventiveActionsRaw, setPreventiveActionsRaw] = useState("")
  const [resultingPolicyChange, setResultingPolicyChange] = useState("")
  const [resultingProcessChange, setResultingProcessChange] = useState("")
  const [applicableSysIds, setApplicableSysIds] = useState<string[]>([])
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const preventiveActionsTaken = preventiveActionsRaw
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const res = await fetch("/api/qms/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          rootCauseSummary,
          preventiveActionsTaken,
          resultingPolicyChange,
          resultingProcessChange,
          applicableToSystems: applicableSysIds,
          notes,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare lecție.")
      } else {
        onAdded()
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title="Adaugă lecție manuală">
      <Field label="Titlu">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Cauză rădăcină (sumar)">
        <textarea
          value={rootCauseSummary}
          onChange={(e) => setRootCauseSummary(e.target.value)}
          style={textareaStyle}
          rows={3}
        />
      </Field>
      <Field label="Acțiuni preventive aplicate (câte una pe linie)">
        <textarea
          value={preventiveActionsRaw}
          onChange={(e) => setPreventiveActionsRaw(e.target.value)}
          style={textareaStyle}
          rows={3}
        />
      </Field>
      <Field label="Schimbare politică (opțional)">
        <input
          type="text"
          value={resultingPolicyChange}
          onChange={(e) => setResultingPolicyChange(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Schimbare proces (opțional)">
        <input
          type="text"
          value={resultingProcessChange}
          onChange={(e) => setResultingProcessChange(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Sisteme aplicabile (Ctrl/Cmd-click pentru multi)">
        <select
          multiple
          value={applicableSysIds}
          onChange={(e) =>
            setApplicableSysIds(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
          style={{ ...selectStyle, minHeight: "100px" }}
        >
          {systems.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={textareaStyle}
          rows={2}
        />
      </Field>
      {error && <div style={{ color: "#f87171", fontSize: "12px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={secondaryButton}>
          Anulează
        </button>
        <button
          type="button"
          onClick={submit}
          style={primaryButton}
          disabled={busy || !title || !rootCauseSummary}
        >
          {busy ? <Loader2 size={12} /> : <Plus size={12} />}
          Adaugă lecție
        </button>
      </div>
    </Modal>
  )
}

function AttestModal({
  systemId,
  systemName,
  existingAttestation,
  onClose,
  onAttested,
}: {
  systemId: string
  systemName: string
  existingAttestation?: QmsSystemAttestation
  onClose: () => void
  onAttested: () => void
}) {
  const [selected, setSelected] = useState<QmsSectionKey[]>(
    existingAttestation?.sectionsConfirmedCovered ?? [],
  )
  const [gapsRaw, setGapsRaw] = useState(
    existingAttestation?.gapsAcknowledged.join("\n") ?? "",
  )
  const [notes, setNotes] = useState(existingAttestation?.notes ?? "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(k: QmsSectionKey) {
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]))
  }
  function selectAll() {
    setSelected(QMS_SCHEMA_V1.sections.map((s) => s.key))
  }
  function selectNone() {
    setSelected([])
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const gaps = gapsRaw
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      const res = await fetch("/api/qms/system-attestation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          sectionsConfirmedCovered: selected,
          gapsAcknowledged: gaps,
          notes,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare atestare.")
      } else {
        onAttested()
      }
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal onClose={onClose} title={`Atestă sistem: ${systemName}`}>
      <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0 }}>
        Bifează secțiunile QMS care acoperă explicit acest sistem AI. Declară transparent gap-urile
        cunoscute.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={selectAll} style={secondaryButton}>
          Bifează toate
        </button>
        <button type="button" onClick={selectNone} style={secondaryButton}>
          Debifează
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
          {selected.length}/13 selectate
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "6px",
          maxHeight: "260px",
          overflow: "auto",
          padding: "6px",
          background: "var(--bg-raised)",
          borderRadius: "6px",
        }}
      >
        {QMS_SCHEMA_V1.sections.map((s) => (
          <label
            key={s.key}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "6px",
              padding: "4px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(s.key)}
              onChange={() => toggle(s.key)}
            />
            <span>
              ({s.letter}) {s.displayLabel}
            </span>
          </label>
        ))}
      </div>
      <Field label="Gap-uri recunoscute (câte unul pe linie)">
        <textarea
          value={gapsRaw}
          onChange={(e) => setGapsRaw(e.target.value)}
          style={textareaStyle}
          rows={3}
          placeholder="Ex: FRIA în lucru; lipsește documentație SOC2 pentru data center."
        />
      </Field>
      <Field label="Note">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={textareaStyle}
          rows={2}
        />
      </Field>
      {error && <div style={{ color: "#f87171", fontSize: "12px" }}>{error}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button type="button" onClick={onClose} style={secondaryButton}>
          Anulează
        </button>
        <button type="button" onClick={submit} style={primaryButton} disabled={busy}>
          {busy ? <Loader2 size={12} /> : <Award size={12} />}
          Salvează atestarea
        </button>
      </div>
    </Modal>
  )
}

// ── Generic helpers + styles ────────────────────────────────────────────────

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "24px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
          maxWidth: "640px",
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <h2 style={{ ...sectionTitle, margin: 0, flex: 1 }}>{title}</h2>
          <button type="button" onClick={onClose} style={iconButton} aria-label="Închide">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={smallLabel}>{label}</div>
      {children}
    </div>
  )
}

const pageStyle: CSSProperties = {
  padding: "32px",
  maxWidth: "1100px",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
}
const pageTitleStyle: CSSProperties = {
  fontFamily: "var(--font-display-v3)",
  fontSize: "22px",
  fontWeight: 600,
  color: "var(--ink)",
  margin: 0,
  letterSpacing: "-0.02em",
}
const cardStyle: CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
}
const statCardStyle: CSSProperties = {
  ...cardStyle,
  flex: "1 0 110px",
  padding: "10px 12px",
  display: "flex",
  flexDirection: "column",
  gap: "4px",
}
const smallLabel: CSSProperties = {
  fontSize: "10px",
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 500,
}
const big: CSSProperties = {
  fontSize: "20px",
  fontWeight: 600,
  color: "var(--ink)",
}
const sectionTitle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "var(--ink)",
}
const inputStyle: CSSProperties = {
  padding: "8px 10px",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  color: "var(--ink)",
  fontSize: "12px",
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box",
}
const textareaStyle: CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  fontFamily: "inherit",
}
const selectStyle: CSSProperties = inputStyle
const primaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 12px",
  background: "var(--cobalt-400)",
  color: "var(--inverse)",
  border: "1px solid var(--cobalt-400)",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
}
const secondaryButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 10px",
  background: "var(--bg-raised)",
  color: "var(--ink)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "11px",
  fontWeight: 500,
  cursor: "pointer",
}
const exportButton: CSSProperties = {
  ...secondaryButton,
  textDecoration: "none",
}
const iconButton: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px",
  background: "transparent",
  color: "var(--ink-dim)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  cursor: "pointer",
}
const fieldGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "10px",
}
const tabsContainer: CSSProperties = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "6px",
  flexWrap: "wrap",
}
function tabButton(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 12px",
    background: active ? "var(--cobalt-soft)" : "transparent",
    color: active ? "var(--cobalt-400)" : "var(--ink-dim)",
    border: active ? "1px solid var(--cobalt-400)" : "1px solid transparent",
    borderRadius: "6px 6px 0 0",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
  }
}
function pill(bg: string, fg: string): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    background: bg,
    color: fg,
    borderRadius: "5px",
    fontSize: "11px",
    fontWeight: 500,
  }
}
const errorBannerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 14px",
  background: "rgba(248,113,113,0.10)",
  border: "1px solid rgba(248,113,113,0.30)",
  borderRadius: "8px",
  color: "#f87171",
  fontSize: "12px",
}
