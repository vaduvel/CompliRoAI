"use client"

import { useCallback, useEffect, useState, type CSSProperties } from "react"
import {
  Download,
  ShieldCheck,
  Users,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  FileSignature,
} from "lucide-react"

type ClientRow = {
  orgId: string
  orgName: string
  cui?: string
}

type AuthMeResponse = {
  user?: {
    workspaceMode?: string
    orgName?: string
  } | null
  workspaces?: Array<{
    orgId: string
    orgName: string
    role: string
    status: string
  }>
}

type PackEntry = {
  id: string
  orgId: string
  orgName: string
  hashRoot: string
  fileCount: number
  sizeBytes: number
  createdAtISO: string
  reSigned?: boolean
  exportReadinessStatus?: ExportReadinessStatus
  exportBlockersCount?: number
  packKind?: AuditPackKind
}

type ExportReadinessStatus = "blocked" | "draft_only" | "ready_for_review" | "approved"

type AuditPackKind = "blocked_draft" | "draft" | "review" | "final"

type VerifyResult = {
  valid: boolean
  errors: string[]
  computedHash: string | null
  expectedHash: string | null
}

type ReadinessResponse = {
  snapshot: {
    aiUseCasesCandidateCount: number
    aiUseCasesConfirmedCount: number
    aiSystems: number
    evidenceMissingCount: number
    reviewPendingCount: number
    exportReadinessStatus: ExportReadinessStatus
    exportBlockersCount: number
  }
  exportReadinessLabel: string
  exportBlockers: Array<{
    id: string
    code: string
    title: string
    statusLabel: string
    ownerRole: string
    requiredEvidence: string[]
    reviewGate: string
    href: string
  }>
}

export default function AuditPackPage() {
  const [workspaceMode, setWorkspaceMode] = useState<"solo" | "cabinet">("solo")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("__self__")
  const [generating, setGenerating] = useState(false)
  const [reSigning, setReSigning] = useState<string | null>(null)
  const [registry, setRegistry] = useState<PackEntry[]>([])
  const [registryLoading, setRegistryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [verifyHash, setVerifyHash] = useState("")
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResponse | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [currentOrgName, setCurrentOrgName] = useState("")

  const loadRegistry = useCallback(async () => {
    setRegistryLoading(true)
    try {
      const res = await fetchWithTimeout("/api/audit-pack/registry")
      if (res.ok) {
        const data = await res.json()
        setRegistry(data.packs ?? [])
      }
    } catch {
      // ignore
    } finally {
      setRegistryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWithTimeout("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AuthMeResponse | null) => {
        if (d?.user?.orgName) {
          setCurrentOrgName(d.user.orgName)
        }
        if (d?.user?.workspaceMode === "cabinet") {
          setWorkspaceMode("cabinet")
          const workspaceClients =
            d.workspaces
              ?.filter((workspace) => workspace.role === "partner_manager" && workspace.status === "active")
              .map((workspace) => ({
                orgId: workspace.orgId,
                orgName: workspace.orgName,
              })) ?? []
          if (workspaceClients.length > 0) {
            // Fallback imediat: audit pack-ul are nevoie doar de orgId/orgName.
            // /api/portfolio/clients poate îmbogăți ulterior cu CUI și metadata.
            setClients(workspaceClients)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (workspaceMode !== "cabinet") return
    fetchWithTimeout("/api/portfolio/clients")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.clients)) {
          const portfolioClients = data.clients.map((c: { orgId: string; orgName: string; cui?: string }) => ({
              orgId: c.orgId,
              orgName: c.orgName,
              cui: c.cui,
            }))
          setClients((current) =>
            portfolioClients.length > 0 || current.length === 0 ? portfolioClients : current
          )
        }
      })
      .catch(() => {})
  }, [workspaceMode])

  useEffect(() => {
    loadRegistry()
  }, [loadRegistry])

  useEffect(() => {
    let cancelled = false
    const clientOrgId = selectedClient === "__self__" ? null : selectedClient
    const url = clientOrgId
      ? `/api/audit-pack/readiness?clientOrgId=${encodeURIComponent(clientOrgId)}`
      : "/api/audit-pack/readiness"

    setReadinessLoading(true)
    fetchWithTimeout(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ReadinessResponse | null) => {
        if (!cancelled) setReadiness(data)
      })
      .catch(() => {
        if (!cancelled) setReadiness(null)
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedClient])

  async function handleGenerate() {
    setError(null)
    setGenerating(true)
    try {
      const clientOrgId = selectedClient === "__self__" ? null : selectedClient
      const params = new URLSearchParams()
      if (clientOrgId) params.set("clientOrgId", clientOrgId)
      if (readiness?.snapshot.exportReadinessStatus === "approved") params.set("final", "true")
      const query = params.toString()
      const url = query ? `/api/exports/audit-pack?${query}` : "/api/exports/audit-pack"
      const res = await fetchWithTimeout(url, {}, 30000)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Eroare ${res.status}`)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(cd)
      const fileName = match?.[1] ?? "compliroai-audit-pack.zip"
      triggerDownload(blob, fileName)
      // Reload registry after a moment so the new pack appears.
      setTimeout(() => loadRegistry(), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la generare.")
    } finally {
      setGenerating(false)
    }
  }

  async function handleReSign(orgId: string) {
    setError(null)
    setReSigning(orgId)
    try {
      const res = await fetchWithTimeout("/api/exports/audit-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientOrgId: orgId === "__self__" ? undefined : orgId,
          reSign: true,
        }),
      }, 30000)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Eroare ${res.status}`)
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(cd)
      const fileName = match?.[1] ?? "compliroai-audit-pack-resigned.zip"
      triggerDownload(blob, fileName.replace(".zip", "-resigned.zip"))
      setTimeout(() => loadRegistry(), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la re-semnare.")
    } finally {
      setReSigning(null)
    }
  }

  async function handleVerifyHash() {
    if (!verifyHash.trim()) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      // Quick check — find by hash in registry.
      const match = registry.find((p) => p.hashRoot.toLowerCase() === verifyHash.trim().toLowerCase())
      if (match) {
        setVerifyResult({
          valid: true,
          errors: [],
          computedHash: match.hashRoot,
          expectedHash: verifyHash.trim(),
        })
      } else {
        setVerifyResult({
          valid: false,
          errors: ["Hash-ul nu a fost găsit în registrul tău. Verifică ZIP-ul pe pagina publică /verify-pack."],
          computedHash: null,
          expectedHash: verifyHash.trim(),
        })
      }
    } finally {
      setVerifying(false)
    }
  }

  function copyToClipboard(value: string) {
    setVerifyHash(value)
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedHash(value)
        setTimeout(() => setCopiedHash(null), 1500)
      })
      .catch(() => {
        setCopiedHash(value)
        setTimeout(() => setCopiedHash(null), 1500)
      })
  }

  const targetLabel =
    selectedClient === "__self__"
      ? currentOrgName || "workspace-ul curent"
      : clients.find((c) => c.orgId === selectedClient)?.orgName ?? "client necunoscut"
  const generationLabel = auditPackGenerationLabel({
    generating,
    readiness,
    targetLabel,
  })

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Rapoarte & dosar</span>
          <h1 className="cr-title">Audit Pack</h1>
          <p className="cr-subtitle">
            Dovadă criptografică a conformității — un ZIP semnat cu hash chain SHA-256,
            imposibil de modificat post-fact fără a rupe lanțul.
          </p>
        </div>
      </div>

      {/* Explainer card */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
          display: "flex",
          gap: "16px",
          alignItems: "flex-start",
        }}
      >
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
          <ShieldCheck size={20} />
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: "4px",
            }}
          >
            Ce conține un audit pack?
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "18px",
              fontSize: "13px",
              color: "var(--ink-muted)",
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>MANIFEST.json</strong> — metadata, conținut, hash chain root
            </li>
            <li>
              <strong>inventory/ai-systems.json</strong> — toate sistemele AI înregistrate
            </li>
            <li>
              <strong>documents/annex-iv/*.md</strong> — toate documentele Annex IV
            </li>
            <li>
              <strong>literacy/training-records.json</strong> — evidențe Art. 4 (AI Literacy)
            </li>
            <li>
              <strong>share-tokens/history.json</strong> — toate magic links emise
            </li>
            <li>
              <strong>evidence/audit-trail.log</strong> — cronologie completă a acțiunilor
            </li>
            <li>
              <strong>compliance-report.html</strong> — raport executiv brand-uit
            </li>
            <li>
              <strong>signatures/SIGNATURE.txt</strong> — hash root + signature HMAC-SHA256
            </li>
          </ul>
          <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--ink-dim)" }}>
            Auditorul poate verifica integritatea pe{" "}
            <a
              href="/verify-pack"
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--cobalt-400)", textDecoration: "none" }}
            >
              /verify-pack
            </a>{" "}
            — orice modificare a unui singur byte invalidează lanțul.
          </div>
        </div>
      </div>

      {/* Readiness panel */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: "12px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Export readiness
            </div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", marginTop: "4px" }}>
              {readinessLoading ? "Se verifică dosarul…" : readiness?.exportReadinessLabel ?? "Readiness indisponibil"}
            </div>
            <p style={{ margin: "8px 0 0", fontSize: "13px", color: "var(--ink-muted)", maxWidth: "760px" }}>
              Audit Pack-ul folosește aceeași stare canonică din dashboard: importuri, AI use cases, findings,
              dovezi lipsă și review gates. Mistral poate explica planul, dar export readiness este calculat determinist.
            </p>
          </div>
          {readiness && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(90px, 1fr))",
                gap: "8px",
                minWidth: "320px",
              }}
            >
              <MiniReadinessStat label="AI candidate" value={readiness.snapshot.aiUseCasesCandidateCount} />
              <MiniReadinessStat label="AI confirmate" value={readiness.snapshot.aiUseCasesConfirmedCount} />
              <MiniReadinessStat label="Dovezi lipsă" value={readiness.snapshot.evidenceMissingCount} />
              <MiniReadinessStat label="Review pending" value={readiness.snapshot.reviewPendingCount} />
              <MiniReadinessStat label="Blocker-e" value={readiness.snapshot.exportBlockersCount} />
              <MiniReadinessStat label="Sisteme AI" value={readiness.snapshot.aiSystems} />
            </div>
          )}
        </div>

        {readiness?.exportBlockers.length ? (
          <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {readiness.exportBlockers.slice(0, 5).map((blocker) => (
              <div
                key={blocker.id}
                style={{
                  border: "1px solid rgba(245,158,11,0.28)",
                  background: "rgba(245,158,11,0.08)",
                  borderRadius: "8px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--amber-400)", fontWeight: 700 }}>
                    {blocker.code} · {blocker.statusLabel}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--ink)", fontWeight: 600, marginTop: "3px" }}>
                    {blocker.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "3px" }}>
                    {blocker.ownerRole} · {blocker.reviewGate}
                  </div>
                  {blocker.requiredEvidence.length > 0 && (
                    <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginTop: "3px" }}>
                      Dovadă cerută: {blocker.requiredEvidence.slice(0, 2).join("; ")}
                    </div>
                  )}
                </div>
                <a href={blocker.href} className="cr-btn cr-btn--secondary cr-btn--sm">
                  Deschide
                </a>
              </div>
            ))}
          </div>
        ) : (
          !readinessLoading && (
            <div style={{ marginTop: "14px", fontSize: "13px", color: "var(--ink-muted)" }}>
              {readiness?.snapshot.exportReadinessStatus === "approved"
                ? "Nu există blocker canonic deschis pentru export. Dosarul este gata pentru Audit Pack final."
                : "Nu există blocker canonic deschis pentru export. Dacă există review pending, acesta trebuie să apară ca finding sau cerere de aprobare."}
            </div>
          )
        )}
      </div>

      {/* Generate panel */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginBottom: "12px" }}>
          Generează audit pack
        </div>

        {workspaceMode === "cabinet" && clients.length > 0 && (
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                color: "var(--ink-muted)",
                marginBottom: "6px",
              }}
            >
              Pentru cine generezi
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="cr-select"
                style={{
                  width: "100%",
                  appearance: "none",
                }}
              >
                <option value="__self__">
                  {currentOrgName ? `${currentOrgName} (workspace curent)` : "Workspace curent"}
                </option>
                {clients.map((c) => (
                  <option key={c.orgId} value={c.orgId}>
                    {c.orgName}
                    {c.cui ? ` · ${c.cui}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-dim)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        )}

        {workspaceMode === "cabinet" && clients.length === 0 && (
          <div
            style={{
              padding: "10px 12px",
              background: "var(--bg-hover)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--ink-muted)",
              marginBottom: "12px",
            }}
          >
            <Users size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
            Nu ai încă clienți în portofoliu. Importă sau adaugă primul client din{" "}
            <a href="/dashboard/clienti" style={{ color: "var(--cobalt-400)" }}>Clienți</a>.
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating || readinessLoading}
          className="cr-btn cr-btn--primary"
        >
          {generating ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          {generationLabel}
        </button>

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "var(--red-soft)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--red-400)",
            }}
          >
            <AlertCircle size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }} />
            {error}
          </div>
        )}
      </div>

      {/* Verify hash (quick check vs registry) */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>
          Verifică hash chain root
        </div>
        <div style={{ fontSize: "12px", color: "var(--ink-muted)", marginBottom: "12px" }}>
          Caută rapid un hash root în registrul tău. Pentru verificare completă a unui
          ZIP (oricine, oriunde), folosește pagina publică{" "}
          <a href="/verify-pack" target="_blank" rel="noreferrer" style={{ color: "var(--cobalt-400)" }}>
            /verify-pack
          </a>
          .
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
            placeholder="ex: 5c8f3a…"
            className="cr-input"
            style={{
              flex: 1,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          />
          <button
            onClick={handleVerifyHash}
            disabled={verifying || !verifyHash.trim()}
            className="cr-btn cr-btn--secondary cr-btn--sm"
          >
            Verifică
          </button>
        </div>
        {verifyResult && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: verifyResult.valid ? "var(--emerald-soft)" : "var(--red-soft)",
              border: `1px solid ${verifyResult.valid ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
              borderRadius: "6px",
              fontSize: "12px",
              color: verifyResult.valid ? "var(--emerald-400)" : "var(--red-400)",
            }}
          >
            {verifyResult.valid ? (
              <>
                <CheckCircle2
                  size={12}
                  style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}
                />
                Hash găsit în registru — pachet emis de organizația ta.
              </>
            ) : (
              <>
                <AlertCircle
                  size={12}
                  style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}
                />
                {verifyResult.errors[0] ?? "Hash invalid."}
              </>
            )}
          </div>
        )}
      </div>

      {/* Registry */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "12px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            Audit pack-uri generate
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            {registryLoading ? "se încarcă…" : `${registry.length} pachete`}
          </div>
        </div>

        {!registryLoading && registry.length === 0 && (
          <div style={{ fontSize: "13px", color: "var(--ink-muted)", padding: "12px 0" }}>
            Niciun audit pack generat încă. Apasă „Generează” mai sus.
          </div>
        )}

        {registry.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {registry.map((pack) => (
              <div
                key={pack.id}
                style={{
                  border: "1px solid var(--border-soft)",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "var(--ink)",
                      fontWeight: 500,
                      marginBottom: "4px",
                    }}
                  >
                    {pack.orgName}
                    <span
                      title={auditPackKindDescription(pack)}
                      style={{
                        marginLeft: "8px",
                        fontSize: "10px",
                        padding: "1px 6px",
                        borderRadius: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: 700,
                        ...auditPackKindBadgeStyle(pack),
                      }}
                    >
                      {auditPackKindLabel(pack)}
                    </span>
                    {pack.reSigned && (
                      <span
                        style={{
                          marginLeft: "8px",
                          fontSize: "10px",
                          padding: "1px 6px",
                          background: "var(--cobalt-soft)",
                          color: "var(--cobalt-400)",
                          borderRadius: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontWeight: 600,
                        }}
                      >
                        re-signed
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-dim)",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {pack.hashRoot}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                      marginTop: "4px",
                    }}
                  >
                    {new Date(pack.createdAtISO).toLocaleString("ro-RO")} ·{" "}
                    {pack.fileCount} fișiere · {Math.round((pack.sizeBytes / 1024) * 10) / 10} KB
                    {pack.exportReadinessStatus && <> · {auditPackKindDescription(pack)}</>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => copyToClipboard(pack.hashRoot)}
                    title="Copiază și pune hash root în verificator"
                    className="cr-btn cr-btn--secondary cr-btn--sm"
                  >
                    <Copy size={11} />
                    {copiedHash === pack.hashRoot ? "Copiat!" : "Hash"}
                  </button>
                  {workspaceMode === "cabinet" && (
                    <button
                      onClick={() => handleReSign(pack.orgId)}
                      disabled={reSigning === pack.orgId}
                      title="Re-semnează cu brand-ul curent"
                      className="cr-btn cr-btn--secondary cr-btn--sm"
                    >
                      {reSigning === pack.orgId ? (
                        <Loader2 size={11} className="spin" />
                      ) : (
                        <FileSignature size={11} />
                      )}
                      Re-sign
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: "16px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-soft)",
            fontSize: "11px",
            color: "var(--ink-dim)",
          }}
        >
          <a
            href="/verify-pack"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "var(--cobalt-400)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            Deschide pagina publică de verificare <ExternalLink size={10} />
          </a>
        </div>
      </div>

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

function MiniReadinessStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        border: "1px solid var(--border-soft)",
        borderRadius: "8px",
        padding: "9px 10px",
        background: "var(--bg-hover)",
      }}
    >
      <div style={{ fontSize: "10px", color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </div>
      <div style={{ fontSize: "17px", fontWeight: 700, color: "var(--ink)", marginTop: "2px" }}>
        {value}
      </div>
    </div>
  )
}

function auditPackGenerationLabel({
  generating,
  readiness,
  targetLabel,
}: {
  generating: boolean
  readiness: ReadinessResponse | null
  targetLabel: string
}) {
  if (generating) return "Generăm ZIP-ul…"
  if (!readiness) return `Generează pentru ${targetLabel}`
  if (readiness.snapshot.exportReadinessStatus === "blocked") {
    return `Generează draft cu blocker-e pentru ${targetLabel}`
  }
  if (readiness.snapshot.exportReadinessStatus === "draft_only") {
    return `Generează draft pentru ${targetLabel}`
  }
  if (readiness.snapshot.exportReadinessStatus === "approved") {
    return `Generează Audit Pack final pentru ${targetLabel}`
  }
  return `Generează Audit Pack pentru review pentru ${targetLabel}`
}

function auditPackKindFor(pack: PackEntry): AuditPackKind | "legacy" {
  if (pack.packKind) return pack.packKind
  if (pack.exportReadinessStatus === "approved") return "final"
  if (pack.exportReadinessStatus === "ready_for_review") return "review"
  if (pack.exportReadinessStatus === "blocked") return "blocked_draft"
  if (pack.exportReadinessStatus === "draft_only") return "draft"
  return "legacy"
}

function auditPackKindLabel(pack: PackEntry) {
  const kind = auditPackKindFor(pack)
  if (kind === "final") return "final"
  if (kind === "review") return "review"
  if (kind === "blocked_draft") return "blocked"
  if (kind === "draft") return "draft"
  return "legacy"
}

function auditPackKindDescription(pack: PackEntry) {
  const kind = auditPackKindFor(pack)
  if (kind === "final") return "Audit Pack final: fără blocker-e canonice la momentul exportului."
  if (kind === "review") return "Pack pentru review: gata de verificare, dar nu marcat final."
  if (kind === "blocked_draft") {
    const blockers = pack.exportBlockersCount ?? 0
    return `Draft blocat: ${blockers} blocker-e canonice deschise la momentul exportului.`
  }
  if (kind === "draft") return "Draft: dosarul nu avea încă suficiente date pentru livrare finală."
  return "Pack generat înainte de etichetarea readiness/final."
}

function auditPackKindBadgeStyle(pack: PackEntry): CSSProperties {
  const kind = auditPackKindFor(pack)
  if (kind === "final") {
    return {
      background: "rgba(22, 163, 74, 0.12)",
      color: "#15803d",
      border: "1px solid rgba(22, 163, 74, 0.2)",
    }
  }
  if (kind === "review") {
    return {
      background: "var(--cobalt-soft)",
      color: "var(--cobalt-400)",
      border: "1px solid rgba(59, 91, 219, 0.18)",
    }
  }
  if (kind === "blocked_draft") {
    return {
      background: "rgba(220, 38, 38, 0.1)",
      color: "#b91c1c",
      border: "1px solid rgba(220, 38, 38, 0.2)",
    }
  }
  if (kind === "draft") {
    return {
      background: "rgba(245, 158, 11, 0.12)",
      color: "#b45309",
      border: "1px solid rgba(245, 158, 11, 0.22)",
    }
  }
  return {
    background: "rgba(100, 116, 139, 0.1)",
    color: "var(--ink-muted)",
    border: "1px solid var(--border-soft)",
  }
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? controller.signal,
    })
  } finally {
    window.clearTimeout(timer)
  }
}

function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
