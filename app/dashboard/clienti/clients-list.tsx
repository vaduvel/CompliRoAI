"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  Search,
  Upload,
} from "lucide-react"

import {
  aiSystemImportDraftToRecord,
  buildAISystemImportTemplateCsv,
  buildClientImportTemplateCsv,
  buildLiteracyImportTemplateCsv,
  buildRopaImportTemplateCsv,
  buildVendorModelImportTemplateCsv,
  IMPORT_CENTER_TABS,
  parseAISystemImportText,
  parseClientImportText,
  parseLiteracyImportText,
  parseRopaImportText,
  parseVendorModelImportText,
  type AISystemImportDraft,
  type AISystemImportParseResult,
  type ClientImportDraft,
  type ClientImportParseResult,
  type ImportCenterTabId,
  type LiteracyImportDraft,
  type LiteracyImportParseResult,
  type RopaImportDraft,
  type RopaImportParseResult,
  type VendorModelImportDraft,
  type VendorModelImportParseResult,
} from "@/lib/client-import"

type ClientRow = {
  orgId: string
  orgName: string
  membershipId: string
  createdAtISO: string
  cui?: string
  contactEmail?: string
  serviceScope?: string[]
  expectedAiRole?: string
  usesAi?: string
  personalDataAi?: string
  clientStatus?: string
  importSignalsCount?: number
  aiSystemsCount: number
  literacyTrainingsCount: number
  onboardingCompleted: boolean
}

type StatusFilter = "all" | "onboarded" | "pending"
type ImportResult = {
  rowNumber: number
  ok: boolean
  orgId?: string
  orgName: string
  message: string
  intakeUrl?: string
  signals: string[]
}

type AISystemImportResult = {
  rowNumber: number
  ok: boolean
  orgId?: string
  orgName?: string
  entityName: string
  message: string
  warnings: string[]
  generatedFindings?: string[]
}
type PortfolioImportResult = {
  rowNumber: number
  ok: boolean
  orgId?: string
  orgName?: string
  entityName: string
  message: string
  warnings: string[]
  generatedFindings: string[]
}
type PortfolioImportDraft = VendorModelImportDraft | RopaImportDraft | LiteracyImportDraft

/**
 * Sprint 015 — Cabinet "Clienți" page. Streamlined list view, distinct from
 * /dashboard/portofoliu (which is the full portfolio dashboard with onboarding
 * CTAs + magic-link send). This page focuses on quick search + status filter +
 * direct switch to client workspace.
 */
export function ClientsList() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [switching, setSwitching] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(true)
  const [activeImportTab, setActiveImportTab] = useState<ImportCenterTabId>("clients")
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importError, setImportError] = useState("")
  const [aiSystemsImportText, setAiSystemsImportText] = useState("")
  const [aiSystemsImporting, setAiSystemsImporting] = useState(false)
  const [aiSystemsImportResults, setAiSystemsImportResults] = useState<AISystemImportResult[]>([])
  const [aiSystemsImportError, setAiSystemsImportError] = useState("")
  const [vendorModelImportText, setVendorModelImportText] = useState("")
  const [ropaImportText, setRopaImportText] = useState("")
  const [literacyImportText, setLiteracyImportText] = useState("")
  const [portfolioImporting, setPortfolioImporting] = useState<ImportCenterTabId | null>(null)
  const [portfolioImportResults, setPortfolioImportResults] = useState<PortfolioImportResult[]>([])
  const [portfolioImportError, setPortfolioImportError] = useState("")
  const [noFileClientOrgId, setNoFileClientOrgId] = useState("")
  const [noFileBusy, setNoFileBusy] = useState(false)
  const [noFileMessage, setNoFileMessage] = useState("")
  const [noFileError, setNoFileError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/portfolio/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!noFileClientOrgId && clients.length > 0) {
      setNoFileClientOrgId(clients[0].orgId)
    }
  }, [clients, noFileClientOrgId])

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter === "onboarded" && !c.onboardingCompleted) return false
      if (statusFilter === "pending" && c.onboardingCompleted) return false
      if (query.trim().length > 0) {
        const q = query.trim().toLowerCase()
        const hay = `${c.orgName} ${c.cui ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [clients, query, statusFilter])

  const importPreview: ClientImportParseResult | null = useMemo(() => {
    if (!importText.trim()) return null
    return parseClientImportText(importText)
  }, [importText])

  const validImportRows = useMemo<ClientImportDraft[]>(() => {
    return importPreview?.rows.filter((row) => row.errors.length === 0) ?? []
  }, [importPreview])

  const validImportRowsLabel =
    validImportRows.length === 1 ? "1 client" : `${validImportRows.length} clienți`

  const aiSystemsImportPreview: AISystemImportParseResult | null = useMemo(() => {
    if (!aiSystemsImportText.trim()) return null
    return parseAISystemImportText(aiSystemsImportText)
  }, [aiSystemsImportText])

  const validAISystemImportRows = useMemo<AISystemImportDraft[]>(() => {
    return aiSystemsImportPreview?.rows.filter((row) => row.errors.length === 0) ?? []
  }, [aiSystemsImportPreview])

  const validAISystemImportRowsLabel =
    validAISystemImportRows.length === 1
      ? "1 sistem AI"
      : `${validAISystemImportRows.length} sisteme AI`

  const aiSystemsImportSummary = useMemo(() => {
    return (aiSystemsImportPreview?.rows ?? []).reduce(
      (summary, row) => {
        if (row.usesPersonalData) summary.personalData += 1
        if (row.makesAutomatedDecisions) summary.automatedDecisions += 1
        if (!row.hasHumanReview) summary.noHumanReview += 1
        if (row.errors.length === 0) {
          const record = aiSystemImportDraftToRecord(row)
          if (record.riskLevel === "high") summary.highRisk += 1
          if (record.riskLevel === "limited") summary.limitedRisk += 1
          if (record.riskLevel === "minimal") summary.minimalRisk += 1
        }
        return summary
      },
      {
        highRisk: 0,
        limitedRisk: 0,
        minimalRisk: 0,
        personalData: 0,
        automatedDecisions: 0,
        noHumanReview: 0,
      }
    )
  }, [aiSystemsImportPreview])

  const vendorModelImportPreview: VendorModelImportParseResult | null = useMemo(() => {
    if (!vendorModelImportText.trim()) return null
    return parseVendorModelImportText(vendorModelImportText)
  }, [vendorModelImportText])

  const ropaImportPreview: RopaImportParseResult | null = useMemo(() => {
    if (!ropaImportText.trim()) return null
    return parseRopaImportText(ropaImportText)
  }, [ropaImportText])

  const literacyImportPreview: LiteracyImportParseResult | null = useMemo(() => {
    if (!literacyImportText.trim()) return null
    return parseLiteracyImportText(literacyImportText)
  }, [literacyImportText])

  const validVendorModelImportRows = useMemo<VendorModelImportDraft[]>(() => {
    return vendorModelImportPreview?.rows.filter((row) => row.errors.length === 0) ?? []
  }, [vendorModelImportPreview])

  const validRopaImportRows = useMemo<RopaImportDraft[]>(() => {
    return ropaImportPreview?.rows.filter((row) => row.errors.length === 0) ?? []
  }, [ropaImportPreview])

  const validLiteracyImportRows = useMemo<LiteracyImportDraft[]>(() => {
    return literacyImportPreview?.rows.filter((row) => row.errors.length === 0) ?? []
  }, [literacyImportPreview])

  const activePortfolioPreview = useMemo(() => {
    if (activeImportTab === "vendors_models") return vendorModelImportPreview
    if (activeImportTab === "ropa") return ropaImportPreview
    if (activeImportTab === "ai_literacy") return literacyImportPreview
    return null
  }, [activeImportTab, vendorModelImportPreview, ropaImportPreview, literacyImportPreview])

  const activePortfolioValidRows = useMemo(() => {
    if (activeImportTab === "vendors_models") return validVendorModelImportRows
    if (activeImportTab === "ropa") return validRopaImportRows
    if (activeImportTab === "ai_literacy") return validLiteracyImportRows
    return []
  }, [activeImportTab, validVendorModelImportRows, validRopaImportRows, validLiteracyImportRows])

  const portfolioImportDescriptor = useMemo(() => {
    if (activeImportTab === "vendors_models") {
      return {
        noun: validVendorModelImportRows.length === 1 ? "1 vendor/model" : `${validVendorModelImportRows.length} vendori/modele`,
        endpoint: "/api/portfolio/vendors-models/import",
        textarea: vendorModelImportText,
        setTextarea: setVendorModelImportText,
        clearLabel: "vendors_models",
        placeholder:
          "client_name,vendor_name,product_used,region,dpa_status,transfer_mechanism,training_on_customer_data\nApex Logistic SRL,OpenAI,ChatGPT Team,US,missing,unknown,unknown",
        intro:
          "Importă furnizori, produse și modele AI pe clienți existenți. Importul generează review vendor, DPA, transfer și termeni AI unde lipsesc dovezile.",
      }
    }
    if (activeImportTab === "ropa") {
      return {
        noun: validRopaImportRows.length === 1 ? "1 activitate RoPA" : `${validRopaImportRows.length} activități RoPA`,
        endpoint: "/api/portfolio/ropa/import",
        textarea: ropaImportText,
        setTextarea: setRopaImportText,
        clearLabel: "ropa",
        placeholder:
          "client_name,activity_name,purpose,data_subjects,data_categories,processors,third_country_transfers,retention\nApex Logistic SRL,Suport chatbot,Răspuns solicitări,clienți,email;mesaje,OpenAI,US:SCC,12 luni",
        intro:
          "Importă procese RoPA/date și le pune în review GDPR. Transferurile, lipsa temeiului, procesatorii și datele personale creează acțiuni concrete.",
      }
    }
    if (activeImportTab === "ai_literacy") {
      return {
        noun: validLiteracyImportRows.length === 1 ? "1 training" : `${validLiteracyImportRows.length} traininguri`,
        endpoint: "/api/portfolio/ai-literacy/import",
        textarea: literacyImportText,
        setTextarea: setLiteracyImportText,
        clearLabel: "ai_literacy",
        placeholder:
          "client_name,employee_name,role,training_date,training_type,topics,trainer,duration_hours,attestation_signed\nApex Logistic SRL,Ana Ionescu,Marketing,2026-05-20,workshop,Art. 4;AI policy,Daniel,2,no",
        intro:
          "Importă rosterul și dovezile AI Literacy. Trainingurile fără atestare creează taskuri de colectare dovadă înainte de Audit Pack.",
      }
    }
    return null
  }, [
    activeImportTab,
    literacyImportText,
    ropaImportText,
    validLiteracyImportRows.length,
    validRopaImportRows.length,
    validVendorModelImportRows.length,
    vendorModelImportText,
  ])

  const activeImportTabs = useMemo(
    () => IMPORT_CENTER_TABS.filter((tab) => tab.status === "active"),
    []
  )

  const activeImportTabMeta = useMemo(
    () => IMPORT_CENTER_TABS.find((tab) => tab.id === activeImportTab),
    [activeImportTab]
  )

  const importCertaintyTotals = useMemo(() => {
    return (importPreview?.rows ?? []).reduce(
      (totals, row) => {
        totals.hardImport += row.dataCertainty.counts.hardImport
        totals.softImport += row.dataCertainty.counts.softImport
        totals.triageClaims += row.dataCertainty.counts.triageClaims
        totals.needsDiscovery += row.dataCertainty.counts.needsDiscovery
        totals.technicalEvidence += row.dataCertainty.counts.technicalEvidence
        return totals
      },
      {
        hardImport: 0,
        softImport: 0,
        triageClaims: 0,
        needsDiscovery: 0,
        technicalEvidence: 0,
      }
    )
  }, [importPreview])

  async function handleSwitch(orgId: string) {
    setSwitching(orgId)
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      })
      if (res.ok) {
        router.push("/dashboard/resolve")
        router.refresh()
      }
    } finally {
      setSwitching(null)
    }
  }

  function downloadTemplate() {
    const templateByTab: Record<ImportCenterTabId, { csv: string; fileName: string }> = {
      clients: {
        csv: buildClientImportTemplateCsv(),
        fileName: "compliroai-client-import-template.csv",
      },
      ai_systems: {
        csv: buildAISystemImportTemplateCsv(),
        fileName: "compliroai-ai-systems-import-template.csv",
      },
      vendors_models: {
        csv: buildVendorModelImportTemplateCsv(),
        fileName: "compliroai-vendors-models-import-template.csv",
      },
      ropa: {
        csv: buildRopaImportTemplateCsv(),
        fileName: "compliroai-ropa-data-import-template.csv",
      },
      ai_literacy: {
        csv: buildLiteracyImportTemplateCsv(),
        fileName: "compliroai-ai-literacy-import-template.csv",
      },
    }
    const template = templateByTab[activeImportTab]
    const blob = new Blob([template.csv], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = template.fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return
    const text = await file.text()
    setShowImport(true)
    if (activeImportTab === "ai_systems") {
      setAiSystemsImportText(text)
      setAiSystemsImportResults([])
      setAiSystemsImportError("")
    } else if (activeImportTab === "vendors_models") {
      setVendorModelImportText(text)
      setPortfolioImportResults([])
      setPortfolioImportError("")
    } else if (activeImportTab === "ropa") {
      setRopaImportText(text)
      setPortfolioImportResults([])
      setPortfolioImportError("")
    } else if (activeImportTab === "ai_literacy") {
      setLiteracyImportText(text)
      setPortfolioImportResults([])
      setPortfolioImportError("")
    } else {
      setImportText(text)
      setImportResults([])
      setImportError("")
    }
  }

  async function handleImportClients() {
    if (validImportRows.length === 0) {
      setImportError("Nu există rânduri valide de importat.")
      return
    }
    setImporting(true)
    setImportError("")
    setImportResults([])
    try {
      const res = await fetch("/api/portfolio/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validImportRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.error ?? "Import eșuat.")
        return
      }
      const results = (data.results ?? []) as ImportResult[]
      setImportResults(results)
      await load()
      const createdCount = results.filter((result) => result.ok).length
      const rejectedCount = results.filter((result) => !result.ok).length
      if (createdCount > 0 && rejectedCount === 0) {
        router.push("/dashboard/portofoliu")
        router.refresh()
      }
    } catch {
      setImportError("Eroare de rețea la import.")
    } finally {
      setImporting(false)
    }
  }

  async function handleImportAISystems() {
    if (validAISystemImportRows.length === 0) {
      setAiSystemsImportError("Nu există sisteme AI valide de importat.")
      return
    }
    setAiSystemsImporting(true)
    setAiSystemsImportError("")
    setAiSystemsImportResults([])
    try {
      const res = await fetch("/api/portfolio/ai-systems/import", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: validAISystemImportRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAiSystemsImportError(data.error ?? "Import sisteme AI eșuat.")
        return
      }
      const results = (data.results ?? []) as AISystemImportResult[]
      setAiSystemsImportResults(results)
      await load()
      const importedCount = results.filter((result) => result.ok).length
      const rejectedCount = results.filter((result) => !result.ok).length
      if (importedCount > 0 && rejectedCount === 0) {
        router.push("/dashboard/portofoliu")
        router.refresh()
      }
    } catch {
      setAiSystemsImportError("Eroare de rețea la importul sistemelor AI.")
    } finally {
      setAiSystemsImporting(false)
    }
  }

  async function handlePortfolioImport() {
    if (!portfolioImportDescriptor) return
    if (activePortfolioValidRows.length === 0) {
      setPortfolioImportError("Nu există rânduri valide de importat.")
      return
    }
    setPortfolioImporting(activeImportTab)
    setPortfolioImportError("")
    setPortfolioImportResults([])
    try {
      const res = await fetch(portfolioImportDescriptor.endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: activePortfolioValidRows }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPortfolioImportError(data.error ?? "Import eșuat.")
        return
      }
      setPortfolioImportResults((data.results ?? []) as PortfolioImportResult[])
      await load()
    } catch {
      setPortfolioImportError("Eroare de rețea la import.")
    } finally {
      setPortfolioImporting(null)
    }
  }

  async function handleNoFileChecklist() {
    if (activeImportTab !== "clients" && !noFileClientOrgId) {
      setNoFileError("Alege clientul pentru care creezi checklistul.")
      return
    }
    setNoFileBusy(true)
    setNoFileError("")
    setNoFileMessage("")
    try {
      const res = await fetch("/api/portfolio/import/no-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType: activeImportTab,
          clientOrgId: activeImportTab === "clients" ? undefined : noFileClientOrgId,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setNoFileError(data.error ?? "Nu am putut crea checklistul.")
        return
      }
      setNoFileMessage(data.message ?? "Checklist creat.")
      await load()
    } catch {
      setNoFileError("Eroare de rețea la crearea checklistului.")
    } finally {
      setNoFileBusy(false)
    }
  }

  function portfolioClientLabel(row: PortfolioImportDraft) {
    return row.clientName ?? row.clientCui ?? row.clientExternalId ?? row.clientOrgId ?? "—"
  }

  function portfolioEntityName(row: PortfolioImportDraft) {
    if ("vendorName" in row) return `${row.vendorName || "—"} / ${row.productUsed || "—"}`
    if ("activityName" in row) return row.activityName || "—"
    return row.employeeName || "—"
  }

  function portfolioDetail(row: PortfolioImportDraft) {
    if ("vendorName" in row) return row.dpaStatus === "signed" ? "DPA semnat" : `DPA ${row.dpaStatus}`
    if ("activityName" in row) return row.thirdCountryTransfers.length ? "transfer extern" : "GDPR review"
    return row.attestationSigned ? "dovadă prezentă" : "dovadă lipsă"
  }

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Cabinet · registru</div>
          <h1 className="cr-title">Clienți & import</h1>
          <p className="cr-subtitle">
            Aici bagi clienții în cabinet. Importul creează organizațiile client,
            salvează context AI/GDPR, separă datele importate de declarații și pregătește acțiunile inițiale.
          </p>
        </div>
      </header>

      <section className="cr-card" style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "var(--cobalt-soft)",
              color: "var(--cobalt-400)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <FileText size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 17, letterSpacing: "-0.02em" }}>
              Import Center pentru cabinete
            </h2>
            <p style={{ margin: "5px 0 0", color: "var(--ink-muted)", fontSize: 13.5, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--ink)" }}>Clienți</strong> este registrul de onboarding.
              <strong style={{ color: "var(--ink)" }}> Portofoliu</strong> este triajul cross-client unde intri în execuție.
              Importul de aici bagă datele în evidență și pregătește acțiunile inițiale; verdictul rămâne în review.
            </p>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div className="cr-segment-bar" aria-label="Tip import">
            {activeImportTabs.map((tab) => {
              const active = activeImportTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveImportTab(tab.id)
                    setShowImport(true)
                    setImportError("")
                    setAiSystemsImportError("")
                    setPortfolioImportError("")
                    setNoFileError("")
                    setNoFileMessage("")
                  }}
                  className={`cr-tab ${active ? "is-active" : ""}`}
                  aria-pressed={active}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {activeImportTabMeta && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid var(--border)",
              borderRadius: 12,
              background: "var(--bg)",
              padding: "10px 12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "var(--ink-muted)", fontSize: 13, lineHeight: 1.45 }}>
              <strong style={{ color: "var(--ink)" }}>{activeImportTabMeta.label}:</strong>{" "}
              {activeImportTabMeta.description}
            </div>
            <div className="cr-actions" style={{ gap: 8 }}>
              <button type="button" className="cr-btn" onClick={downloadTemplate}>
                <Download size={14} /> Template
              </button>
              <label className="cr-btn" style={{ cursor: "pointer" }}>
                <Upload size={14} /> Fișier CSV
                <input
                  type="file"
                  accept=".csv,.txt"
                  style={{ display: "none" }}
                  onChange={(event) => {
                    void handleFileUpload(event.target.files?.[0] ?? null)
                    event.currentTarget.value = ""
                  }}
                />
              </label>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 12,
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            background: "var(--bg-raised)",
          }}
        >
          <div style={{ color: "var(--ink-muted)", fontSize: 13, lineHeight: 1.45 }}>
            <strong style={{ color: "var(--ink)" }}>Nu am fișier:</strong>{" "}
            {activeImportTab === "clients"
              ? "creează checklist de onboarding manual la nivel de cabinet."
              : "creează checklist real în workspace-ul clientului selectat."}
          </div>
          <div className="cr-actions" style={{ gap: 8 }}>
            {activeImportTab !== "clients" && (
              <select
                className="cr-input"
                value={noFileClientOrgId}
                onChange={(event) => setNoFileClientOrgId(event.target.value)}
                style={{ minWidth: 230, height: 36 }}
              >
                {clients.length === 0 && <option value="">Nu există client importat</option>}
                {clients.map((client) => (
                  <option key={client.orgId} value={client.orgId}>
                    {client.orgName}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="cr-btn"
              disabled={noFileBusy || (activeImportTab !== "clients" && !noFileClientOrgId)}
              onClick={handleNoFileChecklist}
            >
              <FileText size={14} />
              {noFileBusy ? "Se creează..." : "Creează checklist"}
            </button>
          </div>
          {(noFileError || noFileMessage) && (
            <div
              className={noFileError ? "cr-alert cr-alert--danger" : "cr-alert cr-alert--info"}
              style={{ flexBasis: "100%" }}
            >
              {noFileError || noFileMessage}
            </div>
          )}
        </div>

        {activeImportTab === "clients" && showImport && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <textarea
              className="cr-input"
              value={importText}
              onChange={(event) => {
                setImportText(event.target.value)
                setImportResults([])
                setImportError("")
              }}
              rows={8}
              placeholder={"company_name,cui,contact_email,service_scope,uses_ai,personal_data_ai,send_intake\nApex Logistic SRL,RO12345678,maria@example.com,ai_act;gdpr;ai_literacy,yes,yes,yes"}
              style={{ fontFamily: "var(--font-mono)", minHeight: 160 }}
            />

            {importPreview && (
              <div className="cr-stat-strip cr-stat-strip--three">
                <div className="cr-stat">
                  <div className="cr-stat__value">{importPreview.validRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>rânduri valide</div>
                </div>
                <div className="cr-stat">
                  <div className="cr-stat__value">{importPreview.errorRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>cu erori</div>
                </div>
                <div className="cr-stat">
                  <div className="cr-stat__value">{importPreview.warningRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>cu atenționări</div>
                </div>
              </div>
            )}

            {importPreview && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">Date importate</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                    {importCertaintyTotals.hardImport}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    Admin/CRM: firmă, CUI, contact, context.
                  </p>
                </div>
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">Declarații triaj</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                    {importCertaintyTotals.triageClaims}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    Uses AI, date personale, rol/risc. Cer review.
                  </p>
                </div>
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">De colectat</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "var(--amber-500)" }}>
                    {importCertaintyTotals.needsDiscovery}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    Intake, vendor/model, data-flow, literacy people.
                  </p>
                </div>
              </div>
            )}

            {importPreview && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--bg-raised)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1.25fr 0.72fr 1fr 1.2fr 1fr",
                    gap: 12,
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--ink-dim)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>Rând</span>
                  <span>Client</span>
                  <span>CUI</span>
                  <span>Semnale</span>
                  <span>Certitudine</span>
                  <span>Status</span>
                </div>
                {importPreview.rows.slice(0, 12).map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.companyName}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1.25fr 0.72fr 1fr 1.2fr 1fr",
                      gap: 12,
                      padding: "11px 12px",
                      borderBottom: "1px solid var(--border)",
                      alignItems: "center",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                      {row.rowNumber}
                    </span>
                    <span style={{ fontWeight: 600 }}>{row.companyName || "—"}</span>
                    <span style={{ color: "var(--ink-muted)" }}>{row.cui ?? "—"}</span>
                    <span style={{ color: "var(--ink-muted)" }}>
                      {row.signals.length ? `${row.signals.length} acțiuni` : "—"}
                    </span>
                    <span style={{ color: "var(--ink-muted)", fontSize: 12, lineHeight: 1.45 }}>
                      {row.dataCertainty.counts.hardImport} importate ·{" "}
                      {row.dataCertainty.counts.triageClaims} declarații ·{" "}
                      {row.dataCertainty.counts.needsDiscovery} de colectat
                    </span>
                    <span
                      className={
                        row.errors.length
                          ? "cr-badge cr-badge--critical"
                          : row.warnings.length
                            ? "cr-badge cr-badge--high"
                            : "cr-badge cr-badge--ok"
                      }
                    >
                      {row.errors[0] ?? row.warnings[0] ?? "valid"}
                    </span>
                  </div>
                ))}
                {importPreview.rows.length > 12 && (
                  <div style={{ padding: 10, color: "var(--ink-dim)", fontSize: 12 }}>
                    + {importPreview.rows.length - 12} rânduri în fișier
                  </div>
                )}
              </div>
            )}

            {importError && <div className="cr-alert cr-alert--danger">{importError}</div>}

            {importResults.length > 0 && (
              <div className="cr-alert cr-alert--info" style={{ display: "block" }}>
                <strong>Import finalizat:</strong>{" "}
                {importResults.filter((result) => result.ok).length} creați,{" "}
                {importResults.filter((result) => !result.ok).length} respinși.
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {importResults.slice(0, 6).map((result) => (
                    <div key={`${result.rowNumber}-${result.orgName}`} style={{ fontSize: 12 }}>
                      {result.ok ? "✓" : "!"} rând {result.rowNumber}: {result.orgName} — {result.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cr-actions" style={{ justifyContent: "space-between" }}>
              <div style={{ color: "var(--ink-dim)", fontSize: 12.5 }}>
                După import, clienții apar în Portofoliu, iar acțiunile inițiale intră automat în De rezolvat:
                inventar AI, DPIA/GDPR review, AI Literacy și rol + risc unde se aplică.
              </div>
              <div className="cr-actions">
                <button
                  type="button"
                  className="cr-btn"
                  onClick={() => {
                    setImportText("")
                    setImportResults([])
                    setImportError("")
                  }}
                >
                  Curăță
                </button>
                <button
                  type="button"
                  className="cr-btn cr-btn--primary"
                  disabled={importing || validImportRows.length === 0}
                  onClick={handleImportClients}
                >
                  {importing ? "Se importă..." : `Importă ${validImportRowsLabel}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeImportTab === "ai_systems" && showImport && (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div className="cr-alert cr-alert--info" style={{ display: "block" }}>
              <strong>Importă sisteme AI pe clienți existenți.</strong> Identifică fiecare client prin{" "}
              <code>client_name</code>, <code>client_cui</code>, <code>client_external_id</code> sau{" "}
              <code>client_org_id</code>. Importul creează în inventarul clientului un sistem AI cu rol/risc
              preliminar, dar nu transformă declarațiile din CSV în verdict juridic final.
            </div>

            <textarea
              className="cr-input"
              value={aiSystemsImportText}
              onChange={(event) => {
                setAiSystemsImportText(event.target.value)
                setAiSystemsImportResults([])
                setAiSystemsImportError("")
              }}
              rows={8}
              placeholder={"client_name,system_name,purpose,vendor,model_type,uses_personal_data,automated_decisions,impacts_rights,human_review\nApex Logistic SRL,ChatGPT Team,support-chatbot,OpenAI,GPT-4o,yes,no,no,yes"}
              style={{ fontFamily: "var(--font-mono)", minHeight: 160 }}
            />

            {aiSystemsImportPreview && (
              <div className="cr-stat-strip cr-stat-strip--three">
                <div className="cr-stat">
                  <div className="cr-stat__value">{aiSystemsImportPreview.validRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>sisteme valide</div>
                </div>
                <div className="cr-stat">
                  <div className="cr-stat__value">{aiSystemsImportPreview.errorRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>cu erori</div>
                </div>
                <div className="cr-stat">
                  <div className="cr-stat__value">{aiSystemsImportPreview.warningRows}</div>
                  <div className="cr-stat__label" style={{ marginTop: 8 }}>cu atenționări</div>
                </div>
              </div>
            )}

            {aiSystemsImportPreview && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 8,
                }}
              >
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">High-risk suspect</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "var(--red-500)" }}>
                    {aiSystemsImportSummary.highRisk}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    HR, scoring, biometric sau impact drepturi.
                  </p>
                </div>
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">Date personale</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                    {aiSystemsImportSummary.personalData}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    Creează semnal pentru GDPR/DPIA review.
                  </p>
                </div>
                <div className="cr-card" style={{ padding: 12 }}>
                  <div className="cr-eyebrow">Fără human review</div>
                  <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "var(--amber-500)" }}>
                    {aiSystemsImportSummary.noHumanReview}
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-muted)", fontSize: 12 }}>
                    Necesită confirmare înainte de Audit Pack.
                  </p>
                </div>
              </div>
            )}

            {aiSystemsImportPreview && (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--bg-raised)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "64px 1.1fr 1.1fr 0.8fr 0.8fr 1.2fr",
                    gap: 12,
                    padding: "10px 12px",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--ink-dim)",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span>Rând</span>
                  <span>Client</span>
                  <span>Sistem</span>
                  <span>Scop</span>
                  <span>Vendor</span>
                  <span>Status</span>
                </div>
                {aiSystemsImportPreview.rows.slice(0, 12).map((row) => {
                  const clientLabel =
                    row.clientName ?? row.clientCui ?? row.clientExternalId ?? row.clientOrgId ?? "—"
                  const riskLabel =
                    row.errors.length === 0
                      ? aiSystemImportDraftToRecord(row).riskLevel
                      : "invalid"
                  return (
                    <div
                      key={`${row.rowNumber}-${row.systemName}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px 1.1fr 1.1fr 0.8fr 0.8fr 1.2fr",
                        gap: 12,
                        padding: "11px 12px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                        {row.rowNumber}
                      </span>
                      <span style={{ fontWeight: 600 }}>{clientLabel}</span>
                      <span>{row.systemName || "—"}</span>
                      <span style={{ color: "var(--ink-muted)" }}>{row.purposeRaw ?? row.purpose}</span>
                      <span style={{ color: "var(--ink-muted)" }}>{row.vendor ?? "—"}</span>
                      <span
                        className={
                          row.errors.length
                            ? "cr-badge cr-badge--critical"
                            : row.warnings.length
                              ? "cr-badge cr-badge--high"
                              : riskLabel === "high"
                                ? "cr-badge cr-badge--critical"
                                : "cr-badge cr-badge--ok"
                        }
                      >
                        {row.errors[0] ?? row.warnings[0] ?? `risc ${riskLabel}`}
                      </span>
                    </div>
                  )
                })}
                {aiSystemsImportPreview.rows.length > 12 && (
                  <div style={{ padding: 10, color: "var(--ink-dim)", fontSize: 12 }}>
                    + {aiSystemsImportPreview.rows.length - 12} sisteme AI în fișier
                  </div>
                )}
              </div>
            )}

            {aiSystemsImportError && (
              <div className="cr-alert cr-alert--danger">{aiSystemsImportError}</div>
            )}

            {aiSystemsImportResults.length > 0 && (
              <div className="cr-alert cr-alert--info" style={{ display: "block" }}>
                <strong>Import sisteme AI finalizat:</strong>{" "}
                {aiSystemsImportResults.filter((result) => result.ok).length} importate,{" "}
                {aiSystemsImportResults.filter((result) => !result.ok).length} respinse.
                <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                  {aiSystemsImportResults.slice(0, 6).map((result) => (
                    <div key={`${result.rowNumber}-${result.entityName}`} style={{ fontSize: 12 }}>
                      {result.ok ? "✓" : "!"} rând {result.rowNumber}: {result.entityName} —{" "}
                      {result.message}
                      {result.generatedFindings?.length
                        ? ` · ${result.generatedFindings.length} acțiuni`
                        : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="cr-actions" style={{ justifyContent: "space-between" }}>
              <div style={{ color: "var(--ink-dim)", fontSize: 12.5 }}>
                După import, sistemele intră în inventarul clientului, primesc risk triage preliminar și
                generează audit trail. Dacă clientul nu există, importul îl respinge ca să nu creeze dosare greșite.
              </div>
              <div className="cr-actions">
                <button
                  type="button"
                  className="cr-btn"
                  onClick={() => {
                    setAiSystemsImportText("")
                    setAiSystemsImportResults([])
                    setAiSystemsImportError("")
                  }}
                >
                  Curăță
                </button>
                <button
                  type="button"
                  className="cr-btn cr-btn--primary"
                  disabled={aiSystemsImporting || validAISystemImportRows.length === 0}
                  onClick={handleImportAISystems}
                >
                  {aiSystemsImporting ? "Se importă..." : `Importă ${validAISystemImportRowsLabel}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {portfolioImportDescriptor &&
          (activeImportTab === "vendors_models" ||
            activeImportTab === "ropa" ||
            activeImportTab === "ai_literacy") &&
          showImport && (
            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              <div className="cr-alert cr-alert--info" style={{ display: "block" }}>
                <strong>Import draft cu review obligatoriu.</strong>{" "}
                {portfolioImportDescriptor.intro} Rândurile fără client valid sunt respinse.
              </div>

              <textarea
                className="cr-input"
                value={portfolioImportDescriptor.textarea}
                onChange={(event) => {
                  portfolioImportDescriptor.setTextarea(event.target.value)
                  setPortfolioImportResults([])
                  setPortfolioImportError("")
                }}
                rows={8}
                placeholder={portfolioImportDescriptor.placeholder}
                style={{ fontFamily: "var(--font-mono)", minHeight: 160 }}
              />

              {activePortfolioPreview && (
                <div className="cr-stat-strip cr-stat-strip--three">
                  <div className="cr-stat">
                    <div className="cr-stat__value">{activePortfolioPreview.validRows}</div>
                    <div className="cr-stat__label" style={{ marginTop: 8 }}>rânduri valide</div>
                  </div>
                  <div className="cr-stat">
                    <div className="cr-stat__value">{activePortfolioPreview.errorRows}</div>
                    <div className="cr-stat__label" style={{ marginTop: 8 }}>cu erori</div>
                  </div>
                  <div className="cr-stat">
                    <div className="cr-stat__value">{activePortfolioPreview.warningRows}</div>
                    <div className="cr-stat__label" style={{ marginTop: 8 }}>cu atenționări</div>
                  </div>
                </div>
              )}

              {activePortfolioPreview && (
                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "var(--bg-raised)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "64px 1.1fr 1.4fr 0.8fr 1.2fr",
                      gap: 12,
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      color: "var(--ink-dim)",
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    <span>Rând</span>
                    <span>Client</span>
                    <span>Entitate</span>
                    <span>Acțiune</span>
                    <span>Status</span>
                  </div>
                  {activePortfolioPreview.rows.slice(0, 12).map((row) => (
                    <div
                      key={`${row.rowNumber}-${portfolioEntityName(row)}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px 1.1fr 1.4fr 0.8fr 1.2fr",
                        gap: 12,
                        padding: "11px 12px",
                        borderBottom: "1px solid var(--border)",
                        alignItems: "center",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: "var(--ink-muted)", fontFamily: "var(--font-mono)" }}>
                        {row.rowNumber}
                      </span>
                      <span style={{ fontWeight: 600 }}>{portfolioClientLabel(row)}</span>
                      <span>{portfolioEntityName(row)}</span>
                      <span style={{ color: "var(--ink-muted)" }}>create/update</span>
                      <span
                        className={
                          row.errors.length
                            ? "cr-badge cr-badge--critical"
                            : row.warnings.length
                              ? "cr-badge cr-badge--high"
                              : "cr-badge cr-badge--ok"
                        }
                      >
                        {row.errors[0] ?? row.warnings[0] ?? portfolioDetail(row)}
                      </span>
                    </div>
                  ))}
                  {activePortfolioPreview.rows.length > 12 && (
                    <div style={{ padding: 10, color: "var(--ink-dim)", fontSize: 12 }}>
                      + {activePortfolioPreview.rows.length - 12} rânduri în fișier
                    </div>
                  )}
                </div>
              )}

              {portfolioImportError && (
                <div className="cr-alert cr-alert--danger">{portfolioImportError}</div>
              )}

              {portfolioImportResults.length > 0 && (
                <div className="cr-alert cr-alert--info" style={{ display: "block" }}>
                  <strong>Import finalizat:</strong>{" "}
                  {portfolioImportResults.filter((result) => result.ok).length} importate,{" "}
                  {portfolioImportResults.filter((result) => !result.ok).length} respinse.
                  <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                    {portfolioImportResults.slice(0, 6).map((result) => (
                      <div key={`${result.rowNumber}-${result.entityName}`} style={{ fontSize: 12 }}>
                        {result.ok ? "✓" : "!"} rând {result.rowNumber}: {result.entityName} —{" "}
                        {result.message}
                        {result.generatedFindings.length > 0
                          ? ` · ${result.generatedFindings.length} acțiuni`
                          : ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="cr-actions" style={{ justifyContent: "space-between" }}>
                <div style={{ color: "var(--ink-dim)", fontSize: 12.5 }}>
                  Importul creează recorduri draft, status de certitudine, acțiuni și audit trail. Nu aplică verdict legal final.
                </div>
                <div className="cr-actions">
                  <button
                    type="button"
                    className="cr-btn"
                    onClick={() => {
                      portfolioImportDescriptor.setTextarea("")
                      setPortfolioImportResults([])
                      setPortfolioImportError("")
                    }}
                  >
                    Curăță
                  </button>
                  <button
                    type="button"
                    className="cr-btn cr-btn--primary"
                    disabled={
                      portfolioImporting === activeImportTab || activePortfolioValidRows.length === 0
                    }
                    onClick={handlePortfolioImport}
                  >
                    {portfolioImporting === activeImportTab
                      ? "Se importă..."
                      : `Importă ${portfolioImportDescriptor.noun}`}
                  </button>
                </div>
              </div>
            </div>
          )}
      </section>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--ink-dim)",
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după nume sau CUI…"
            className="cr-input"
            style={{
              width: "100%",
              paddingLeft: "32px",
            }}
          />
        </div>

        <div className="cr-segment-bar">
          {(["all", "onboarded", "pending"] as StatusFilter[]).map((s) => {
            const active = statusFilter === s
            const label = s === "all" ? "Toți" : s === "onboarded" ? "Onboarded" : "În așteptare"
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`cr-tab ${active ? "is-active" : ""}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--ink-dim)", fontSize: "13px" }}>
          Se încarcă lista clienților…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            border: "1px dashed var(--border-strong)",
            borderRadius: "12px",
            color: "var(--ink-dim)",
            fontSize: "13.5px",
          }}
        >
          {clients.length === 0
            ? "Nu ai încă niciun client. Încarcă CSV-ul sau lipește datele în Import Center."
            : "Niciun client nu se potrivește cu filtrele actuale."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((c) => (
            <div
              key={c.orgId}
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--cobalt-soft)",
                  color: "var(--cobalt-400)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2 size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    marginBottom: "2px",
                  }}
                >
                  {c.orgName}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--ink-dim)",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  {c.cui && <span>CUI {c.cui}</span>}
                  {c.contactEmail && <span>{c.contactEmail}</span>}
                  <span>{c.aiSystemsCount} sisteme AI</span>
                  <span>{c.literacyTrainingsCount} training-uri</span>
                  {(c.importSignalsCount ?? 0) > 0 && (
                    <span>{c.importSignalsCount} acțiuni inițiale</span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: c.onboardingCompleted ? "var(--emerald-400)" : "var(--amber-400)",
                }}
              >
                {c.onboardingCompleted ? (
                  <>
                    <CheckCircle2 size={12} /> Onboarded
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} /> În așteptare
                  </>
                )}
              </div>

              <button
                type="button"
                aria-label={`Intră în execuție pentru ${c.orgName}`}
                onClick={() => handleSwitch(c.orgId)}
                disabled={switching === c.orgId}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-strong)",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontSize: "12.5px",
                  cursor: switching === c.orgId ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {switching === c.orgId ? "..." : "Intră în execuție"}
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
