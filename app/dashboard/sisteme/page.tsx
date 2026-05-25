"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import type {
  AIIncident,
  AISystemRecord,
  FriaRecord,
  HumanOversightProtocol,
  LoggingConfig,
  PmmPlan,
  QmsSystemAttestation,
} from "@/lib/compliance/types"
import { AIInventoryPanel } from "@/components/ai-act/ai-inventory-panel"
import { AISystemsList } from "@/components/ai-act/ai-systems-list"
import { AlertTriangle } from "lucide-react"

export default function SistemePage() {
  const [systems, setSystems] = useState<AISystemRecord[]>([])
  const [friaRecords, setFriaRecords] = useState<FriaRecord[]>([])
  const [oversightRecords, setOversightRecords] = useState<HumanOversightProtocol[]>([])
  const [loggingRecords, setLoggingRecords] = useState<LoggingConfig[]>([])
  const [pmmRecords, setPmmRecords] = useState<PmmPlan[]>([])
  const [incidents, setIncidents] = useState<AIIncident[]>([])
  const [qmsAttestations, setQmsAttestations] = useState<QmsSystemAttestation[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceMode, setWorkspaceMode] = useState<"imm-classic" | "ai-builder" | "cabinet">("imm-classic")

  const load = useCallback(async () => {
    const [systemsRes, friaRes, ovRes, lgRes, pmmRes, incRes, qmsRes] = await Promise.all([
      fetch("/api/ai-systems"),
      fetch("/api/fria"),
      fetch("/api/oversight"),
      fetch("/api/logging-evidence"),
      fetch("/api/pmm"),
      fetch("/api/ai-incidents"),
      fetch("/api/qms/system-attestation"),
    ])
    if (systemsRes.ok) {
      const data = await systemsRes.json()
      setSystems(data.systems)
    }
    if (friaRes.ok) {
      const data = await friaRes.json()
      setFriaRecords((data.records ?? []) as FriaRecord[])
    }
    if (ovRes.ok) {
      const data = await ovRes.json()
      setOversightRecords((data.records ?? []) as HumanOversightProtocol[])
    }
    if (lgRes.ok) {
      const data = await lgRes.json()
      setLoggingRecords((data.records ?? []) as LoggingConfig[])
    }
    if (pmmRes.ok) {
      const data = await pmmRes.json()
      setPmmRecords((data.records ?? []) as PmmPlan[])
    }
    if (incRes.ok) {
      const data = await incRes.json()
      setIncidents((data.records ?? []) as AIIncident[])
    }
    if (qmsRes.ok) {
      const data = await qmsRes.json()
      setQmsAttestations((data.attestations ?? []) as QmsSystemAttestation[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

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

  const highRiskCount = systems.filter((s) => s.riskLevel === "high").length

  const systemsRequiringFriaIds = useMemo(() => {
    const friaSystemIds = new Set(friaRecords.map((r) => r.linkedAISystemId))
    const needs = new Set<string>()
    for (const s of systems) {
      if (s.riskLevel === "high" && !friaSystemIds.has(s.id)) needs.add(s.id)
    }
    return needs
  }, [systems, friaRecords])

  // Sprint 017 — sisteme care necesită protocol Art. 14 dar nu îl au:
  // high-risk OR biometric ID OR makesAutomatedDecisions+impactsRights.
  const systemsRequiringOversightIds = useMemo(() => {
    const oversightSystemIds = new Set(
      oversightRecords.map((r) => r.linkedAISystemId),
    )
    const needs = new Set<string>()
    for (const s of systems) {
      if (oversightSystemIds.has(s.id)) continue
      if (s.riskLevel === "high") needs.add(s.id)
      else if (s.purpose === "biometric-identification") needs.add(s.id)
      else if (s.makesAutomatedDecisions && s.impactsRights) needs.add(s.id)
    }
    return needs
  }, [systems, oversightRecords])

  // Sprint 018 — sisteme care necesită config Art. 12 dar nu îl au:
  // aceleași criterii ca Oversight pentru consistență UX.
  const systemsRequiringLoggingIds = useMemo(() => {
    const loggingSystemIds = new Set(
      loggingRecords.map((r) => r.linkedAISystemId),
    )
    const needs = new Set<string>()
    for (const s of systems) {
      if (loggingSystemIds.has(s.id)) continue
      if (s.riskLevel === "high") needs.add(s.id)
      else if (s.purpose === "biometric-identification") needs.add(s.id)
      else if (s.makesAutomatedDecisions && s.impactsRights) needs.add(s.id)
    }
    return needs
  }, [systems, loggingRecords])

  // Sprint 019 — sisteme care necesită PMM plan Art. 72 dar nu îl au.
  // Aceleași criterii ca Logging + Oversight pentru consistență UX
  // (high-risk OR biometric OR auto-decisions impacting rights).
  const systemsRequiringPmmIds = useMemo(() => {
    const pmmSystemIds = new Set(pmmRecords.map((r) => r.linkedAISystemId))
    const needs = new Set<string>()
    for (const s of systems) {
      if (pmmSystemIds.has(s.id)) continue
      if (s.riskLevel === "high") needs.add(s.id)
      else if (s.purpose === "biometric-identification") needs.add(s.id)
      else if (s.makesAutomatedDecisions && s.impactsRights) needs.add(s.id)
    }
    return needs
  }, [systems, pmmRecords])

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
      if (s.riskLevel === "high" && !attested.has(s.id)) needs.add(s.id)
    }
    return needs
  }, [systems, qmsAttestations])

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Inventar AI</div>
          <h1 className="cr-title">Sisteme AI</h1>
          <p className="cr-subtitle">
          Inventarul oficial al sistemelor AI utilizate în organizație · Deadline high-risk: 2 dec 2027
          </p>
        </div>
      </div>

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

      {/* Add system */}
      <AIInventoryPanel onAdded={load} />

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
    </div>
  )
}
