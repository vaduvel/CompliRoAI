"use client"

import { useState, useEffect, useCallback } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import type { AISystemRecord } from "@/lib/compliance/types"
import {
  AI_CONFORMITY_QUESTIONS,
  CE_MARKING_CHECKLIST,
  buildAnnexIVDocument,
  scoreAssessment,
  type AssessmentAnswer,
  type AssessmentAnswers,
  type AssessmentResult,
  type CEMarkingChecklistAnswers,
} from "@/lib/compliance/ai-conformity-assessment"

// ── Answer selector ───────────────────────────────────────────────────────────

const ANSWER_OPTIONS: Array<{ value: AssessmentAnswer; label: string; kind: "good" | "warn" | "bad" | "neutral" }> = [
  { value: "yes", label: "Da", kind: "good" },
  { value: "partial", label: "Parțial", kind: "warn" },
  { value: "no", label: "Nu", kind: "bad" },
  { value: "na", label: "N/A", kind: "neutral" },
]

function AnswerSelector({
  value,
  onChange,
}: {
  value: AssessmentAnswer | undefined
  onChange: (v: AssessmentAnswer) => void
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
      {ANSWER_OPTIONS.map((opt) => {
        const selected = value === opt.value
        const colorMap: Record<string, { border: string; bg: string; color: string }> = {
          good: {
            border: selected ? "var(--emerald-400)" : "var(--border-strong)",
            bg: selected ? "var(--emerald-soft)" : "transparent",
            color: selected ? "var(--emerald-400)" : "var(--ink-dim)",
          },
          warn: {
            border: selected ? "var(--amber-400)" : "var(--border-strong)",
            bg: selected ? "var(--amber-soft)" : "transparent",
            color: selected ? "var(--amber-400)" : "var(--ink-dim)",
          },
          bad: {
            border: selected ? "var(--red-400)" : "var(--border-strong)",
            bg: selected ? "var(--red-soft)" : "transparent",
            color: selected ? "var(--red-400)" : "var(--ink-dim)",
          },
          neutral: {
            border: selected ? "var(--border-strong)" : "var(--border)",
            bg: selected ? "var(--bg-hover)" : "transparent",
            color: selected ? "var(--ink-muted)" : "var(--ink-subtle)",
          },
        }
        const c = colorMap[opt.kind]
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              borderRadius: "20px",
              border: `1px solid ${c.border}`,
              background: c.bg,
              color: c.color,
              padding: "4px 12px",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.1s",
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Score display ─────────────────────────────────────────────────────────────

function ConformityScore({ result }: { result: AssessmentResult }) {
  const color =
    result.riskLabel === "risc-acceptabil"
      ? "var(--emerald-400)"
      : result.riskLabel === "lacune-moderate"
      ? "var(--amber-400)"
      : "var(--red-400)"

  const label =
    result.riskLabel === "risc-acceptabil"
      ? "Risc acceptabil"
      : result.riskLabel === "lacune-moderate"
      ? "Lacune moderate"
      : "Neconform critic"

  const badgeBg =
    result.riskLabel === "risc-acceptabil"
      ? "var(--emerald-soft)"
      : result.riskLabel === "lacune-moderate"
      ? "var(--amber-soft)"
      : "var(--red-soft)"

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
      <span style={{ fontSize: "40px", fontWeight: 700, color, fontFamily: "var(--font-display-v3)", lineHeight: 1 }}>
        {result.conformityPercent}%
      </span>
      <div style={{ marginBottom: "4px" }}>
        <span style={{
          background: badgeBg,
          color,
          border: `1px solid ${color}40`,
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 600,
          padding: "3px 8px",
          letterSpacing: "0.02em",
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}

// ── Gap item ──────────────────────────────────────────────────────────────────

function GapItem({ gap }: { gap: AssessmentResult["gaps"][0] }) {
  const isC = gap.severity === "critical"
  const isH = gap.severity === "high"
  const color = isC ? "var(--red-400)" : isH ? "var(--amber-400)" : "var(--amber-400)"
  const bg = isC ? "var(--red-soft)" : "var(--bg-raised)"
  const borderColor = isC ? "rgba(248,113,113,0.2)" : "var(--border)"
  const leftBorder = isC ? "var(--red-400)" : isH ? "var(--amber-400)" : "var(--border-strong)"
  const Icon = isC ? XCircle : AlertTriangle

  return (
    <div style={{
      display: "flex",
      gap: "12px",
      padding: "12px",
      background: bg,
      borderRadius: "6px",
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${leftBorder}`,
    }}>
      <Icon size={15} style={{ color, flexShrink: 0, marginTop: "2px" }} strokeWidth={2} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>{gap.question}</p>
        <p style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>{gap.legalRef}</p>
        <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "6px", lineHeight: 1.5 }}>{gap.remediationHint}</p>
      </div>
    </div>
  )
}

// ── EU DoC field input (Sprint 026) ──────────────────────────────────────────

function EuDocField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <span style={{ fontSize: "11px", color: "var(--ink-muted)" }}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid var(--border-strong)",
          background: "var(--bg)",
          color: "var(--ink)",
          fontSize: "13px",
        }}
      />
    </label>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConformitatePage() {
  const [systems, setSystems] = useState<AISystemRecord[]>([])
  const [loadingSystems, setLoadingSystems] = useState(true)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<AssessmentAnswers>({})
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedResult, setSavedResult] = useState<AssessmentResult | null>(null)
  const [generatingAnnex, setGeneratingAnnex] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Art. 47 — EU Declaration of Conformity inputs (Sprint 026)
  const [showEuDocForm, setShowEuDocForm] = useState(false)
  const [generatingEuDoc, setGeneratingEuDoc] = useState(false)
  const [euDocUniqueId, setEuDocUniqueId] = useState("")
  const [euDocProviderAddress, setEuDocProviderAddress] = useState("")
  const [euDocPlaceOfIssue, setEuDocPlaceOfIssue] = useState("București, România")
  const [euDocSignerName, setEuDocSignerName] = useState("")
  const [euDocSignerTitle, setEuDocSignerTitle] = useState("")
  const [euDocStandards, setEuDocStandards] = useState("")

  // Art. 48 — CE marking checklist (Sprint 026)
  const [showCeForm, setShowCeForm] = useState(false)
  const [generatingCe, setGeneratingCe] = useState(false)
  const [ceHasPhysicalProduct, setCeHasPhysicalProduct] = useState(false)
  const [ceHasNotifiedBody, setCeHasNotifiedBody] = useState(false)
  const [ceAnswers, setCeAnswers] = useState<CEMarkingChecklistAnswers>({})

  const loadSystems = useCallback(async () => {
    const res = await fetch("/api/ai-systems")
    if (res.ok) {
      const data = await res.json()
      setSystems(data.systems)
    }
    setLoadingSystems(false)
  }, [])

  useEffect(() => { void loadSystems() }, [loadSystems])

  async function loadAnswers(systemId: string) {
    setLoadingAnswers(true)
    setError(null)
    try {
      const res = await fetch(`/api/ai-act/conformity?systemId=${systemId}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json() as { answers: AssessmentAnswers; result: AssessmentResult }
        setAnswers(data.answers)
        setSavedResult(data.result)
      }
      // 404 = no saved assessment yet, that's fine
    } catch {
      // ignore
    } finally {
      setLoadingAnswers(false)
    }
  }

  function handleSelectSystem(systemId: string) {
    setSelectedSystemId(systemId)
    setAnswers({})
    setSavedResult(null)
    setError(null)
    setSuccessMsg(null)
    void loadAnswers(systemId)
  }

  function handleAnswer(questionId: string, answer: AssessmentAnswer) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
  }

  async function handleSave() {
    if (!selectedSystemId) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch("/api/ai-act/conformity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: selectedSystemId, answers }),
      })
      if (!res.ok) {
        const payload = await res.json() as { error?: string }
        setError(payload.error ?? "Salvarea a eșuat.")
        return
      }
      const data = await res.json() as { result: AssessmentResult }
      setSavedResult(data.result)
      setSuccessMsg(`Evaluare salvată · Scor: ${data.result.conformityPercent}%`)
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateAnnexIV() {
    if (!selectedSystemId) return
    setGeneratingAnnex(true)
    try {
      const res = await fetch("/api/ai-act/annex-iv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId: selectedSystemId, answers }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? "Eroare la generare.")
        return
      }
      const data = await res.json() as { content: string; title: string }
      const system = systems.find((s) => s.id === selectedSystemId)
      const doc = buildAnnexIVDocument(
        {
          id: system!.id,
          name: system!.name,
          vendor: system!.vendor,
          modelType: system!.modelType,
          purpose: system!.purpose,
          riskLevel: system!.riskLevel,
          usesPersonalData: system!.usesPersonalData,
          makesAutomatedDecisions: system!.makesAutomatedDecisions,
          impactsRights: system!.impactsRights,
          hasHumanReview: system!.hasHumanReview,
          annexIIIHint: system!.annexIIIHint,
          createdAtISO: system!.createdAtISO,
        },
        answers
      )
      const content = data.content ?? doc.content
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `annex-iv-${system!.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.md`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg("Documentație Anexa IV descărcată")
    } catch {
      setError("Eroare la generarea Anexei IV.")
    } finally {
      setGeneratingAnnex(false)
    }
  }

  // Art. 47 — generate EU Declaration of Conformity (Sprint 026)
  async function handleGenerateEuDoc() {
    if (!selectedSystemId) return
    if (!euDocUniqueId.trim() || !euDocProviderAddress.trim() || !euDocPlaceOfIssue.trim() || !euDocSignerName.trim() || !euDocSignerTitle.trim()) {
      setError("Completează toate câmpurile obligatorii pentru Anexa V înainte de generare.")
      return
    }
    setGeneratingEuDoc(true)
    setError(null)
    try {
      const standards = euDocStandards
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
      const res = await fetch("/api/ai-act/eu-declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId: selectedSystemId,
          inputs: {
            uniqueIdentifier: euDocUniqueId.trim(),
            providerAddress: euDocProviderAddress.trim(),
            placeOfIssue: euDocPlaceOfIssue.trim(),
            signerName: euDocSignerName.trim(),
            signerTitle: euDocSignerTitle.trim(),
            harmonisedStandards: standards.length > 0 ? standards : undefined,
            language: "ro",
          },
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string }
        setError(payload.error ?? "Generarea Declarației UE a eșuat.")
        return
      }
      const data = await res.json() as { content: string }
      const system = systems.find((s) => s.id === selectedSystemId)!
      const blob = new Blob([data.content], { type: "text/markdown;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `eu-declaration-${system.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.md`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg("Declarație UE de Conformitate (Art. 47) descărcată")
    } catch {
      setError("Eroare la generarea Declarației UE.")
    } finally {
      setGeneratingEuDoc(false)
    }
  }

  // Art. 48 — generate CE marking checklist (Sprint 026)
  async function handleGenerateCeChecklist() {
    if (!selectedSystemId) return
    setGeneratingCe(true)
    setError(null)
    try {
      const res = await fetch("/api/ai-act/ce-marking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId: selectedSystemId,
          answers: ceAnswers,
          hasPhysicalProduct: ceHasPhysicalProduct,
          hasNotifiedBody: ceHasNotifiedBody,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string }
        setError(payload.error ?? "Generarea checklist-ului CE a eșuat.")
        return
      }
      const data = await res.json() as { content: string }
      const system = systems.find((s) => s.id === selectedSystemId)!
      const blob = new Blob([data.content], { type: "text/markdown;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ce-marking-checklist-${system.name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.md`
      a.click()
      URL.revokeObjectURL(url)
      setSuccessMsg("Checklist marcaj CE (Art. 48) descărcat")
    } catch {
      setError("Eroare la generarea checklist-ului CE.")
    } finally {
      setGeneratingCe(false)
    }
  }

  const liveResult = scoreAssessment(answers)
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === AI_CONFORMITY_QUESTIONS.length

  if (loadingSystems) {
    return (
      <div className="cr-page cr-inline cr-inline--start">
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se încarcă...
      </div>
    )
  }

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Discovery & risc</span>
          <h1 className="cr-title">Evaluare conformitate</h1>
          <p className="cr-subtitle">
          Workflow 10 întrebări · EU AI Act 2024/1689 · Identifică lacune și generează plan de remediere
          </p>
        </div>
      </div>

      {/* Error / success banners */}
      {error && (
        <div className="cr-alert cr-alert--danger">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}
      {successMsg && (
        <div className="cr-alert cr-alert--info">
          <CheckCircle2 size={15} />
          {successMsg}
        </div>
      )}

      {/* Empty state */}
      {systems.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "12px", padding: "48px 24px", textAlign: "center",
          background: "var(--bg-raised)", borderRadius: "8px",
          border: "1px solid var(--border)",
        }}>
          <ShieldCheck size={36} style={{ color: "var(--ink-dim)" }} strokeWidth={1.5} />
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
              Niciun sistem AI în inventar
            </p>
            <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "4px" }}>
              Adaugă sisteme AI din pagina Sisteme pentru a rula evaluarea de conformitate.
            </p>
          </div>
          <a
            href="/dashboard/sisteme"
            style={{
              padding: "8px 16px", borderRadius: "6px",
              border: "1px solid var(--border-strong)", background: "transparent",
              fontSize: "13px", color: "var(--ink-muted)", textDecoration: "none", cursor: "pointer",
            }}
          >
            Mergi la Sisteme →
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: "24px", alignItems: "start" }}>
          {/* ── System selector ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <p style={{
              fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "var(--ink-subtle)", margin: 0,
            }}>
              Sistem AI
            </p>
            {systems.map((system) => {
              const selected = selectedSystemId === system.id
              return (
                <button
                  key={system.id}
                  type="button"
                  onClick={() => handleSelectSystem(system.id)}
                  style={{
                    width: "100%",
                    borderRadius: "6px",
                    border: selected ? "1px solid var(--cobalt-600)" : "1px solid var(--border)",
                    background: selected ? "var(--cobalt-soft)" : "var(--bg-raised)",
                    padding: "10px 12px",
                    textAlign: "left",
                    cursor: "pointer",
                    boxShadow: selected ? "0 0 0 1px var(--cobalt-600)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <p style={{
                      fontSize: "13px", fontWeight: 500, margin: 0,
                      color: selected ? "var(--cobalt-400)" : "var(--ink)",
                    }}>
                      {system.name}
                    </p>
                    <ChevronRight size={13} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--ink-dim)", margin: "2px 0 0" }}>
                    {system.riskLevel} risk
                  </p>
                </button>
              )
            })}
          </div>

          {/* ── Assessment form ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {!selectedSystemId ? (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "48px 24px", background: "var(--bg-raised)",
                borderRadius: "8px", border: "1px solid var(--border)",
              }}>
                <p style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
                  Selectează un sistem AI din stânga pentru a începe evaluarea.
                </p>
              </div>
            ) : loadingAnswers ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "24px", fontSize: "13px", color: "var(--ink-dim)" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se încarcă evaluarea...
              </div>
            ) : (
              <>
                {/* Live score */}
                {answeredCount > 0 && (
                  <div style={{
                    padding: "16px", background: "var(--bg-raised)",
                    borderRadius: "8px", border: "1px solid var(--border)",
                  }}>
                    <p style={{
                      fontSize: "10px", fontWeight: 600, letterSpacing: "0.14em",
                      textTransform: "uppercase", color: "var(--ink-subtle)",
                      marginBottom: "10px",
                    }}>
                      Scor curent ({answeredCount}/{AI_CONFORMITY_QUESTIONS.length} răspunsuri)
                    </p>
                    <ConformityScore result={liveResult} />
                    <div style={{
                      marginTop: "12px", height: "6px", width: "100%",
                      borderRadius: "3px", background: "var(--bg-hover)", overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        borderRadius: "3px",
                        background:
                          liveResult.conformityPercent >= 80
                            ? "var(--emerald-400)"
                            : liveResult.conformityPercent >= 50
                            ? "var(--amber-400)"
                            : "var(--red-400)",
                        width: `${liveResult.conformityPercent}%`,
                        transition: "width 0.3s ease",
                      }} />
                    </div>
                  </div>
                )}

                {/* Questions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {AI_CONFORMITY_QUESTIONS.map((q, idx) => {
                    const currentAnswer = answers[q.id]
                    const passes = currentAnswer !== undefined && (
                      currentAnswer === "na" ||
                      (q.positiveAnswer === "yes" && currentAnswer === "yes") ||
                      (q.positiveAnswer === "no" && currentAnswer === "no")
                    )
                    const nonConformant = currentAnswer === "no" || currentAnswer === "partial"

                    return (
                      <div key={q.id} style={{
                        padding: "14px 16px",
                        background: "var(--bg-raised)",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                      }}>
                        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                          <span style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: "20px", height: "20px", borderRadius: "50%",
                            background: "var(--bg-hover)", flexShrink: 0,
                            fontSize: "10px", fontWeight: 700, color: "var(--ink-dim)",
                            marginTop: "2px",
                          }}>
                            {idx + 1}
                          </span>
                          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                            <div>
                              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)", margin: 0 }}>
                                {q.text}
                              </p>
                              <p style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "3px", lineHeight: 1.5 }}>
                                {q.hint}
                              </p>
                              <p style={{
                                fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em",
                                textTransform: "uppercase", color: "var(--ink-subtle)", marginTop: "4px",
                              }}>
                                {q.legalRef}
                              </p>
                            </div>
                            <AnswerSelector
                              value={currentAnswer}
                              onChange={(v) => handleAnswer(q.id, v)}
                            />
                            {currentAnswer && (
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                                {passes
                                  ? <CheckCircle2 size={13} style={{ color: answers[q.id] === "na" ? "var(--ink-dim)" : "var(--emerald-400)", flexShrink: 0, marginTop: "1px" }} strokeWidth={2} />
                                  : <AlertTriangle size={13} style={{ color: "var(--amber-400)", flexShrink: 0, marginTop: "1px" }} strokeWidth={2} />
                                }
                                {nonConformant && (
                                  <p style={{ fontSize: "12px", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                                    {q.remediationHint}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving || answeredCount === 0}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                      padding: "11px 20px", borderRadius: "6px", border: "none",
                      background: answeredCount === 0 ? "var(--bg-hover)" : "var(--cobalt-600)",
                      color: answeredCount === 0 ? "var(--ink-dim)" : "#fff",
                      fontSize: "13px", fontWeight: 500, cursor: answeredCount === 0 ? "not-allowed" : "pointer",
                    }}
                  >
                    {saving ? (
                      <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se salvează...</>
                    ) : (
                      <><CheckCircle2 size={14} strokeWidth={2} /> Salvează evaluarea{!allAnswered ? ` (${answeredCount}/${AI_CONFORMITY_QUESTIONS.length})` : ""}</>
                    )}
                  </button>

                  {answeredCount >= 8 && (
                    <button
                      onClick={() => void handleGenerateAnnexIV()}
                      disabled={generatingAnnex}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                        padding: "11px 20px", borderRadius: "6px",
                        border: "1px solid var(--border-strong)", background: "transparent",
                        fontSize: "13px", color: "var(--ink-muted)", cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      {generatingAnnex ? (
                        <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se generează...</>
                      ) : (
                        <><FileText size={14} strokeWidth={2} /> Generează Documentație Tehnică (Anexa IV) <Download size={13} style={{ marginLeft: "auto", color: "var(--ink-dim)" }} strokeWidth={2} /></>
                      )}
                    </button>
                  )}

                  {/* Art. 47 — EU Declaration of Conformity (Sprint 026) */}
                  <div style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--bg-raised)",
                    overflow: "hidden",
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowEuDocForm((v) => !v)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "11px 16px", border: "none",
                        background: "transparent", cursor: "pointer",
                        fontSize: "13px", color: "var(--ink)", fontWeight: 500,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <FileText size={14} strokeWidth={2} />
                        EU Declaration of Conformity (Art. 47 + Anexa V)
                      </span>
                      <ChevronRight
                        size={14}
                        style={{
                          color: "var(--ink-dim)",
                          transform: showEuDocForm ? "rotate(90deg)" : "none",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>
                    {showEuDocForm && (
                      <div style={{
                        padding: "12px 16px",
                        borderTop: "1px solid var(--border)",
                        display: "flex", flexDirection: "column", gap: "10px",
                      }}>
                        <p style={{ fontSize: "12px", color: "var(--ink-muted)", margin: 0, lineHeight: 1.5 }}>
                          Câmpurile minime cerute de Anexa V. Pregătit pentru semnătură de provider sau reprezentant autorizat (Art. 22).
                        </p>
                        <EuDocField label="Cod unic identificare (ex: număr serie, UUID)*" value={euDocUniqueId} onChange={setEuDocUniqueId} />
                        <EuDocField label="Adresă provider*" value={euDocProviderAddress} onChange={setEuDocProviderAddress} />
                        <EuDocField label="Loc emitere*" value={euDocPlaceOfIssue} onChange={setEuDocPlaceOfIssue} />
                        <EuDocField label="Nume semnatar*" value={euDocSignerName} onChange={setEuDocSignerName} />
                        <EuDocField label="Funcție semnatar*" value={euDocSignerTitle} onChange={setEuDocSignerTitle} />
                        <EuDocField label="Standarde armonizate (separate prin virgulă; ex: ISO/IEC 42001)" value={euDocStandards} onChange={setEuDocStandards} />
                        <button
                          onClick={() => void handleGenerateEuDoc()}
                          disabled={generatingEuDoc}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            padding: "10px 16px", borderRadius: "6px",
                            border: "1px solid var(--border-strong)", background: "transparent",
                            fontSize: "13px", color: "var(--ink-muted)", cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {generatingEuDoc ? (
                            <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se generează...</>
                          ) : (
                            <><Download size={14} strokeWidth={2} /> Descarcă Declarație UE de Conformitate</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Art. 48 — CE marking checklist (Sprint 026) */}
                  <div style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    background: "var(--bg-raised)",
                    overflow: "hidden",
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowCeForm((v) => !v)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "11px 16px", border: "none",
                        background: "transparent", cursor: "pointer",
                        fontSize: "13px", color: "var(--ink)", fontWeight: 500,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <ShieldCheck size={14} strokeWidth={2} />
                        Checklist Marcaj CE (Art. 48)
                      </span>
                      <ChevronRight
                        size={14}
                        style={{
                          color: "var(--ink-dim)",
                          transform: showCeForm ? "rotate(90deg)" : "none",
                          transition: "transform 0.15s ease",
                        }}
                      />
                    </button>
                    {showCeForm && (
                      <div style={{
                        padding: "12px 16px",
                        borderTop: "1px solid var(--border)",
                        display: "flex", flexDirection: "column", gap: "10px",
                      }}>
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink-muted)" }}>
                            <input
                              type="checkbox"
                              checked={ceHasPhysicalProduct}
                              onChange={(e) => setCeHasPhysicalProduct(e.target.checked)}
                            />
                            Produs fizic (nu doar software)
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--ink-muted)" }}>
                            <input
                              type="checkbox"
                              checked={ceHasNotifiedBody}
                              onChange={(e) => setCeHasNotifiedBody(e.target.checked)}
                            />
                            Notified body implicat (Anexa VII)
                          </label>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {CE_MARKING_CHECKLIST
                            .filter((item) => {
                              if (item.appliesTo === "physical-product" && !ceHasPhysicalProduct) return false
                              if (item.appliesTo === "digital-only" && ceHasPhysicalProduct) return false
                              if (item.appliesTo === "notified-body-route" && !ceHasNotifiedBody) return false
                              return true
                            })
                            .map((item) => {
                              const current = ceAnswers[item.id] ?? "no"
                              return (
                                <div key={item.id} style={{
                                  display: "flex", flexDirection: "column", gap: "6px",
                                  padding: "8px 10px",
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                }}>
                                  <p style={{ fontSize: "12px", color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>
                                    {item.question}
                                  </p>
                                  <p style={{ fontSize: "10px", color: "var(--ink-subtle)", margin: 0, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                    {item.legalRef}
                                  </p>
                                  <div style={{ display: "flex", gap: "6px" }}>
                                    {(["yes", "no", "na"] as const).map((opt) => (
                                      <button
                                        key={opt}
                                        type="button"
                                        onClick={() => setCeAnswers((prev) => ({ ...prev, [item.id]: opt }))}
                                        style={{
                                          padding: "3px 10px",
                                          borderRadius: "12px",
                                          border: current === opt ? "1px solid var(--cobalt-600)" : "1px solid var(--border-strong)",
                                          background: current === opt ? "var(--cobalt-soft)" : "transparent",
                                          color: current === opt ? "var(--cobalt-400)" : "var(--ink-muted)",
                                          fontSize: "11px",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {opt === "yes" ? "Da" : opt === "no" ? "Nu" : "N/A"}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                        <button
                          onClick={() => void handleGenerateCeChecklist()}
                          disabled={generatingCe}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                            padding: "10px 16px", borderRadius: "6px",
                            border: "1px solid var(--border-strong)", background: "transparent",
                            fontSize: "13px", color: "var(--ink-muted)", cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {generatingCe ? (
                            <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se generează...</>
                          ) : (
                            <><Download size={14} strokeWidth={2} /> Descarcă Checklist CE</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gap analysis */}
                  {savedResult && savedResult.gaps.length > 0 && (
                    <div style={{
                      background: "var(--bg-raised)", borderRadius: "8px",
                      border: "1px solid var(--border)", overflow: "hidden",
                    }}>
                      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                          Gap analysis — {savedResult.gaps.length} lacun{savedResult.gaps.length !== 1 ? "e" : "ă"} identificat{savedResult.gaps.length !== 1 ? "e" : "ă"}
                        </p>
                      </div>
                      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {savedResult.gaps.map((gap) => (
                          <GapItem key={gap.questionId} gap={gap} />
                        ))}
                      </div>
                    </div>
                  )}

                  {savedResult && savedResult.gaps.length === 0 && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "14px 16px", background: "var(--emerald-soft)",
                      borderRadius: "8px", border: "1px solid rgba(52,211,153,0.2)",
                    }}>
                      <CheckCircle2 size={16} style={{ color: "var(--emerald-400)", flexShrink: 0 }} strokeWidth={2} />
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--emerald-400)", margin: 0 }}>
                          Evaluare completă
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--emerald-400)", marginTop: "2px", opacity: 0.8 }}>
                          Nicio lacună identificată la răspunsurile furnizate.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
