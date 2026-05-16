"use client"

import { useCallback, useEffect, useState } from "react"
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

type PackEntry = {
  id: string
  orgId: string
  orgName: string
  hashRoot: string
  fileCount: number
  sizeBytes: number
  createdAtISO: string
  reSigned?: boolean
}

type VerifyResult = {
  valid: boolean
  errors: string[]
  computedHash: string | null
  expectedHash: string | null
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

  const loadRegistry = useCallback(async () => {
    setRegistryLoading(true)
    try {
      const res = await fetch("/api/audit-pack/registry")
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
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.workspaceMode === "cabinet") {
          setWorkspaceMode("cabinet")
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (workspaceMode !== "cabinet") return
    fetch("/api/portfolio/clients")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.clients)) {
          setClients(
            data.clients.map((c: { orgId: string; orgName: string; cui?: string }) => ({
              orgId: c.orgId,
              orgName: c.orgName,
              cui: c.cui,
            }))
          )
        }
      })
      .catch(() => {})
  }, [workspaceMode])

  useEffect(() => {
    loadRegistry()
  }, [loadRegistry])

  async function handleGenerate() {
    setError(null)
    setGenerating(true)
    try {
      const clientOrgId = selectedClient === "__self__" ? null : selectedClient
      const url = clientOrgId
        ? `/api/exports/audit-pack?clientOrgId=${encodeURIComponent(clientOrgId)}`
        : "/api/exports/audit-pack"
      const res = await fetch(url)
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
      const res = await fetch("/api/exports/audit-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientOrgId: orgId === "__self__" ? undefined : orgId,
          reSign: true,
        }),
      })
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
    navigator.clipboard.writeText(value).then(() => {
      setCopiedHash(value)
      setTimeout(() => setCopiedHash(null), 1500)
    })
  }

  const targetLabel =
    selectedClient === "__self__"
      ? "organizația ta"
      : clients.find((c) => c.orgId === selectedClient)?.orgName ?? "client necunoscut"

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "920px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Header */}
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
          Audit Pack
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Dovadă criptografică a conformității — un ZIP semnat cu hash chain SHA-256,
          imposibil de modificat post-fact fără a rupe lanțul.
        </p>
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
                style={{
                  width: "100%",
                  padding: "8px 32px 8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                  fontSize: "13px",
                  appearance: "none",
                  cursor: "pointer",
                }}
              >
                <option value="__self__">Organizația ta (cabinetul)</option>
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
            Nu ai încă clienți în portofoliu. Adaugă din{" "}
            <a href="/dashboard/portofoliu" style={{ color: "var(--cobalt-400)" }}>Portofoliu</a>.
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 16px",
            background: generating ? "var(--bg-hover)" : "var(--cobalt-400)",
            color: generating ? "var(--ink-dim)" : "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: generating ? "wait" : "pointer",
          }}
        >
          {generating ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
          {generating ? "Generăm ZIP-ul…" : `Generează pentru ${targetLabel}`}
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
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: "12px",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          />
          <button
            onClick={handleVerifyHash}
            disabled={verifying || !verifyHash.trim()}
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: verifying ? "wait" : "pointer",
            }}
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
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => copyToClipboard(pack.hashRoot)}
                    title="Copiază hash root"
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--border-strong)",
                      background: "var(--bg)",
                      color: "var(--ink-dim)",
                      fontSize: "11px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Copy size={11} />
                    {copiedHash === pack.hashRoot ? "Copiat!" : "Hash"}
                  </button>
                  {workspaceMode === "cabinet" && (
                    <button
                      onClick={() => handleReSign(pack.orgId)}
                      disabled={reSigning === pack.orgId}
                      title="Re-semnează cu brand-ul curent"
                      style={{
                        padding: "6px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-strong)",
                        background: "var(--bg)",
                        color: "var(--ink-dim)",
                        fontSize: "11px",
                        cursor: reSigning === pack.orgId ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
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
