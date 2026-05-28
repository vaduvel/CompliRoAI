"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent, type ReactNode } from "react"
import type {
  AIIncident,
  AISystemRecord,
  AIUseCaseRecord,
  FriaRecord,
  HumanOversightProtocol,
  LoggingConfig,
  PmmPlan,
  QmsSystemAttestation,
} from "@/lib/compliance/types"
import { AIInventoryPanel } from "@/components/ai-act/ai-inventory-panel"
import { AISystemsList } from "@/components/ai-act/ai-systems-list"
import {
  buildAISystemDisplayAssessment,
  type AISystemDisplayAssessment,
} from "@/lib/ai-inventory/system-assessment"
import { AlertTriangle, Box, Database, FileCheck, FileUp, Send, ShieldCheck, Sparkles } from "lucide-react"

export default function SistemePage() {
  const [systems, setSystems] = useState<AISystemRecord[]>([])
  const [useCases, setUseCases] = useState<AIUseCaseRecord[]>([])
  const [friaRecords, setFriaRecords] = useState<FriaRecord[]>([])
  const [oversightRecords, setOversightRecords] = useState<HumanOversightProtocol[]>([])
  const [loggingRecords, setLoggingRecords] = useState<LoggingConfig[]>([])
  const [pmmRecords, setPmmRecords] = useState<PmmPlan[]>([])
  const [incidents, setIncidents] = useState<AIIncident[]>([])
  const [qmsAttestations, setQmsAttestations] = useState<QmsSystemAttestation[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceMode, setWorkspaceMode] = useState<"imm-classic" | "ai-builder" | "cabinet">("imm-classic")
  const latestLoadId = useRef(0)
  const hasLoadedOnce = useRef(false)

  const load = useCallback(async (preserveSystem?: AISystemRecord) => {
    const loadId = latestLoadId.current + 1
    latestLoadId.current = loadId

    if (!hasLoadedOnce.current) {
      setLoading(true)
    }

    try {
      const [systemsRes, useCasesRes, friaRes, ovRes, lgRes, pmmRes, incRes, qmsRes] = await Promise.all([
        fetch("/api/ai-systems", { cache: "no-store" }),
        fetch("/api/ai-use-cases", { cache: "no-store" }),
        fetch("/api/fria", { cache: "no-store" }),
        fetch("/api/oversight", { cache: "no-store" }),
        fetch("/api/logging-evidence", { cache: "no-store" }),
        fetch("/api/pmm", { cache: "no-store" }),
        fetch("/api/ai-incidents", { cache: "no-store" }),
        fetch("/api/qms/system-attestation", { cache: "no-store" }),
      ])

      const nextSystems = systemsRes.ok
        ? ((await systemsRes.json()).systems as AISystemRecord[])
        : null
      const nextUseCases = useCasesRes.ok
        ? (((await useCasesRes.json()).useCases ?? []) as AIUseCaseRecord[])
        : null
      const nextFria = friaRes.ok
        ? (((await friaRes.json()).records ?? []) as FriaRecord[])
        : null
      const nextOversight = ovRes.ok
        ? (((await ovRes.json()).records ?? []) as HumanOversightProtocol[])
        : null
      const nextLogging = lgRes.ok
        ? (((await lgRes.json()).records ?? []) as LoggingConfig[])
        : null
      const nextPmm = pmmRes.ok
        ? (((await pmmRes.json()).records ?? []) as PmmPlan[])
        : null
      const nextIncidents = incRes.ok
        ? (((await incRes.json()).records ?? []) as AIIncident[])
        : null
      const nextQms = qmsRes.ok
        ? (((await qmsRes.json()).attestations ?? []) as QmsSystemAttestation[])
        : null

      if (loadId !== latestLoadId.current) {
        return
      }

      if (nextSystems) {
        const systemsToSet =
          preserveSystem && !nextSystems.some((system) => system.id === preserveSystem.id)
            ? [preserveSystem, ...nextSystems]
            : nextSystems
        setSystems(systemsToSet)
      }
      if (nextUseCases) setUseCases(nextUseCases)
      if (nextFria) setFriaRecords(nextFria)
      if (nextOversight) setOversightRecords(nextOversight)
      if (nextLogging) setLoggingRecords(nextLogging)
      if (nextPmm) setPmmRecords(nextPmm)
      if (nextIncidents) setIncidents(nextIncidents)
      if (nextQms) setQmsAttestations(nextQms)

      hasLoadedOnce.current = true
      setLoading(false)
    } catch {
      if (loadId === latestLoadId.current) {
        setLoading(false)
      }
    }
  }, [])

  const handleSystemAdded = useCallback(
    (system: AISystemRecord) => {
      setSystems((current) =>
        current.some((existing) => existing.id === system.id)
          ? current
          : [system, ...current],
      )
      void load(system)
    },
    [load],
  )

  const handleUseCaseAdded = useCallback((record: AIUseCaseRecord) => {
    setUseCases((current) =>
      current.some((existing) => existing.id === record.id) ? current : [record, ...current],
    )
    void load()
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const mode = d?.user?.workspaceMode
        if (mode === "cabinet" || mode === "ai-builder" || mode === "imm-classic") {
          setWorkspaceMode(mode)
        }
      })
      .catch(() => {})
  }, [])

  async function handleDelete(id: string) {
    await fetch(`/api/ai-systems?id=${id}`, { method: "DELETE" })
    await load()
  }

  const systemAssessments = useMemo(() => {
    const map = new Map<string, AISystemDisplayAssessment>()

    for (const system of systems) {
      const linkedUseCases = useCases.filter((record) => record.linkedAiSystemId === system.id)
      map.set(system.id, buildAISystemDisplayAssessment(system, linkedUseCases))
    }

    return map
  }, [systems, useCases])

  const highRiskCount = systems.filter((system) => systemAssessments.get(system.id)?.isHighRiskOrProhibited).length
  const highRiskUseCases = useCases.filter((record) => record.highRiskCandidate).length
  const pageTitle =
    workspaceMode === "ai-builder"
      ? "AI Project Use Cases"
      : workspaceMode === "cabinet"
        ? "Registru AI"
        : "Tooluri AI folosite în firmă"
  const pageEyebrow = workspaceMode === "ai-builder" ? "AI Builder" : "Registru AI"
  const pageSubtitle =
    workspaceMode === "ai-builder"
      ? "Leagă proiectele AI de scop, model, evidențe tehnice și handover pack."
      : "Documentează utilizările AI, toolurile, vendorii, datele procesate, ownerii și dovezile."

  const systemsRequiringFriaIds = useMemo(() => {
    const friaSystemIds = new Set(friaRecords.map((r) => r.linkedAISystemId))
    const needs = new Set<string>()
    for (const s of systems) {
      const assessment = systemAssessments.get(s.id)
      if (assessment?.requiresFria && !friaSystemIds.has(s.id)) needs.add(s.id)
    }
    return needs
  }, [systems, friaRecords, systemAssessments])

  // Sprint 017 — sisteme care necesită protocol Art. 14 dar nu îl au:
  // high-risk OR biometric ID OR makesAutomatedDecisions+impactsRights.
  const systemsRequiringOversightIds = useMemo(() => {
    const oversightSystemIds = new Set(
      oversightRecords.map((r) => r.linkedAISystemId),
    )
    const needs = new Set<string>()
    for (const s of systems) {
      if (oversightSystemIds.has(s.id)) continue
      if (systemAssessments.get(s.id)?.requiresOversight) needs.add(s.id)
    }
    return needs
  }, [systems, oversightRecords, systemAssessments])

  // Sprint 018 — sisteme care necesită config Art. 12 dar nu îl au:
  // aceleași criterii ca Oversight pentru consistență UX.
  const systemsRequiringLoggingIds = useMemo(() => {
    const loggingSystemIds = new Set(
      loggingRecords.map((r) => r.linkedAISystemId),
    )
    const needs = new Set<string>()
    for (const s of systems) {
      if (loggingSystemIds.has(s.id)) continue
      if (systemAssessments.get(s.id)?.requiresLogging) needs.add(s.id)
    }
    return needs
  }, [systems, loggingRecords, systemAssessments])

  // Sprint 019 — sisteme care necesită PMM plan Art. 72 dar nu îl au.
  // Aceleași criterii ca Logging + Oversight pentru consistență UX
  // (high-risk OR biometric OR auto-decisions impacting rights).
  const systemsRequiringPmmIds = useMemo(() => {
    const pmmSystemIds = new Set(pmmRecords.map((r) => r.linkedAISystemId))
    const needs = new Set<string>()
    for (const s of systems) {
      if (pmmSystemIds.has(s.id)) continue
      if (systemAssessments.get(s.id)?.requiresPmm) needs.add(s.id)
    }
    return needs
  }, [systems, pmmRecords, systemAssessments])

  // Sprint 020 — sisteme cu cel puțin un incident AI Art. 73 OPEN
  // (status NOT closed / not_reportable). Subtle red badge inline pe row.
  const systemsWithOpenIncidentIds = useMemo(() => {
    const open = new Set<string>()
    for (const inc of incidents) {
      if (inc.status === "closed" || inc.status === "not_reportable") continue
      open.add(inc.linkedAISystemId)
    }
    return open
  }, [incidents])

  // Sprint 021 — sisteme high-risk fără QMS per-system attestation (Art. 17(1)(a)).
  const systemsRequiringQmsAttestationIds = useMemo(() => {
    const attested = new Set(qmsAttestations.map((a) => a.systemId))
    const needs = new Set<string>()
    for (const s of systems) {
      if (systemAssessments.get(s.id)?.requiresQms && !attested.has(s.id)) needs.add(s.id)
    }
    return needs
  }, [systems, qmsAttestations, systemAssessments])

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">{pageEyebrow}</div>
          <h1 className="cr-title">{pageTitle}</h1>
          <p className="cr-subtitle">
            {pageSubtitle}
          </p>
        </div>
        <div className="cr-actions">
          <a className="cr-btn cr-btn--secondary" href="/dashboard/clienti">
            <FileUp size={16} />
            Import CSV/XLSX
          </a>
          <a className="cr-btn cr-btn--secondary" href="/dashboard/clienti">
            <Send size={16} />
            Trimite intake
          </a>
        </div>
      </div>

      <AIRegisterNavigation />

      {/* High-risk warning */}
      {highRiskCount > 0 && (
        <div className="cr-alert cr-alert--warning">
          <AlertTriangle size={16} />
          <div>
            Ai {highRiskCount} sistem{highRiskCount !== 1 ? "e" : ""} de risc ridicat sau interzis.
            Documentează-le înainte de 2 decembrie 2027.{" "}
            <a
              href="/dashboard/sisteme/eu-db-wizard"
              className="cr-link"
            >
              Înregistrare EU Database →
            </a>
          </div>
        </div>
      )}

      {highRiskUseCases > 0 && (
        <div className="cr-alert cr-alert--warning">
          <AlertTriangle size={16} />
          <div>
            Ai {highRiskUseCases} utilizări AI marcate ca high-risk candidate.
            Necesită review uman înainte de export sau concluzie legală.
          </div>
        </div>
      )}

      <section id="utilizari-ai" className="cr-stack">
        <AIUseCaseRegisterPanel onAdded={handleUseCaseAdded} />

        <AIUseCasesList useCases={useCases} loading={loading} />
      </section>

      <section id="sisteme-ai" className="cr-stack">
        <AIInventoryPanel onAdded={handleSystemAdded} />

        {/* List */}
        <div>
          <div className="cr-section-label" style={{ marginBottom: "8px" }}>
            {systems.length} sistem{systems.length !== 1 ? "e" : ""} înregistrat{systems.length !== 1 ? "e" : ""}
          </div>
          {loading ? (
            <div className="cr-empty">Se încarcă inventarul AI...</div>
          ) : (
            <AISystemsList
              systems={systems}
              systemAssessments={systemAssessments}
              onDelete={handleDelete}
              workspaceMode={workspaceMode}
              systemsRequiringFriaIds={systemsRequiringFriaIds}
              systemsRequiringOversightIds={systemsRequiringOversightIds}
              systemsRequiringLoggingIds={systemsRequiringLoggingIds}
              systemsRequiringPmmIds={systemsRequiringPmmIds}
              systemsWithOpenIncidentIds={systemsWithOpenIncidentIds}
              systemsRequiringQmsAttestationIds={systemsRequiringQmsAttestationIds}
            />
          )}
        </div>
      </section>
    </div>
  )
}

function AIRegisterNavigation() {
  const items = [
    {
      label: "Utilizări AI",
      href: "#utilizari-ai",
      description: "departament, scop, date, owner",
      icon: <Sparkles size={16} />,
    },
    {
      label: "Sisteme / tooluri",
      href: "#sisteme-ai",
      description: "layer tehnic și clasificare",
      icon: <Box size={16} />,
    },
    {
      label: "Furnizori",
      href: "/dashboard/vendor-review",
      description: "DPA, regiune, termeni",
      icon: <ShieldCheck size={16} />,
    },
    {
      label: "Date / GDPR",
      href: "/dashboard/ropa",
      description: "RoPA, DPIA, transferuri",
      icon: <Database size={16} />,
    },
    {
      label: "Dovezi",
      href: "/dashboard/resolve",
      description: "findings și evidence",
      icon: <FileCheck size={16} />,
    },
  ]

  return (
    <nav aria-label="Navigare Registru AI" className="cr-card" style={{ padding: 0, overflow: "hidden" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          borderTop: "1px solid var(--line)",
        }}
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              minHeight: 76,
              gap: 10,
              alignItems: "center",
              padding: "14px 16px",
              borderRight: "1px solid var(--line)",
              color: "var(--ink)",
              textDecoration: "none",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "grid",
                width: 34,
                height: 34,
                placeItems: "center",
                borderRadius: 8,
                background: "var(--surface-soft)",
                color: "var(--brand)",
                flex: "0 0 auto",
              }}
            >
              {item.icon}
            </span>
            <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
              <span style={{ fontWeight: 750 }}>{item.label}</span>
              <span style={{ color: "var(--ink-muted)", fontSize: 12, lineHeight: 1.35 }}>
                {item.description}
              </span>
            </span>
          </a>
        ))}
      </div>
    </nav>
  )
}

function AIUseCaseRegisterPanel({ onAdded }: { onAdded: (record: AIUseCaseRecord) => void }) {
  const [form, setForm] = useState({
    useCaseName: "",
    department: "unknown",
    businessProcess: "unknown",
    intendedPurpose: "",
    toolName: "",
    vendorName: "",
    usesPersonalData: "unknown",
    usesConfidentialData: "unknown",
    automatedDecision: "unknown",
    scoringOrRanking: "unknown",
    publicOutput: "unknown",
    humanReview: "unknown",
    ownerEmail: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/ai-use-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          outputTypes: form.publicOutput === "yes" ? ["generated_text"] : ["unknown"],
          affectedPersons: ["unknown"],
          dataCategories: form.usesPersonalData === "yes" ? ["customer_data"] : ["unknown"],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Nu am putut salva utilizarea AI.")
      onAdded(data.useCase as AIUseCaseRecord)
      setForm({
        useCaseName: "",
        department: "unknown",
        businessProcess: "unknown",
        intendedPurpose: "",
        toolName: "",
        vendorName: "",
        usesPersonalData: "unknown",
        usesConfidentialData: "unknown",
        automatedDecision: "unknown",
        scoringOrRanking: "unknown",
        publicOutput: "unknown",
        humanReview: "unknown",
        ownerEmail: "",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut salva utilizarea AI.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="cr-card cr-stack" onSubmit={submit}>
      <div className="cr-card__header">
        <div>
          <div className="cr-section-label">Utilizare AI nouă</div>
          <h2 className="cr-card__title">Adaugă utilizare AI</h2>
        </div>
        <button className="cr-btn cr-btn--primary" type="submit" disabled={saving}>
          <Sparkles size={16} />
          {saving ? "Se salvează..." : "Salvează și generează acțiuni"}
        </button>
      </div>
      {error && <div className="cr-alert cr-alert--danger">{error}</div>}
      <div className="cr-grid cr-grid--3">
        <Field label="Ce face AI-ul în companie?">
          <input
            className="cr-input"
            value={form.useCaseName}
            onChange={(event) => update("useCaseName", event.target.value)}
            placeholder="Chatbot suport clienți"
            required
          />
        </Field>
        <Field label="Departament">
          <select className="cr-input" value={form.department} onChange={(event) => update("department", event.target.value)}>
            <option value="unknown">Necunoscut</option>
            <option value="marketing">Marketing</option>
            <option value="customer_support">Suport clienți</option>
            <option value="hr_recruitment">HR / recrutare</option>
            <option value="legal_compliance">Legal / compliance</option>
            <option value="it_development">IT / development</option>
            <option value="finance_accounting">Financiar</option>
          </select>
        </Field>
        <Field label="Proces">
          <select className="cr-input" value={form.businessProcess} onChange={(event) => update("businessProcess", event.target.value)}>
            <option value="unknown">Necunoscut</option>
            <option value="content_creation">Conținut / marketing</option>
            <option value="customer_interaction">Interacțiune clienți</option>
            <option value="recruitment_selection">Recrutare / selecție</option>
            <option value="contract_review">Review contracte</option>
            <option value="software_development">Software development</option>
            <option value="risk_scoring">Scoring / prioritizare</option>
          </select>
        </Field>
      </div>
      <Field label="Scop concret / intended purpose">
        <textarea
          className="cr-input"
          rows={3}
          value={form.intendedPurpose}
          onChange={(event) => update("intendedPurpose", event.target.value)}
          placeholder="Creează drafturi de răspuns pentru întrebări frecvente. Omul decide răspunsul final."
          required
        />
      </Field>
      <div className="cr-grid cr-grid--3">
        <Field label="Tool / sistem">
          <input className="cr-input" value={form.toolName} onChange={(event) => update("toolName", event.target.value)} placeholder="ChatGPT Team" />
        </Field>
        <Field label="Vendor">
          <input className="cr-input" value={form.vendorName} onChange={(event) => update("vendorName", event.target.value)} placeholder="OpenAI" />
        </Field>
        <Field label="Owner email">
          <input className="cr-input" value={form.ownerEmail} onChange={(event) => update("ownerEmail", event.target.value)} placeholder="owner@client.ro" />
        </Field>
      </div>
      <div className="cr-grid cr-grid--3">
        <TriStateField label="Date personale" value={form.usesPersonalData} onChange={(value) => update("usesPersonalData", value)} />
        <TriStateField label="Date confidențiale" value={form.usesConfidentialData} onChange={(value) => update("usesConfidentialData", value)} />
        <TriStateField label="Decizie automată" value={form.automatedDecision} onChange={(value) => update("automatedDecision", value)} />
        <TriStateField label="Scoring / ranking" value={form.scoringOrRanking} onChange={(value) => update("scoringOrRanking", value)} />
        <TriStateField label="Output public" value={form.publicOutput} onChange={(value) => update("publicOutput", value)} />
        <Field label="Human review">
          <select className="cr-input" value={form.humanReview} onChange={(event) => update("humanReview", event.target.value)}>
            <option value="unknown">Necunoscut</option>
            <option value="required_before_action">Obligatoriu înainte</option>
            <option value="escalation_only">Doar escaladare</option>
            <option value="optional">Opțional</option>
            <option value="none">Nu există</option>
          </select>
        </Field>
      </div>
    </form>
  )
}

function AIUseCasesList({ useCases, loading }: { useCases: AIUseCaseRecord[]; loading: boolean }) {
  return (
    <div className="cr-stack">
      <div className="cr-section-label">
        {useCases.length} utilizări AI în registru
      </div>
      {loading ? (
        <div className="cr-empty">Se încarcă Registrul AI...</div>
      ) : useCases.length === 0 ? (
        <div className="cr-empty">Nu există încă utilizări AI documentate.</div>
      ) : (
        <div className="cr-grid cr-grid--2">
          {useCases.map((record) => (
            <div className="cr-card" key={record.id}>
              <div className="cr-card__header">
                <div>
                  <div className="cr-section-label">{record.department}</div>
                  <h3 className="cr-card__title">{record.useCaseName}</h3>
                </div>
                <span className="cr-pill">{record.draftRiskLevel.replaceAll("_", " ")}</span>
              </div>
              <p className="cr-muted">{record.toolName || "Tool necunoscut"}{record.vendorName ? ` · ${record.vendorName}` : ""}</p>
              <div className="cr-metrics cr-metrics--compact">
                <Metric label="Date personale" value={record.usesPersonalData} />
                <Metric label="Certitudine" value={record.certaintyStatus} />
                <Metric label="Review" value={record.reviewStatus} />
                <Metric label="Acțiuni" value={String(record.openFindingsCount)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="cr-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function TriStateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <select className="cr-input" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="unknown">Nu știu</option>
        <option value="yes">Da</option>
        <option value="no">Nu</option>
      </select>
    </Field>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="cr-section-label">{label}</div>
      <strong>{value}</strong>
    </div>
  )
}
