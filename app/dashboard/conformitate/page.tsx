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
  buildAnnexIVDocument,
  scoreAssessment,
  type AssessmentAnswer,
  type AssessmentAnswers,
  type AssessmentResult,
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

  const liveResult = scoreAssessment(answers)
  const answeredCount = Object.keys(answers).length
  const allAnswered = answeredCount === AI_CONFORMITY_QUESTIONS.length

  if (loadingSystems) {
    return (
      <div style={{ padding: "32px", display: "flex", alignItems: "center", gap: "8px", color: "var(--ink-dim)", fontSize: "13px" }}>
        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Se încarcă...
      </div>
    )
  }

  return (
    <div style={{ padding: "32px", maxWidth: "960px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "22px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: 0,
          letterSpacing: "-0.02em",
        }}>
          Evaluare Conformitate
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Workflow 10 întrebări · EU AI Act 2024/1689 · Identifică lacune și generează plan de remediere
        </p>
      </div>

      {/* Error / success banners */}
      {error && (
        <div style={{
          display: "flex", gap: "10px", padding: "12px 16px",
          background: "var(--red-soft)", borderRadius: "8px",
          border: "1px solid rgba(248,113,113,0.2)",
          fontSize: "13px", color: "var(--red-400)",
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{
          display: "flex", gap: "10px", padding: "12px 16px",
          background: "var(--emerald-soft)", borderRadius: "8px",
          border: "1px solid rgba(52,211,153,0.2)",
          fontSize: "13px", color: "var(--emerald-400)",
        }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "1px" }} />
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
