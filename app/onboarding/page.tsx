"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  classifyAISystem,
  RISK_LEVEL_LABELS,
  type AIActRiskLevel,
} from "@/lib/compliance/ai-act-classifier"
import type { AISystemPurpose, LiteracyRecord } from "@/lib/compliance/types"

type Sector =
  | "saas"
  | "fintech"
  | "consulting"
  | "ecommerce"
  | "industrial"
  | "healthcare"
  | "education"
  | "altele"

type EmployeeCount = "<10" | "10-49" | "50-249" | "250+"

type CompanyInfo = {
  cui: string
  sector: Sector | ""
  employeeCount: EmployeeCount | ""
}

type FirstSystem = {
  name: string
  purpose: AISystemPurpose | ""
  vendor: string
  skipped: boolean
}

type FirstLiteracy = {
  employeeName: string
  trainingDate: string
  trainingType: LiteracyRecord["trainingType"]
  durationHours: number
  skipped: boolean
}

const SECTORS: { value: Sector; label: string }[] = [
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "consulting", label: "Consultanță" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "industrial", label: "Industrial" },
  { value: "healthcare", label: "Healthcare" },
  { value: "education", label: "Educație" },
  { value: "altele", label: "Altele" },
]

const EMPLOYEE_COUNTS: EmployeeCount[] = ["<10", "10-49", "50-249", "250+"]

const PURPOSES: { value: AISystemPurpose; label: string }[] = [
  { value: "hr-screening", label: "Filtru CV-uri / HR screening" },
  { value: "credit-scoring", label: "Credit scoring" },
  { value: "biometric-identification", label: "Identificare biometrică" },
  { value: "fraud-detection", label: "Detecție fraudă" },
  { value: "marketing-personalization", label: "Personalizare marketing" },
  { value: "support-chatbot", label: "Chatbot client / suport" },
  { value: "document-assistant", label: "Asistent documente" },
  { value: "other", label: "Altele" },
]

const RISK_COLOR: Record<AIActRiskLevel, string> = {
  prohibited: "var(--red-400)",
  high_risk: "var(--amber-400)",
  limited_risk: "var(--cobalt-400)",
  minimal_risk: "var(--emerald-400)",
}

function validCui(cui: string): boolean {
  const clean = cui.trim().toUpperCase()
  return /^(RO)?\d{2,10}$/.test(clean)
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [company, setCompany] = useState<CompanyInfo>({
    cui: "",
    sector: "",
    employeeCount: "",
  })

  const [system, setSystem] = useState<FirstSystem>({
    name: "",
    purpose: "",
    vendor: "",
    skipped: false,
  })

  const [literacy, setLiteracy] = useState<FirstLiteracy>({
    employeeName: "",
    trainingDate: new Date().toISOString().slice(0, 10),
    trainingType: "intern",
    durationHours: 1,
    skipped: false,
  })

  const classification = useMemo(() => {
    if (!system.purpose || system.skipped) return null
    return classifyAISystem(system.purpose)
  }, [system.purpose, system.skipped])

  const canProceedStep1 =
    validCui(company.cui) && !!company.sector && !!company.employeeCount
  const canProceedStep2 = system.skipped || (system.name.trim().length > 1 && !!system.purpose)
  const canProceedStep3 =
    literacy.skipped ||
    (literacy.employeeName.trim().length > 1 &&
      !!literacy.trainingDate &&
      literacy.durationHours > 0)

  async function handleFinish() {
    setSubmitting(true)
    setError("")
    try {
      const payload: Record<string, unknown> = {
        companyInfo: {
          cui: company.cui.trim().toUpperCase(),
          sector: company.sector || undefined,
          employeeCount: company.employeeCount || undefined,
        },
      }
      if (!system.skipped && system.name && system.purpose) {
        payload.firstSystem = {
          name: system.name.trim(),
          purpose: system.purpose,
          vendor: system.vendor.trim() || undefined,
        }
      }
      if (!literacy.skipped && literacy.employeeName && literacy.trainingDate) {
        payload.firstLiteracy = {
          employeeName: literacy.employeeName.trim(),
          trainingDate: literacy.trainingDate,
          trainingType: literacy.trainingType,
          durationHours: literacy.durationHours,
        }
      }
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Eroare la salvare")
        setSubmitting(false)
        return
      }
      router.push("/dashboard/sisteme")
      router.refresh()
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
      setSubmitting(false)
    }
  }

  function handleNext() {
    setError("")
    if (step === 1 && canProceedStep1) setStep(2)
    else if (step === 2 && canProceedStep2) setStep(3)
    else if (step === 3 && canProceedStep3) setStep(4)
  }

  function handleBack() {
    setError("")
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(3)
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "700px",
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "14px",
          padding: "36px 40px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            AI Act Compliance
          </div>
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "4px" }}>
            Setup în 4 pași — durează ~2 minute
          </div>
        </div>

        {/* Progress */}
        <ProgressDots step={step} />

        {/* Step content */}
        <div style={{ marginTop: "28px", minHeight: "320px" }}>
          {step === 1 && (
            <Step1
              company={company}
              setCompany={setCompany}
            />
          )}
          {step === 2 && (
            <Step2
              system={system}
              setSystem={setSystem}
              classification={classification}
            />
          )}
          {step === 3 && (
            <Step3
              literacy={literacy}
              setLiteracy={setLiteracy}
            />
          )}
          {step === 4 && (
            <Step4
              company={company}
              system={system}
              literacy={literacy}
              classification={classification}
            />
          )}
        </div>

        {error && (
          <div
            style={{
              marginTop: "16px",
              fontSize: "13px",
              color: "var(--red-400)",
              background: "var(--red-soft)",
              padding: "10px 12px",
              borderRadius: "6px",
            }}
          >
            {error}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            marginTop: "28px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1 || submitting}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: step === 1 ? "var(--ink-subtle)" : "var(--ink-muted)",
              fontSize: "13px",
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.5 : 1,
            }}
          >
            Înapoi
          </button>

          <div style={{ fontSize: "12px", color: "var(--ink-subtle)" }}>
            Pas {step} din 4
          </div>

          {step < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "var(--cobalt-600)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                opacity:
                  (step === 1 && !canProceedStep1) ||
                  (step === 2 && !canProceedStep2) ||
                  (step === 3 && !canProceedStep3)
                    ? 0.5
                    : 1,
              }}
            >
              Continuă
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={submitting}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "var(--cobalt-600)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Se salvează..." : "Intră în dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ProgressDots({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
      {[1, 2, 3, 4].map((n) => {
        const active = n === step
        const past = n < step
        return (
          <div
            key={n}
            style={{
              width: active ? "28px" : "10px",
              height: "10px",
              borderRadius: "999px",
              background: active
                ? "var(--cobalt-500)"
                : past
                  ? "var(--cobalt-soft-strong)"
                  : "var(--border-strong)",
              transition: "width 200ms ease",
            }}
          />
        )
      })}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "12px",
        color: "var(--ink-muted)",
        marginBottom: "6px",
        fontWeight: 500,
      }}
    >
      {children}
    </label>
  )
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-hover)",
  border: "1px solid var(--border-strong)",
  borderRadius: "8px",
  padding: "10px 14px",
  color: "var(--ink)",
  fontSize: "14px",
  outline: "none",
}

function Step1({
  company,
  setCompany,
}: {
  company: CompanyInfo
  setCompany: (c: CompanyInfo) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "4px",
          }}
        >
          Despre firma ta
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
          Detalii de bază pentru a personaliza obligațiile.
        </div>
      </div>

      <div>
        <FieldLabel>CUI / Cod fiscal</FieldLabel>
        <input
          type="text"
          value={company.cui}
          onChange={(e) => setCompany({ ...company, cui: e.target.value })}
          placeholder="RO12345678"
          style={inputBase}
        />
      </div>

      <div>
        <FieldLabel>Sector activitate</FieldLabel>
        <select
          value={company.sector}
          onChange={(e) =>
            setCompany({ ...company, sector: e.target.value as Sector })
          }
          style={inputBase}
        >
          <option value="">Alege sectorul…</option>
          {SECTORS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <FieldLabel>Număr angajați</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
          {EMPLOYEE_COUNTS.map((ec) => {
            const active = company.employeeCount === ec
            return (
              <button
                type="button"
                key={ec}
                onClick={() => setCompany({ ...company, employeeCount: ec })}
                style={{
                  padding: "10px 8px",
                  borderRadius: "8px",
                  border: active
                    ? "1px solid var(--cobalt-500)"
                    : "1px solid var(--border-strong)",
                  background: active ? "var(--cobalt-soft)" : "var(--bg-hover)",
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {ec}
              </button>
            )
          })}
        </div>
      </div>

      <div
        style={{
          background: "var(--cobalt-soft)",
          border: "1px solid var(--cobalt-soft-strong)",
          borderRadius: "8px",
          padding: "12px 14px",
          fontSize: "12.5px",
          color: "var(--ink-muted)",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "var(--ink)" }}>AI Act se aplică tuturor.</strong> Indiferent
        de mărime, dacă folosești sisteme AI ai obligații. Limita SME pentru reduceri de
        amenzi: 750 angajați + €150M cifră de afaceri (extinsă prin Omnibus, 7 mai 2026).
      </div>
    </div>
  )
}

function Step2({
  system,
  setSystem,
  classification,
}: {
  system: FirstSystem
  setSystem: (s: FirstSystem) => void
  classification: ReturnType<typeof classifyAISystem> | null
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "4px",
          }}
        >
          Primul tău sistem AI
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
          Adaugă cel puțin un sistem AI pe care firma ta îl folosește. Vei putea adăuga mai
          multe după ce intri în platformă.
        </div>
      </div>

      {!system.skipped && (
        <>
          <div>
            <FieldLabel>Nume sistem</FieldLabel>
            <input
              type="text"
              value={system.name}
              onChange={(e) => setSystem({ ...system, name: e.target.value })}
              placeholder="Ex: Chatbot client, Filtru CV-uri, Recomandări produs"
              style={inputBase}
            />
          </div>

          <div>
            <FieldLabel>Scop / Purpose</FieldLabel>
            <select
              value={system.purpose}
              onChange={(e) =>
                setSystem({ ...system, purpose: e.target.value as AISystemPurpose })
              }
              style={inputBase}
            >
              <option value="">Alege scopul…</option>
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <FieldLabel>Vendor (opțional)</FieldLabel>
            <input
              type="text"
              value={system.vendor}
              onChange={(e) => setSystem({ ...system, vendor: e.target.value })}
              placeholder="Ex: OpenAI, Anthropic, intern"
              style={inputBase}
            />
          </div>

          {classification && (
            <div
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--border-strong)",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div
                style={{
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "var(--ink-subtle)",
                  marginBottom: "6px",
                }}
              >
                Clasificare preliminară
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: RISK_COLOR[classification.riskLevel],
                  marginBottom: "4px",
                }}
              >
                {RISK_LEVEL_LABELS[classification.riskLevel]}
              </div>
              <div style={{ fontSize: "12.5px", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                {classification.reason}
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--ink-dim)", marginTop: "6px" }}>
                Articol: {classification.article}
              </div>
            </div>
          )}
        </>
      )}

      {system.skipped && (
        <div
          style={{
            background: "var(--bg-elev)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "10px",
            padding: "20px",
            textAlign: "center",
            color: "var(--ink-dim)",
            fontSize: "13px",
          }}
        >
          Ai sărit peste pasul de inventar AI. Vei putea adăuga sisteme oricând din
          dashboard.
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setSystem({ ...system, skipped: !system.skipped, name: "", purpose: "", vendor: "" })
        }
        style={{
          background: "none",
          border: "none",
          color: "var(--cobalt-400)",
          fontSize: "12.5px",
          cursor: "pointer",
          alignSelf: "flex-start",
          padding: 0,
        }}
      >
        {system.skipped
          ? "Adaug un sistem AI acum"
          : "Sar peste — nu folosim sisteme AI încă"}
      </button>
    </div>
  )
}

function Step3({
  literacy,
  setLiteracy,
}: {
  literacy: FirstLiteracy
  setLiteracy: (l: FirstLiteracy) => void
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "4px",
          }}
        >
          AI Literacy — primul training
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", lineHeight: 1.5 }}>
          Art. 4 AI Act este obligație <strong>activă din 2 februarie 2025</strong>.
          Documentează cel puțin un training pentru angajații care folosesc sisteme AI.
        </div>
      </div>

      {!literacy.skipped && (
        <>
          <div>
            <FieldLabel>Cine a participat</FieldLabel>
            <input
              type="text"
              value={literacy.employeeName}
              onChange={(e) =>
                setLiteracy({ ...literacy, employeeName: e.target.value })
              }
              placeholder='Ex: "Echipa de marketing", "Toți angajații" sau un nume'
              style={inputBase}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <FieldLabel>Data training</FieldLabel>
              <input
                type="date"
                value={literacy.trainingDate}
                onChange={(e) =>
                  setLiteracy({ ...literacy, trainingDate: e.target.value })
                }
                style={inputBase}
              />
            </div>
            <div>
              <FieldLabel>Durata (h)</FieldLabel>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={literacy.durationHours}
                onChange={(e) =>
                  setLiteracy({
                    ...literacy,
                    durationHours: Number(e.target.value) || 0,
                  })
                }
                style={inputBase}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Tip training</FieldLabel>
            <select
              value={literacy.trainingType}
              onChange={(e) =>
                setLiteracy({
                  ...literacy,
                  trainingType: e.target.value as LiteracyRecord["trainingType"],
                })
              }
              style={inputBase}
            >
              <option value="intern">Intern</option>
              <option value="extern">Extern</option>
              <option value="platforma-online">Platformă online</option>
              <option value="workshop">Workshop</option>
            </select>
          </div>
        </>
      )}

      {literacy.skipped && (
        <div
          style={{
            background: "var(--amber-soft)",
            border: "1px solid var(--amber-500)",
            borderRadius: "10px",
            padding: "14px 16px",
            fontSize: "12.5px",
            color: "var(--ink-muted)",
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: "var(--amber-400)" }}>Atenție:</strong> Art. 4 este o
          obligație activă. Lipsa training-urilor AI Literacy poate genera findings deschise
          în Dosarul tău. Poți documenta oricând din dashboard.
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setLiteracy({
            ...literacy,
            skipped: !literacy.skipped,
            employeeName: "",
          })
        }
        style={{
          background: "none",
          border: "none",
          color: "var(--cobalt-400)",
          fontSize: "12.5px",
          cursor: "pointer",
          alignSelf: "flex-start",
          padding: 0,
        }}
      >
        {literacy.skipped
          ? "Documentez un training acum"
          : "Sar peste — voi face training mai târziu"}
      </button>
    </div>
  )
}

function Step4({
  company,
  system,
  literacy,
  classification,
}: {
  company: CompanyInfo
  system: FirstSystem
  literacy: FirstLiteracy
  classification: ReturnType<typeof classifyAISystem> | null
}) {
  const summaryParts: string[] = []
  if (company.cui) summaryParts.push(`CUI ${company.cui.toUpperCase()}`)
  if (!system.skipped && system.name && classification) {
    summaryParts.push(
      `1 sistem AI (${system.name} · ${RISK_LEVEL_LABELS[classification.riskLevel]})`
    )
  }
  if (!literacy.skipped && literacy.employeeName) {
    summaryParts.push("1 training AI Literacy documentat")
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div
          style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "24px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
            marginBottom: "6px",
          }}
        >
          Bun venit în AI Act Compliance
        </div>
        <div style={{ fontSize: "13.5px", color: "var(--ink-dim)" }}>
          Setup-ul tău este gata. Iată ce am configurat:
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--border-strong)",
          borderRadius: "10px",
          padding: "16px 18px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--ink-subtle)",
            marginBottom: "8px",
          }}
        >
          Sumar
        </div>
        <div style={{ fontSize: "13.5px", color: "var(--ink)", lineHeight: 1.6 }}>
          {summaryParts.length > 0 ? summaryParts.join(" · ") : "Setup minimal salvat."}
        </div>
      </div>

      <div
        style={{
          background: "var(--cobalt-soft)",
          border: "1px solid var(--cobalt-soft-strong)",
          borderRadius: "10px",
          padding: "14px 16px",
        }}
      >
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "8px",
          }}
        >
          Următorii pași recomandați
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: "18px",
            fontSize: "12.5px",
            color: "var(--ink-muted)",
            lineHeight: 1.7,
          }}
        >
          <li>Completează evaluarea de conformitate</li>
          <li>Generează Annex IV pentru sistemele high-risk</li>
          <li>Documentează mai multe training-uri AI Literacy</li>
        </ul>
      </div>
    </div>
  )
}
