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
  buildClientImportTemplateCsv,
  parseClientImportText,
  type ClientImportDraft,
  type ClientImportParseResult,
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
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importError, setImportError] = useState("")

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

  async function handleSwitch(orgId: string) {
    setSwitching(orgId)
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      })
      if (res.ok) {
        router.push("/dashboard/sisteme")
        router.refresh()
      }
    } finally {
      setSwitching(null)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([buildClientImportTemplateCsv()], {
      type: "text/csv;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "compliroai-client-import-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFileUpload(file: File | null) {
    if (!file) return
    const text = await file.text()
    setShowImport(true)
    setImportText(text)
    setImportResults([])
    setImportError("")
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
      setImportResults(data.results ?? [])
      await load()
    } catch {
      setImportError("Eroare de rețea la import.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Cabinet · registru</div>
          <h1 className="cr-title">Clienți & import</h1>
          <p className="cr-subtitle">
            Aici bagi clienții în cabinet. Importul creează organizațiile client,
            salvează context AI/GDPR și pregătește acțiunile inițiale.
          </p>
        </div>
        <div className="cr-actions" style={{ gap: 8 }}>
          <button type="button" className="cr-btn" onClick={downloadTemplate}>
            <Download size={14} /> Template CSV
          </button>
          <label className="cr-btn cr-btn--primary" style={{ cursor: "pointer" }}>
            <Upload size={14} /> Importă CSV
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
              Poți lipi CSV/TSV din Excel sau încărca fișier. Coloanele pot fi în RO/EN:
              nume firmă, CUI, contact, service_scope, uses_ai, personal_data_ai,
              high_risk_suspected, send_intake.
            </p>
          </div>
          <button
            type="button"
            className="cr-btn"
            onClick={() => {
              setShowImport((value) => !value)
              setImportError("")
            }}
          >
            {showImport ? "Închide import" : "Lipește CSV"}
          </button>
        </div>

        {showImport && (
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
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "var(--bg-raised)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1.4fr 0.8fr 1fr 1fr",
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
                  <span>Status</span>
                </div>
                {importPreview.rows.slice(0, 12).map((row) => (
                  <div
                    key={`${row.rowNumber}-${row.companyName}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "72px 1.4fr 0.8fr 1fr 1fr",
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
                După import, clienții apar în Portofoliu, iar semnalele inițiale rămân în metadata clientului.
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
                  {importing ? "Se importă..." : `Importă ${validImportRows.length} clienți`}
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
                {switching === c.orgId ? "..." : "Deschide"}
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
