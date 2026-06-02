"use client"

/**
 * Sprint 013 — /dashboard/trust-center
 *
 * Cabinet management pentru link-uri publice Trust Center:
 *  - listă tokens active + history (cu copy URL + revoke)
 *  - modal "Creează link" (label + opțional expirare zile)
 *  - panou preview cu profile public (live)
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Calendar,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react"

import type { TrustCenterToken } from "@/lib/compliance/types"

type TokenWithUrl = TrustCenterToken & {
  publicUrl: string
  derivedStatus: "active" | "revoked" | "expired"
}

type ListResponse = { tokens: TokenWithUrl[]; orgName: string }

export default function TrustCenterDashboard() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [label, setLabel] = useState("")
  const [expiresInDays, setExpiresInDays] = useState<number | "">("")
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [previewToken, setPreviewToken] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/trust-center", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as ListResponse
      setData(json)
      if (!previewToken && json.tokens.length > 0) {
        const active = json.tokens.find((t) => t.derivedStatus === "active") ?? json.tokens[0]
        setPreviewToken(active.token)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la încărcare")
    } finally {
      setLoading(false)
    }
  }, [previewToken])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function createToken() {
    if (!label.trim()) {
      setError("Adaugă o etichetă pentru link.")
      return
    }
    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/trust-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          expiresInDays: expiresInDays === "" ? undefined : Number(expiresInDays),
        }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      setShowCreate(false)
      setLabel("")
      setExpiresInDays("")
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la creare")
    } finally {
      setCreating(false)
    }
  }

  async function revokeToken(token: string) {
    if (!confirm("Sigur revoci acest link? Devine imediat invalid pentru cei care îl deschid.")) return
    try {
      const res = await fetch(`/api/trust-center/${encodeURIComponent(token)}`, { method: "DELETE" })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la revocare")
    }
  }

  function copyUrl(url: string, key: string) {
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (loading) {
    return (
      <div className="cr-page cr-empty">
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
        <div>Se încarcă Trust Center…</div>
      </div>
    )
  }

  const tokens = data?.tokens ?? []

  return (
    <div className="cr-page cr-page--full cr-stack">
      {/* Header */}
      <header className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <Eye size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Colaborare</div>
            <h1 className="cr-title">Trust Center</h1>
            <p className="cr-subtitle">
              Generează link-uri publice pe care le poți trimite clienților sau auditorilor pentru a dovedi postura
              ta de compliance (AI Act + GDPR + DORA/NIS2). Pagina publică afișează doar counts agregate + frameworks
              declarate + hash root al ultimului audit pack. NU expune findings, breach details sau nume vendori.
            </p>
          </div>
        </div>
      </header>

      {/* Action bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: "var(--accent-soft)",
            color: "var(--accent)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Plus size={12} /> Creează link nou
        </button>
        <button
          onClick={() => void refresh()}
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--ink-dim)",
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={12} /> Reîmprospătează
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 6,
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.4)",
            color: "#f87171",
            fontSize: 12,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Tokens list */}
        <section>
          <h2
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-dim)",
              marginBottom: 10,
            }}
          >
            Link-uri publice
          </h2>
          {tokens.length === 0 && (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 13,
                border: "1px dashed var(--border)",
                borderRadius: 8,
              }}
            >
              Niciun link generat. Apasă „Creează link nou".
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tokens.map((t) => {
              const isPreview = previewToken === t.token
              const statusColor =
                t.derivedStatus === "active" ? "#34d399" : t.derivedStatus === "revoked" ? "#f87171" : "#fbbf24"
              return (
                <div
                  key={t.id}
                  style={{
                    border: `1px solid ${isPreview ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    background: "var(--bg-elev)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", flex: 1 }}>{t.label}</div>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: `${statusColor}22`,
                        color: statusColor,
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {t.derivedStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ink-dim)", display: "flex", flexWrap: "wrap", gap: 12 }}>
                    <span>creat {new Date(t.createdAtISO).toLocaleDateString("ro-RO")}</span>
                    <span>de {t.createdByEmail}</span>
                    {t.expiresAtISO && <span>expiră {new Date(t.expiresAtISO).toLocaleDateString("ro-RO")}</span>}
                    <span>{t.viewCount} {t.viewCount === 1 ? "vizualizare" : "vizualizări"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => copyUrl(t.publicUrl, t.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 5,
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--ink-dim)",
                        fontSize: 11,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {copied === t.id ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                      {copied === t.id ? "Copiat!" : "Copiază URL"}
                    </button>
                    <a
                      href={t.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "5px 10px",
                        borderRadius: 5,
                        border: "1px solid var(--border)",
                        color: "var(--ink-dim)",
                        fontSize: 11,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <ExternalLink size={11} /> Deschide
                    </a>
                    <button
                      onClick={() => setPreviewToken(t.token)}
                      disabled={t.derivedStatus !== "active"}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 5,
                        border: `1px solid ${isPreview ? "var(--accent)" : "var(--border)"}`,
                        background: isPreview ? "var(--accent-soft)" : "transparent",
                        color: isPreview ? "var(--accent)" : "var(--ink-dim)",
                        fontSize: 11,
                        cursor: t.derivedStatus !== "active" ? "not-allowed" : "pointer",
                        opacity: t.derivedStatus !== "active" ? 0.5 : 1,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isPreview ? <EyeOff size={11} /> : <Eye size={11} />} Preview
                    </button>
                    {t.derivedStatus === "active" && (
                      <button
                        onClick={() => void revokeToken(t.token)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 5,
                          border: "1px solid rgba(248,113,113,0.5)",
                          background: "transparent",
                          color: "#f87171",
                          fontSize: 11,
                          cursor: "pointer",
                          marginLeft: "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Trash2 size={11} /> Revocă
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Preview */}
        <section>
          <h2
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink-dim)",
              marginBottom: 10,
            }}
          >
            Preview public surface
          </h2>
          {previewToken ? (
            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg-elev)",
                height: 720,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <iframe
                src={`/trust/${previewToken}`}
                title="Trust Center preview"
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  background: "white",
                }}
              />
            </div>
          ) : (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                color: "var(--ink-dim)",
                fontSize: 13,
                border: "1px dashed var(--border)",
                borderRadius: 8,
              }}
            >
              <ShieldCheck size={20} style={{ marginBottom: 6, opacity: 0.6 }} />
              <div>Selectează un link activ ca să vezi preview-ul.</div>
            </div>
          )}
        </section>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg-elev)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 24,
              width: "100%",
              maxWidth: 460,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Plus size={18} color="var(--accent)" />
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Creează link Trust Center</h2>
              <button
                aria-label="Închide formularul Trust Center"
                className="cr-btn cr-btn--icon cr-btn--sm"
                onClick={() => setShowCreate(false)}
                style={{ marginLeft: "auto" }}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Etichetă (apare doar la cabinet)
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="ex: Pentru clientul ABC SRL"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "var(--bg-sidebar)",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 6,
                  }}
                >
                  Expirare (zile) — opțional
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="ex: 30"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    background: "var(--bg-sidebar)",
                    color: "var(--ink)",
                    fontSize: 13,
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Calendar size={11} />
                  Lasă gol pentru link permanent (revocabil oricând).
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowCreate(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--ink-dim)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Anulează
                </button>
                <button
                  onClick={() => void createToken()}
                  disabled={creating}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid var(--accent)",
                    background: "var(--accent)",
                    color: "white",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: creating ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {creating ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={12} />}
                  Creează link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
