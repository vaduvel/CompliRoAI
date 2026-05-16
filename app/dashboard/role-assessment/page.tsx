"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  HelpCircle,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react"

import { ROLE_LABELS } from "@/lib/compliance/role-classifier"
import type {
  AIActRole,
  RoleAssessment,
  RoleAssessmentAnswer,
  RoleAssessmentAnswers,
} from "@/lib/compliance/types"

type AnswerKey = keyof RoleAssessmentAnswers

type Question = {
  key: AnswerKey
  title: string
  hint: string
  yesMeans: string
  noMeans: string
}

const QUESTIONS: Question[] = [
  {
    key: "developsAI",
    title: "Dezvolți sisteme AI proprii?",
    hint: "Antrenezi, fine-tunezi sau construiești modele/sisteme AI in-house (chiar dacă pornești de la modele open-source).",
    yesMeans: "Ai echipă proprie de ML sau folosești framework-uri pentru a construi soluții AI.",
    noMeans: "Folosești doar produse AI cumpărate / SaaS de la alți furnizori.",
  },
  {
    key: "sellsToThirdParties",
    title: "Vinzi sau oferi sistemele AI dezvoltate către terți?",
    hint: "Le pui pe piață sub propriul nume sau marcă (SaaS, licență, API public, white-label).",
    yesMeans: "Clienții externi accesează AI-ul tău contra cost sau gratuit, sub brand-ul tău.",
    noMeans: "Folosești AI-ul exclusiv intern și nu-l comercializezi.",
  },
  {
    key: "usesAIInternally",
    title: "Folosești sisteme AI în activitatea internă?",
    hint: "HR (screening CV), marketing (personalizare), ops (chatbots interni), finance (fraud detection) etc.",
    yesMeans: "Ai cel puțin un AI integrat în procesele tale de business.",
    noMeans: "Nu folosești AI în activitate (sau doar pentru research personal).",
  },
  {
    key: "importsFromNonEU",
    title: "Importi sisteme AI de la furnizori non-EU pe piața UE?",
    hint: "Aduci pe piața EU produse AI de la furnizori din SUA, UK, Asia etc. (chiar dacă le redistribui sub propriul brand).",
    yesMeans: "Ești prima entitate EU care pune sistemul pe piață internă.",
    noMeans: "Toți furnizorii tăi AI sunt din EU sau folosești doar AI propriu.",
  },
  {
    key: "distributesThirdPartyAI",
    title: "Distribui (revinzi) sisteme AI ale altor companii?",
    hint: "Ești reseller, integrator sau marketplace pentru produse AI ale altor furnizori.",
    yesMeans: "Vinzi mai departe AI-ul unui terț (cu sau fără adaptare).",
    noMeans: "Nu redistribui AI-uri terțe sub brand-ul tău.",
  },
  {
    key: "embedsAIInPhysicalProducts",
    title: "Integrezi AI ca safety component în produse fizice?",
    hint: "Mașini, dispozitive medicale, mașini industriale, jucării, lifturi — orice produs reglementat (Annex I).",
    yesMeans: "Produsul tău fizic conține AI care impactează siguranța utilizatorilor.",
    noMeans: "Nu fabrici produse fizice cu AI integrat.",
  },
  {
    key: "personalNonCommercialUseOnly",
    title: "Sistemul AI este pentru uz pur personal, non-comercial?",
    hint: "Excepție Art. 2(10): persoane fizice care folosesc AI exclusiv în viața privată, nelegate de activitate profesională.",
    yesMeans: "Folosești AI strict ca persoană fizică, în afara oricărei activități profesionale.",
    noMeans: "AI-ul e folosit într-un context profesional / de business (chiar și solo).",
  },
  {
    key: "militaryOrResearchOnly",
    title: "Sistemul AI este doar pentru cercetare științifică sau scopuri militare?",
    hint: "Excepție Art. 2(3) (militar) și Art. 2(6) (cercetare). Atenție: nu se aplică testării în condiții reale (Art. 2(8)).",
    yesMeans: "Sistemul rămâne în mediul de cercetare/militar fără a intra în uz comercial sau testare reală.",
    noMeans: "Sistemul are sau va avea folosință comercială / operațională.",
  },
]

const ROLE_BADGE_COLOR: Record<AIActRole, { bg: string; fg: string }> = {
  provider: { bg: "rgba(99,102,241,0.15)", fg: "#818cf8" },
  deployer: { bg: "rgba(34,197,94,0.15)", fg: "#22c55e" },
  importer: { bg: "rgba(234,179,8,0.15)", fg: "#eab308" },
  distributor: { bg: "rgba(244,114,182,0.15)", fg: "#f472b6" },
  manufacturer: { bg: "rgba(249,115,22,0.15)", fg: "#f97316" },
  mixed: { bg: "rgba(168,85,247,0.15)", fg: "#a855f7" },
  exempt: { bg: "rgba(100,116,139,0.15)", fg: "#94a3b8" },
}

type Mode = "loading" | "wizard" | "submitting" | "result"

export default function RoleAssessmentPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("loading")
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Partial<RoleAssessmentAnswers>>({})
  const [existing, setExisting] = useState<RoleAssessment | null>(null)
  const [result, setResult] = useState<RoleAssessment | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/role-assessment")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.assessment) {
          setExisting(data.assessment as RoleAssessment)
          setResult(data.assessment as RoleAssessment)
          setMode("result")
        } else {
          setMode("wizard")
        }
      })
      .catch(() => setMode("wizard"))
  }, [])

  const totalSteps = QUESTIONS.length
  const currentQuestion = QUESTIONS[stepIdx]
  const currentAnswer = currentQuestion ? answers[currentQuestion.key] : undefined

  const allAnswered = useMemo(
    () => QUESTIONS.every((q) => Boolean(answers[q.key])),
    [answers]
  )

  function setAnswer(value: RoleAssessmentAnswer) {
    if (!currentQuestion) return
    setAnswers((prev) => ({ ...prev, [currentQuestion.key]: value }))
  }

  function next() {
    if (!currentAnswer) return
    if (stepIdx < totalSteps - 1) setStepIdx((i) => i + 1)
  }

  function prev() {
    if (stepIdx > 0) setStepIdx((i) => i - 1)
  }

  async function submit() {
    if (!allAnswered) return
    setMode("submitting")
    setError(null)
    try {
      const res = await fetch("/api/role-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Eroare ${res.status}`)
        setMode("wizard")
        return
      }
      const data = await res.json()
      setResult(data.assessment as RoleAssessment)
      setMode("result")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la trimitere.")
      setMode("wizard")
    }
  }

  function restart() {
    setAnswers({})
    setResult(null)
    setExisting(null)
    setStepIdx(0)
    setMode("wizard")
  }

  if (mode === "loading") {
    return (
      <div style={{ padding: "32px", color: "var(--ink-muted)" }}>
        <Loader2 size={16} className="spin" style={{ verticalAlign: "middle", marginRight: "8px" }} />
        Se încarcă evaluarea...
        <style jsx>{`
          .spin {
            animation: spin 1s linear infinite;
            display: inline-block;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "780px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
        <div
          style={{
            background: "var(--cobalt-soft)",
            color: "var(--cobalt-400)",
            padding: "10px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Compass size={20} />
        </div>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            AI Act Role Assessment
          </h1>
          <p
            style={{
              fontSize: "13px",
              color: "var(--ink-muted)",
              marginTop: "6px",
              maxWidth: "640px",
              lineHeight: 1.55,
            }}
          >
            Răspuns la întrebarea juridică #1 din EU AI Act:{" "}
            <strong>cine sunt eu — provider, deployer, importer, distributor sau manufacturer?</strong>{" "}
            Răspunde la 8 întrebări scurte (~5 minute) — vei primi un memo cu rolul tău, obligațiile aplicabile și pașii imediați.
          </p>
        </div>
      </div>

      {mode === "result" && result ? (
        <ResultPanel
          assessment={result}
          onRestart={restart}
          isExisting={Boolean(existing && existing.id === result.id)}
          onGoToReadinessPack={() => router.push("/dashboard/readiness-pack")}
        />
      ) : (
        <WizardPanel
          stepIdx={stepIdx}
          totalSteps={totalSteps}
          question={currentQuestion}
          answer={currentAnswer}
          onChange={setAnswer}
          onNext={next}
          onPrev={prev}
          canSubmit={allAnswered}
          onSubmit={submit}
          submitting={mode === "submitting"}
          error={error}
          answeredCount={Object.keys(answers).length}
        />
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Wizard panel
// ────────────────────────────────────────────────────────────────────────────

function WizardPanel(props: {
  stepIdx: number
  totalSteps: number
  question: Question
  answer: RoleAssessmentAnswer | undefined
  onChange: (v: RoleAssessmentAnswer) => void
  onNext: () => void
  onPrev: () => void
  canSubmit: boolean
  onSubmit: () => void
  submitting: boolean
  error: string | null
  answeredCount: number
}) {
  const {
    stepIdx,
    totalSteps,
    question,
    answer,
    onChange,
    onNext,
    onPrev,
    canSubmit,
    onSubmit,
    submitting,
    error,
    answeredCount,
  } = props
  const isLast = stepIdx === totalSteps - 1

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Progress */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "var(--ink-dim)",
            marginBottom: "6px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          <span>
            Întrebarea {stepIdx + 1} din {totalSteps}
          </span>
          <span>{answeredCount} / {totalSteps} răspunse</span>
        </div>
        <div
          style={{
            height: "4px",
            background: "var(--bg-hover)",
            borderRadius: "999px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${((stepIdx + 1) / totalSteps) * 100}%`,
              height: "100%",
              background: "var(--cobalt-400)",
              transition: "width 200ms ease",
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {question.title}
        </h2>
        <p
          style={{
            fontSize: "13px",
            color: "var(--ink-muted)",
            marginTop: "8px",
            lineHeight: 1.55,
          }}
        >
          <HelpCircle
            size={12}
            style={{ display: "inline", verticalAlign: "middle", marginRight: "6px", color: "var(--ink-dim)" }}
          />
          {question.hint}
        </p>
      </div>

      {/* Answer options */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
        <AnswerOption
          label="Da"
          description={question.yesMeans}
          selected={answer === "yes"}
          onClick={() => onChange("yes")}
          tone="positive"
        />
        <AnswerOption
          label="Nu"
          description={question.noMeans}
          selected={answer === "no"}
          onClick={() => onChange("no")}
          tone="negative"
        />
        <AnswerOption
          label="Nu sunt sigur"
          description="Marchează ca incert — vei primi recomandarea de re-evaluare."
          selected={answer === "unsure"}
          onClick={() => onChange("unsure")}
          tone="neutral"
        />
      </div>

      {error && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(248,113,113,0.15)",
            border: "1px solid rgba(248,113,113,0.25)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "#ef4444",
          }}
        >
          <AlertCircle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
          {error}
        </div>
      )}

      {/* Nav buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginTop: "4px",
        }}
      >
        <button
          onClick={onPrev}
          disabled={stepIdx === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: stepIdx === 0 ? "var(--ink-dim)" : "var(--ink)",
            borderRadius: "6px",
            fontSize: "13px",
            cursor: stepIdx === 0 ? "not-allowed" : "pointer",
            opacity: stepIdx === 0 ? 0.5 : 1,
          }}
        >
          <ArrowLeft size={14} />
          Înapoi
        </button>

        {!isLast ? (
          <button
            onClick={onNext}
            disabled={!answer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              border: "none",
              background: answer ? "var(--cobalt-400)" : "var(--bg-hover)",
              color: answer ? "#fff" : "var(--ink-dim)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: answer ? "pointer" : "not-allowed",
            }}
          >
            Mai departe
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              border: "none",
              background: canSubmit && !submitting ? "var(--cobalt-400)" : "var(--bg-hover)",
              color: canSubmit && !submitting ? "#fff" : "var(--ink-dim)",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 600,
              cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {submitting ? "Calculăm rolul..." : "Calculează rolul"}
          </button>
        )}
      </div>
    </div>
  )
}

function AnswerOption(props: {
  label: string
  description: string
  selected: boolean
  onClick: () => void
  tone: "positive" | "negative" | "neutral"
}) {
  const { label, description, selected, onClick } = props
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "6px",
        padding: "12px 14px",
        borderRadius: "8px",
        border: selected ? "1px solid var(--cobalt-400)" : "1px solid var(--border-strong)",
        background: selected ? "var(--cobalt-soft)" : "var(--bg)",
        color: "var(--ink)",
        cursor: "pointer",
        textAlign: "left",
        transition: "all 120ms",
        minHeight: "84px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: selected ? "var(--cobalt-400)" : "var(--ink)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "11px", color: "var(--ink-muted)", lineHeight: 1.45 }}>
        {description}
      </div>
    </button>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Result panel
// ────────────────────────────────────────────────────────────────────────────

function ResultPanel(props: {
  assessment: RoleAssessment
  isExisting: boolean
  onRestart: () => void
  onGoToReadinessPack: () => void
}) {
  const { assessment, isExisting, onRestart, onGoToReadinessPack } = props
  const colors = ROLE_BADGE_COLOR[assessment.primaryRole]
  const date = new Date(assessment.answeredAtISO).toLocaleString("ro-RO")

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      {/* Status banner */}
      {isExisting && (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--cobalt-soft)",
            border: "1px solid var(--cobalt-400)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--cobalt-400)",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <CheckCircle2 size={12} />
          Evaluare existentă afișată. Re-evaluează dacă scope-ul s-a schimbat.
        </div>
      )}

      {/* Primary role badge */}
      <div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--ink-dim)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          Rolul tău principal
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            borderRadius: "8px",
            background: colors.bg,
            color: colors.fg,
            fontSize: "18px",
            fontWeight: 700,
          }}
        >
          {ROLE_LABELS[assessment.primaryRole]}
        </div>
        {assessment.secondaryRoles.length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--ink-muted)" }}>
            Roluri secundare:{" "}
            {assessment.secondaryRoles.map((r, i) => (
              <span key={r}>
                {i > 0 ? ", " : ""}
                <strong>{ROLE_LABELS[r]}</strong>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Reasoning */}
      <Section title="Justificare">
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
          {assessment.reasoning}
        </p>
      </Section>

      {/* Articles */}
      {assessment.applicableArticles.length > 0 && (
        <Section title="Obligații aplicabile">
          <ul
            style={{
              margin: 0,
              paddingLeft: "20px",
              fontSize: "13px",
              color: "var(--ink-muted)",
              lineHeight: 1.7,
            }}
          >
            {assessment.applicableArticles.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
      )}

      {/* Scope exceptions */}
      {assessment.scopeExceptions.length > 0 && (
        <Section title="Excepții invocate (Art. 2)">
          <ul
            style={{
              margin: 0,
              paddingLeft: "20px",
              fontSize: "13px",
              color: "var(--ink-muted)",
              lineHeight: 1.7,
            }}
          >
            {assessment.scopeExceptions.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Section>
      )}

      <div
        style={{
          fontSize: "11px",
          color: "var(--ink-dim)",
          paddingTop: "8px",
          borderTop: "1px solid var(--border-soft)",
        }}
      >
        Evaluat de <code>{assessment.answeredByEmail || "—"}</code> la {date}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          onClick={onGoToReadinessPack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            border: "none",
            background: "var(--cobalt-400)",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Sparkles size={14} />
          Generează Readiness Pack
        </button>
        <button
          onClick={onRestart}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 16px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            color: "var(--ink)",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <RefreshCw size={14} />
          Re-evaluează
        </button>
      </div>
    </div>
  )
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        {props.title}
      </div>
      {props.children}
    </div>
  )
}
