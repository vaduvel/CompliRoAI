"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import {
  classifyAISystem,
  RISK_LEVEL_LABELS,
  type AIActRiskLevel,
} from "@/lib/compliance/ai-act-classifier"
import type { AISystemPurpose, LiteracyRecord } from "@/lib/compliance/types"

/**
 * Sprint 015 — 3-mode onboarding aligned with mandate § 16:
 *   - imm-classic: companies using AI internally/externally
 *   - ai-builder : companies building AI
 *   - cabinet    : DPOs / consultants / lawyers managing portfolios
 *
 * Legacy "solo" still flows server-side via normalizeWorkspaceMode().
 */
type OnboardingRole = "imm-classic" | "ai-builder" | "cabinet"

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

type CabinetInfo = {
  cabinetName: string
  clientScale: "1-5" | "5-20" | "20+" | ""
}

type BuilderInfo = {
  ctoEmail: string
  firstModelDeployed: string
  customerFacing: boolean | null
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

// Step model per role:
//   imm-classic: 0 (role) → 1 (company) → 2 (system) → 3 (literacy) → 4 (recap) = 5 steps
//   ai-builder : 0 (role) → 1 (company) → 2 (builder info) → 3 (recap) = 4 steps
//   cabinet    : 0 (role) → 1 (cabinet name + scale) → 2 (first client) → 3 (recap) = 4 steps
export default function OnboardingPage() {
  const router = useRouter()

  const [role, setRole] = useState<OnboardingRole | "">("")
  const [step, setStep] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [company, setCompany] = useState<CompanyInfo>({
    cui: "",
    sector: "",
    employeeCount: "",
  })

  const [cabinet, setCabinet] = useState<CabinetInfo>({
    cabinetName: "",
    clientScale: "",
  })

  const [builder, setBuilder] = useState<BuilderInfo>({
    ctoEmail: "",
    firstModelDeployed: "",
    customerFacing: null,
  })

  const [firstClient, setFirstClient] = useState<{ name: string; cui: string; skipped: boolean }>({
    name: "",
    cui: "",
    skipped: false,
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

  const isImmClassic = role === "imm-classic"
  const isCabinet = role === "cabinet"
  const isAiBuilder = role === "ai-builder"

  const totalSteps = isImmClassic ? 5 : 4

  const canProceedRole = role === "imm-classic" || role === "cabinet" || role === "ai-builder"
  const canProceedStep1Imm =
    validCui(company.cui) && !!company.sector && !!company.employeeCount
  const canProceedStep1Cabinet =
    cabinet.cabinetName.trim().length > 1 && !!cabinet.clientScale
  const canProceedStep2Imm =
    system.skipped || (system.name.trim().length > 1 && !!system.purpose)
  const canProceedStep2Cabinet =
    firstClient.skipped ||
    (firstClient.name.trim().length > 1 && (firstClient.cui === "" || validCui(firstClient.cui)))
  const canProceedStep3Imm =
    literacy.skipped ||
    (literacy.employeeName.trim().length > 1 &&
      !!literacy.trainingDate &&
      literacy.durationHours > 0)
  const canProceedStep2Builder = builder.customerFacing !== null

  async function handleFinish() {
    setSubmitting(true)
    setError("")
    try {
      const payload: Record<string, unknown> = { role }

      if (isImmClassic) {
        payload.companyInfo = {
          cui: company.cui.trim().toUpperCase(),
          sector: company.sector || undefined,
          employeeCount: company.employeeCount || undefined,
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
      } else if (isAiBuilder) {
        payload.companyInfo = {
          cui: company.cui.trim().toUpperCase(),
          sector: company.sector || undefined,
          employeeCount: company.employeeCount || undefined,
        }
        payload.builderInfo = {
          ctoEmail: builder.ctoEmail.trim() || undefined,
          firstModelDeployed: builder.firstModelDeployed.trim() || undefined,
          customerFacing: builder.customerFacing,
        }
      } else if (isCabinet) {
        payload.cabinetInfo = {
          cabinetName: cabinet.cabinetName.trim(),
          clientScale: cabinet.clientScale,
        }
        if (!firstClient.skipped && firstClient.name) {
          payload.firstClient = {
            name: firstClient.name.trim(),
            cui: firstClient.cui ? firstClient.cui.trim().toUpperCase() : undefined,
          }
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
      const data = await res.json().catch(() => ({}))
      const destination =
        typeof data?.destination === "string"
          ? data.destination
          : isCabinet
            ? "/dashboard/portofoliu"
            : isAiBuilder
              ? "/dashboard"
              : "/dashboard/sisteme"
      router.push(destination)
      router.refresh()
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
      setSubmitting(false)
    }
  }

  function canProceedFor(currentStep: number): boolean {
    if (currentStep === 0) return canProceedRole
    if (isImmClassic) {
      if (currentStep === 1) return canProceedStep1Imm
      if (currentStep === 2) return canProceedStep2Imm
      if (currentStep === 3) return canProceedStep3Imm
    }
    if (isAiBuilder) {
      if (currentStep === 1) return canProceedStep1Imm // same company info shape
      if (currentStep === 2) return canProceedStep2Builder
    }
    if (isCabinet) {
      if (currentStep === 1) return canProceedStep1Cabinet
      if (currentStep === 2) return canProceedStep2Cabinet
    }
    return true
  }

  function handleNext() {
    setError("")
    if (!canProceedFor(step)) return
    setStep((s) => s + 1)
  }

  function handleBack() {
    setError("")
    if (step === 0) return
    setStep((s) => s - 1)
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
          maxWidth: "720px",
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
            CompliRoAI · AI Act Compliance
          </div>
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "4px" }}>
            Setup în {totalSteps} pași — durează ~2 minute
          </div>
        </div>

        <ProgressDots step={step} total={totalSteps} />

        <div style={{ marginTop: "28px", minHeight: "340px" }}>
          {step === 0 && <StepRole role={role} setRole={setRole} />}

          {/* IMM-classic flow */}
          {isImmClassic && step === 1 && <Step1Company company={company} setCompany={setCompany} />}
          {isImmClassic && step === 2 && (
            <Step2Solo system={system} setSystem={setSystem} classification={classification} />
          )}
          {isImmClassic && step === 3 && <Step3Solo literacy={literacy} setLiteracy={setLiteracy} />}
          {isImmClassic && step === 4 && (
            <Step4SoloRecap
              company={company}
              system={system}
              literacy={literacy}
              classification={classification}
            />
          )}

          {/* AI Builder flow */}
          {isAiBuilder && step === 1 && (
            <Step1Company company={company} setCompany={setCompany} hint="ai-builder" />
          )}
          {isAiBuilder && step === 2 && (
            <Step2Builder builder={builder} setBuilder={setBuilder} />
          )}
          {isAiBuilder && step === 3 && <Step3BuilderRecap company={company} builder={builder} />}

          {/* Cabinet flow */}
          {isCabinet && step === 1 && (
            <Step1Cabinet cabinet={cabinet} setCabinet={setCabinet} />
          )}
          {isCabinet && step === 2 && (
            <Step2CabinetClient firstClient={firstClient} setFirstClient={setFirstClient} />
          )}
          {isCabinet && step === 3 && (
            <Step3CabinetRecap cabinet={cabinet} firstClient={firstClient} />
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
            disabled={step === 0 || submitting}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border-strong)",
              background: "transparent",
              color: step === 0 ? "var(--ink-subtle)" : "var(--ink-muted)",
              fontSize: "13px",
              cursor: step === 0 ? "not-allowed" : "pointer",
              opacity: step === 0 ? 0.5 : 1,
            }}
          >
            Înapoi
          </button>

          <div style={{ fontSize: "12px", color: "var(--ink-subtle)" }}>
            Pas {step + 1} din {totalSteps}
          </div>

          {step < totalSteps - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceedFor(step)}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background: "var(--cobalt-600)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: canProceedFor(step) ? "pointer" : "not-allowed",
                opacity: canProceedFor(step) ? 1 : 0.5,
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

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
      {Array.from({ length: total }, (_, i) => {
        const active = i === step
        const past = i < step
        return (
          <div
            key={i}
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

function StepRole({
  role,
  setRole,
}: {
  role: OnboardingRole | ""
  setRole: (r: OnboardingRole) => void
}) {
  const cards: Array<{
    value: OnboardingRole
    title: string
    description: string
    examples: string
  }> = [
    {
      value: "imm-classic",
      title: "IMM care folosește AI",
      description:
        "Compania mea folosește instrumente AI cumpărate sau externalizate (ChatGPT, Copilot, vendor SaaS) — vreau să respect AI Act + GDPR ca deployer.",
      examples: "Ex: SRL, firmă consultanță, agenție, retailer cu chatbot, departament HR cu AI screening.",
    },
    {
      value: "ai-builder",
      title: "Companie care construiește AI",
      description:
        "Construim sisteme AI, agenți, automatizări sau SaaS AI pentru noi sau pentru clienți — vreau workflow provider (Annex IV, EU Database, FRIA, API/SDK).",
      examples: "Ex: startup AI, agenție automatizări AI, dezvoltator chatbot/copilot, builder agenți.",
    },
    {
      value: "cabinet",
      title: "Cabinet / DPO / Consultant",
      description:
        "Gestionez compliance AI + GDPR pentru mai mulți clienți — vreau portofoliu, magic links, audit pack-uri, trust center.",
      examples: "Ex: cabinet avocatură, DPO independent, consultant GDPR/AI, contabil care livrează compliance.",
    },
  ]

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "6px",
          }}
        >
          Bun venit la CompliRoAI
        </div>
        <div style={{ fontSize: "13.5px", color: "var(--ink-dim)" }}>
          Care e rolul tău? Asta determină ce module vezi în dashboard.
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {cards.map((c) => {
          const active = role === c.value
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setRole(c.value)}
              style={{
                textAlign: "left",
                padding: "16px 18px",
                borderRadius: "10px",
                border: active
                  ? "1px solid var(--cobalt-500)"
                  : "1px solid var(--border-strong)",
                background: active ? "var(--cobalt-soft)" : "var(--bg-hover)",
                cursor: "pointer",
                display: "flex",
                gap: "14px",
                alignItems: "flex-start",
                transition: "background 120ms, border-color 120ms",
              }}
            >
              <span
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "999px",
                  border: active
                    ? "5px solid var(--cobalt-500)"
                    : "2px solid var(--border-strong)",
                  background: active ? "var(--bg)" : "transparent",
                  flexShrink: 0,
                  marginTop: "2px",
                }}
              />
              <span style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span
                  style={{
                    fontSize: "14.5px",
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {c.title}
                </span>
                <span style={{ fontSize: "12.5px", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                  {c.description}
                </span>
                <span style={{ fontSize: "11.5px", color: "var(--ink-dim)", lineHeight: 1.5, marginTop: "2px" }}>
                  {c.examples}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div
        style={{
          fontSize: "12px",
          color: "var(--ink-dim)",
          padding: "10px 12px",
          background: "var(--bg-elev)",
          border: "1px solid var(--border-soft)",
          borderRadius: "6px",
        }}
      >
        Poți schimba rolul mai târziu din setări. Fiecare workspace are același motor
        de compliance, dar UI-ul se adaptează la fluxul tău.
      </div>
    </div>
  )
}

function Step1Company({
  company,
  setCompany,
  hint = "imm-classic",
}: {
  company: CompanyInfo
  setCompany: (c: CompanyInfo) => void
  hint?: "imm-classic" | "ai-builder"
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
          Despre {hint === "ai-builder" ? "compania ta de AI" : "firma ta"}
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
        de mărime, dacă folosești sau construiești sisteme AI ai obligații. Limita SME pentru
        reduceri de amenzi: 750 angajați + €150M cifră de afaceri (extinsă prin Omnibus,
        7 mai 2026).
      </div>
    </div>
  )
}

function Step2Builder({
  builder,
  setBuilder,
}: {
  builder: BuilderInfo
  setBuilder: (b: BuilderInfo) => void
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
          Detalii AI Builder
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", lineHeight: 1.5 }}>
          Ai obligații duale: provider (Art. 16) + deployer (Art. 26). Câteva detalii
          pentru a personaliza flow-ul.
        </div>
      </div>

      <div>
        <FieldLabel>Email CTO / responsabil tehnic (opțional)</FieldLabel>
        <input
          type="email"
          value={builder.ctoEmail}
          onChange={(e) => setBuilder({ ...builder, ctoEmail: e.target.value })}
          placeholder="cto@startup.ro"
          style={inputBase}
        />
      </div>

      <div>
        <FieldLabel>Primul model/sistem deployat (opțional)</FieldLabel>
        <input
          type="text"
          value={builder.firstModelDeployed}
          onChange={(e) => setBuilder({ ...builder, firstModelDeployed: e.target.value })}
          placeholder="Ex: chatbot suport v1, agent calendar, model risc credit"
          style={inputBase}
        />
      </div>

      <div>
        <FieldLabel>Sistemul tău interacționează direct cu utilizatori finali?</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            { value: true, label: "Da (customer-facing)" },
            { value: false, label: "Nu (intern / B2B middleware)" },
          ].map((opt) => {
            const active = builder.customerFacing === opt.value
            return (
              <button
                type="button"
                key={String(opt.value)}
                onClick={() => setBuilder({ ...builder, customerFacing: opt.value })}
                style={{
                  padding: "12px 10px",
                  borderRadius: "8px",
                  border: active
                    ? "1px solid var(--cobalt-500)"
                    : "1px solid var(--border-strong)",
                  background: active ? "var(--cobalt-soft)" : "var(--bg-hover)",
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontSize: "13px",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {opt.label}
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
        Workspace-ul tău include automat: Annex IV, EU Database wizard, Conformity
        Assessment, FRIA (Sprint 016), Oversight uman, Logging, PMM, Incidente AI, QMS,
        API/SDK. Inventarul AI îl vei putea popula din dashboard.
      </div>
    </div>
  )
}

function Step3BuilderRecap({
  company,
  builder,
}: {
  company: CompanyInfo
  builder: BuilderInfo
}) {
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
          Workspace AI Builder gata
        </div>
        <div style={{ fontSize: "13.5px", color: "var(--ink-dim)" }}>
          Iată ce am configurat:
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
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "13.5px", color: "var(--ink)", lineHeight: 1.7 }}>
          {company.cui && <li>CUI {company.cui.toUpperCase()} · {company.employeeCount || "-"} angajați</li>}
          {builder.firstModelDeployed && <li>Primul sistem: {builder.firstModelDeployed}</li>}
          <li>
            Interacțiune cu utilizatori finali:{" "}
            {builder.customerFacing === true ? "da" : builder.customerFacing === false ? "nu" : "—"}
          </li>
          <li>Module AI Builder activate: Annex IV, EU Database, Conformity, FRIA, Oversight, Logging, PMM, QMS, API/SDK</li>
        </ul>
      </div>

      <div
        style={{
          background: "var(--cobalt-soft)",
          border: "1px solid var(--cobalt-soft-strong)",
          borderRadius: "10px",
          padding: "14px 16px",
        }}
      >
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
          Următorii pași
        </div>
        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--ink-muted)", lineHeight: 1.7 }}>
          <li>Adaugă primul tău sistem AI în Inventar AI</li>
          <li>Rulează Role Assessment (provider + deployer dual)</li>
          <li>Configurează Annex IV pentru sistemele high-risk</li>
        </ul>
      </div>
    </div>
  )
}

function Step2Solo({
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

function Step3Solo({
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

function Step4SoloRecap({
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
          Bun venit în CompliRoAI
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

function Step1Cabinet({
  cabinet,
  setCabinet,
}: {
  cabinet: CabinetInfo
  setCabinet: (c: CabinetInfo) => void
}) {
  const scales: Array<{ value: CabinetInfo["clientScale"]; label: string; hint: string }> = [
    { value: "1-5", label: "1–5 clienți", hint: "Cabinet mic, foarte personalizat" },
    { value: "5-20", label: "5–20 clienți", hint: "Cabinet mediu, nevoie de batch" },
    { value: "20+", label: "20+ clienți", hint: "Cabinet mare, automatizare critică" },
  ]

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
          Despre cabinetul tău
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
          Configurăm spațiul de portofoliu pentru consultanță AI Act & GDPR.
        </div>
      </div>

      <div>
        <FieldLabel>Nume cabinet / firmă consultanță</FieldLabel>
        <input
          type="text"
          value={cabinet.cabinetName}
          onChange={(e) => setCabinet({ ...cabinet, cabinetName: e.target.value })}
          placeholder="Ex: Popescu & Asociații Consulting"
          style={inputBase}
        />
      </div>

      <div>
        <FieldLabel>Câți clienți gestionezi?</FieldLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          {scales.map((s) => {
            const active = cabinet.clientScale === s.value
            return (
              <button
                type="button"
                key={s.value}
                onClick={() => setCabinet({ ...cabinet, clientScale: s.value })}
                style={{
                  padding: "12px 8px",
                  borderRadius: "8px",
                  border: active
                    ? "1px solid var(--cobalt-500)"
                    : "1px solid var(--border-strong)",
                  background: active ? "var(--cobalt-soft)" : "var(--bg-hover)",
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: active ? 600 : 400,
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span>{s.label}</span>
                <span style={{ fontSize: "11px", color: "var(--ink-dim)" }}>{s.hint}</span>
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
        <strong style={{ color: "var(--ink)" }}>Cum funcționează:</strong> ai un workspace
        propriu pentru cabinet, iar fiecare client primește propriul workspace izolat.
        Vei putea comuta între ele din meniul de sus.
      </div>
    </div>
  )
}

function Step2CabinetClient({
  firstClient,
  setFirstClient,
}: {
  firstClient: { name: string; cui: string; skipped: boolean }
  setFirstClient: (c: { name: string; cui: string; skipped: boolean }) => void
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
          Primul tău client (opțional)
        </div>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>
          Adaugă primul client acum, sau sari peste și îi adaugi pe toți după ce intri în
          portofoliu.
        </div>
      </div>

      {!firstClient.skipped && (
        <>
          <div>
            <FieldLabel>Nume firmă client</FieldLabel>
            <input
              type="text"
              value={firstClient.name}
              onChange={(e) => setFirstClient({ ...firstClient, name: e.target.value })}
              placeholder="Ex: Acme Industries SRL"
              style={inputBase}
            />
          </div>

          <div>
            <FieldLabel>CUI client (opțional)</FieldLabel>
            <input
              type="text"
              value={firstClient.cui}
              onChange={(e) => setFirstClient({ ...firstClient, cui: e.target.value })}
              placeholder="RO12345678"
              style={inputBase}
            />
          </div>
        </>
      )}

      {firstClient.skipped && (
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
          Ai sărit peste primul client. Vei putea adăuga clienți oricând din pagina
          „Portofoliu".
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setFirstClient({
            ...firstClient,
            skipped: !firstClient.skipped,
            name: "",
            cui: "",
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
        {firstClient.skipped
          ? "Adaug primul client acum"
          : "Sar peste — adaug clienți după"}
      </button>
    </div>
  )
}

function Step3CabinetRecap({
  cabinet,
  firstClient,
}: {
  cabinet: CabinetInfo
  firstClient: { name: string; cui: string; skipped: boolean }
}) {
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
          Cabinet pregătit
        </div>
        <div style={{ fontSize: "13.5px", color: "var(--ink-dim)" }}>
          Configurarea cabinetului <strong style={{ color: "var(--ink)" }}>{cabinet.cabinetName || "—"}</strong>{" "}
          este gata. Iată ce am pregătit:
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
        <ul
          style={{
            margin: 0,
            paddingLeft: "18px",
            fontSize: "13px",
            color: "var(--ink)",
            lineHeight: 1.7,
          }}
        >
          <li>Workspace cabinet creat ({cabinet.clientScale || "—"} clienți estimat)</li>
          {!firstClient.skipped && firstClient.name && (
            <li>Primul client: {firstClient.name}{firstClient.cui ? ` · ${firstClient.cui.toUpperCase()}` : ""}</li>
          )}
          <li>Switcher de workspace activat în meniul de sus</li>
          <li>Pagina „Portofoliu" disponibilă în meniul din stânga</li>
        </ul>
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
          Următorii pași
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
          <li>Adaugă clienții în pagina „Portofoliu"</li>
          <li>Pentru fiecare client: comută în workspace-ul lui și completează inventarul AI</li>
          <li>Generează rapoarte de conformitate per client</li>
        </ul>
      </div>
    </div>
  )
}
