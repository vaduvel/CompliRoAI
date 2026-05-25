"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  X,
} from "lucide-react"

type TargetType = "intake" | "approval" | "report"

type ShareRecord = {
  id: string
  targetType: TargetType
  targetId: string | null
  targetLabel: string | null
  recipientEmail: string | null
  status: "active" | "used" | "revoked" | "expired"
  createdAtISO: string
  expiresAtISO: string
  usedAtISO: string | null
  revokedAtISO: string | null
  metadata: Record<string, unknown> | null
}

type ClientRow = { orgId: string; orgName: string }

const TARGET_LABEL: Record<TargetType, string> = {
  intake: "Date firmă (intake)",
  approval: "Aprobare sistem AI",
  report: "Raport de conformitate",
}

const STATUS_STYLE: Record<
  ShareRecord["status"],
  { label: string; bg: string; color: string }
> = {
  active: { label: "Activ", bg: "rgba(16,185,129,0.12)", color: "#059669" },
  used: { label: "Folosit", bg: "rgba(59,91,219,0.12)", color: "#3b5bdb" },
  expired: { label: "Expirat", bg: "rgba(100,116,139,0.18)", color: "#475569" },
  revoked: { label: "Revocat", bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function MagicLinksClient() {
  const [records, setRecords] = useState<ShareRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [createdUrl, setCreatedUrl] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/share/review", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setRecords(data.records ?? [])
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

  async function handleRevoke(id: string) {
    if (!confirm("Sigur revoci acest link? Devine inutilizabil imediat.")) return
    const res = await fetch(`/api/share/revoke/${encodeURIComponent(id)}`, {
      method: "POST",
    })
    if (res.ok) await load()
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <Link2 size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Colaborare</div>
            <h1 className="cr-title">Magic Links</h1>
            <p className="cr-subtitle">
              Trimite intake, aprobări sau rapoarte clienților fără cont prin
              linkuri unice semnate HMAC.
            </p>
          </div>
        </div>
        {!showForm && (
          <button
            className="cr-btn cr-btn--primary"
            onClick={() => {
              setCreatedUrl(null)
              setShowForm(true)
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={15} /> Trimite magic link nou
          </button>
        )}
      </header>

      {showForm && (
        <NewLinkForm
          onCreated={(url) => {
            setCreatedUrl(url)
            setShowForm(false)
            load()
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {createdUrl && (
        <div
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-raised)",
            borderRadius: 10,
            padding: 16,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <CheckCircle2 size={18} style={{ color: "var(--emerald-400)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              Link generat
            </div>
            <code
              style={{
                fontSize: 12,
                color: "var(--ink-muted)",
                overflowWrap: "anywhere",
                display: "block",
                marginTop: 4,
              }}
            >
              {createdUrl}
            </code>
          </div>
          <button
            onClick={() => copyToClipboard(createdUrl, "created")}
            className={`cr-btn cr-btn--icon cr-btn--sm ${copiedId === "created" ? "cr-btn--success" : ""}`}
            title="Copiază link"
          >
            <Copy size={14} />
          </button>
          <a
            href={createdUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="cr-btn cr-btn--icon cr-btn--sm"
            title="Deschide într-un tab nou"
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => setCreatedUrl(null)}
            className="cr-btn cr-btn--icon cr-btn--sm"
            title="Închide"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--ink-dim)",
            marginBottom: 8,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {loading
            ? "Se încarcă…"
            : `${records.length} link${records.length !== 1 ? "uri" : ""}`}
        </div>

        {!loading && records.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--bg-raised)",
              border: "1px dashed var(--border-strong)",
              borderRadius: 10,
            }}
          >
            <Link2
              size={28}
              style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }}
            />
            <div
              style={{
                fontSize: 14,
                color: "var(--ink-muted)",
                marginBottom: 4,
              }}
            >
              Niciun link generat încă
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
              Folosește butonul de sus pentru a trimite primul magic link.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {records.map((r) => {
              const statusStyle = STATUS_STYLE[r.status]
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    gap: 16,
                    padding: "12px 14px",
                    background: "var(--bg-raised)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--ink)",
                        }}
                      >
                        {TARGET_LABEL[r.targetType]}
                      </span>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-dim)",
                        marginTop: 4,
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {r.recipientEmail && (
                        <span>Trimis la: {r.recipientEmail}</span>
                      )}
                      {r.targetLabel && (
                        <span title={r.targetLabel}>{r.targetLabel}</span>
                      )}
                      <span>
                        <Clock
                          size={11}
                          style={{
                            display: "inline",
                            verticalAlign: "-2px",
                            marginRight: 4,
                          }}
                        />
                        Expiră: {formatDate(r.expiresAtISO)}
                      </span>
                      {r.usedAtISO && (
                        <span>Folosit: {formatDate(r.usedAtISO)}</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-dim)",
                        marginTop: 2,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {r.id}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {r.status === "active" && (
                      <button
                        onClick={() => handleRevoke(r.id)}
                        className="cr-btn cr-btn--danger cr-btn--sm"
                        title="Revocă"
                      >
                        Revocă
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function NewLinkForm({
  onCreated,
  onCancel,
}: {
  onCreated: (url: string) => void
  onCancel: () => void
}) {
  const [targetType, setTargetType] = useState<TargetType>("intake")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [recipientEmail, setRecipientEmail] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [targetLabel, setTargetLabel] = useState("")
  const [targetId, setTargetId] = useState("")
  const [aiSystems, setAiSystems] = useState<
    { id: string; name: string }[]
  >([])
  const [note, setNote] = useState("")
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pre-load clients (for the label dropdown — informational only,
  // since the token is bound to the cabinet's CURRENT workspace).
  useEffect(() => {
    fetch("/api/portfolio/clients")
      .then((r) => (r.ok ? r.json() : { clients: [] }))
      .then((d) => setClients(d.clients ?? []))
      .catch(() => {})
  }, [])

  // Pre-load AI systems of current workspace, for approval picker.
  useEffect(() => {
    if (targetType !== "approval") return
    fetch("/api/ai-systems")
      .then((r) => (r.ok ? r.json() : { systems: [] }))
      .then((d) =>
        setAiSystems(
          (d.systems ?? []).map((s: { id: string; name: string }) => ({
            id: s.id,
            name: s.name,
          }))
        )
      )
      .catch(() => {})
  }, [targetType])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const body = {
        targetType,
        recipientEmail: recipientEmail.trim() || undefined,
        recipientName: recipientName.trim() || undefined,
        targetLabel: targetLabel.trim() || undefined,
        targetId: targetId.trim() || undefined,
        note: note.trim() || undefined,
        expiresInDays,
      }
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Eroare la generare.")
        return
      }
      onCreated(data.url)
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}
      >
        Magic Link nou
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 8,
        }}
      >
        {(["intake", "approval", "report"] as TargetType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTargetType(t)}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border:
                targetType === t
                  ? "1px solid var(--cobalt-600)"
                  : "1px solid var(--border)",
              background:
                targetType === t
                  ? "var(--cobalt-soft)"
                  : "var(--bg)",
              color: "var(--ink)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              textAlign: "left",
            }}
          >
            <div>{TARGET_LABEL[t]}</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-dim)",
                marginTop: 2,
              }}
            >
              {t === "intake" && "Client completează date firmă"}
              {t === "approval" && "Client aprobă un sistem AI"}
              {t === "report" && "Read-only pentru client"}
            </div>
          </button>
        ))}
      </div>

      <Field label="Email destinatar (opțional)">
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="client@firma.ro"
          style={fieldInput}
        />
      </Field>

      <Field label="Nume destinatar (opțional)">
        <input
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Ana Popescu"
          style={fieldInput}
        />
      </Field>

      {targetType === "approval" && (
        <Field
          label="Sistem AI"
          help={
            aiSystems.length === 0
              ? "Niciun sistem AI înregistrat în workspace-ul curent. Comută pe clientul respectiv din /dashboard/portofoliu."
              : undefined
          }
          required
        >
          <select
            required
            value={targetId}
            onChange={(e) => {
              const id = e.target.value
              setTargetId(id)
              const system = aiSystems.find((s) => s.id === id)
              if (system) setTargetLabel(system.name)
            }}
            style={fieldInput}
          >
            <option value="">— alege sistemul AI —</option>
            {aiSystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Etichetă (vizibilă pentru client)">
        <input
          value={targetLabel}
          onChange={(e) => setTargetLabel(e.target.value)}
          placeholder={
            targetType === "intake"
              ? "Ex: Onboarding inițial — Firma SRL"
              : targetType === "approval"
              ? "Numele sistemului AI"
              : "Raport AI Act Q1 2026"
          }
          style={fieldInput}
        />
      </Field>

      <Field label="Mesaj pentru client (opțional)">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Mesaj scurt vizibil în email și pe pagina link-ului…"
          style={{ ...fieldInput, minHeight: 60, resize: "vertical" }}
          maxLength={1000}
        />
      </Field>

      <Field label="Expiră în (zile)">
        <input
          type="number"
          min={1}
          max={30}
          value={expiresInDays}
          onChange={(e) => setExpiresInDays(Number(e.target.value) || 7)}
          style={{ ...fieldInput, maxWidth: 120 }}
        />
      </Field>

      {clients.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--ink-dim)", margin: 0 }}>
          Sfat: linkul este atașat workspace-ului curent. Pentru un client din
          portofoliu, comută mai întâi pe clientul respectiv din{" "}
          <a
            href="/dashboard/portofoliu"
            style={{ color: "var(--cobalt-600)" }}
          >
            /dashboard/portofoliu
          </a>
          .
        </p>
      )}

      {error && (
        <div
          style={{
            fontSize: 13,
            color: "var(--red-400)",
            background: "var(--red-soft)",
            padding: "10px 12px",
            borderRadius: 6,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "9px 18px",
            borderRadius: 6,
            border: "none",
            background: "var(--cobalt-600)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 500,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Se generează…" : "Generează & trimite link"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "9px 18px",
            borderRadius: 6,
            border: "1px solid var(--border-strong)",
            background: "transparent",
            color: "var(--ink-muted)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Anulează
        </button>
      </div>
    </form>
  )
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-hover)",
  border: "1px solid var(--border-strong)",
  borderRadius: 6,
  padding: "9px 13px",
  color: "var(--ink)",
  fontSize: 13,
  outline: "none",
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string
  required?: boolean
  help?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 12,
          color: "var(--ink-muted)",
          display: "block",
          marginBottom: 5,
        }}
      >
        {label}
        {required && <span style={{ color: "var(--red-400)" }}> *</span>}
      </label>
      {children}
      {help && (
        <p style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 4 }}>
          {help}
        </p>
      )}
    </div>
  )
}
