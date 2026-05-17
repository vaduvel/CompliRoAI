"use client"
import { useCallback, useEffect, useState } from "react"
import { Send, Link2, Copy, Check, UserPlus } from "lucide-react"

type ClientRow = {
  orgId: string
  orgName: string
}

type IntakeResponse = {
  ok: boolean
  shareUrl?: string
  expiresAtISO?: string
  emailSent?: boolean
  error?: string
}

/**
 * Sprint 015 — Client Intake page (cabinet only).
 *
 * Flow: cabinet selects a client from portfolio, fills a recipient email +
 * optional note, generates a magic link (POST /api/share/create with
 * targetType: "intake"), and optionally emails it directly.
 *
 * Powered by Sprint 002 share-token infrastructure.
 */
export function ClientIntakeForm() {
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    clientOrgId: "",
    recipientEmail: "",
    recipientName: "",
    note: "",
    expiresInDays: 14,
    sendEmail: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<IntakeResponse | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setResult(null)

    if (!form.clientOrgId) {
      setError("Selectează un client din portofoliu.")
      return
    }
    if (form.sendEmail && !form.recipientEmail.trim()) {
      setError("Adresa de email este obligatorie când vrei să trimiți link-ul automat.")
      return
    }

    setSubmitting(true)
    try {
      const targetLabel = clients.find((c) => c.orgId === form.clientOrgId)?.orgName
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "intake",
          targetLabel,
          clientOrgId: form.clientOrgId,
          recipientEmail: form.recipientEmail.trim() || undefined,
          recipientName: form.recipientName.trim() || undefined,
          note: form.note.trim() || undefined,
          expiresInDays: form.expiresInDays,
          sendEmail: form.sendEmail,
        }),
      })
      const data: IntakeResponse = await res.json().catch(() => ({ ok: false }))
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Eroare la generare link.")
      } else {
        setResult(data)
      }
    } catch {
      setError("Eroare de rețea. Încearcă din nou.")
    } finally {
      setSubmitting(false)
    }
  }

  async function copyLink() {
    if (!result?.shareUrl) return
    try {
      await navigator.clipboard.writeText(result.shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore — older browsers / iframe restrictions.
    }
  }

  return (
    <div style={{ padding: "32px 32px", maxWidth: "780px", margin: "0 auto" }}>
      <header style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            background: "var(--cobalt-soft)",
            color: "var(--cobalt-400)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <UserPlus size={20} />
        </div>
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-display-v3)",
              fontSize: "22px",
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            Client Intake
          </h1>
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "2px" }}>
            Trimite clientului un link securizat (HMAC, expirare configurabilă) pentru
            colectare date AI + GDPR. Nu îi cere parolă.
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div>
          <label style={labelStyle}>Client</label>
          <select
            value={form.clientOrgId}
            onChange={(e) => setForm({ ...form, clientOrgId: e.target.value })}
            style={inputBase}
            disabled={loading || clients.length === 0}
          >
            <option value="">
              {loading
                ? "Se încarcă clienții…"
                : clients.length === 0
                  ? "Nu ai niciun client în portofoliu"
                  : "Selectează client…"}
            </option>
            {clients.map((c) => (
              <option key={c.orgId} value={c.orgId}>
                {c.orgName}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Email destinatar</label>
            <input
              type="email"
              value={form.recipientEmail}
              onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
              placeholder="contact@clientulmeu.ro"
              style={inputBase}
            />
          </div>
          <div>
            <label style={labelStyle}>Nume (opțional)</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              placeholder="Maria Popescu"
              style={inputBase}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Notă personală (opțional)</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Bună Maria, te rog completează inventarul AI până vineri."
            rows={3}
            style={{ ...inputBase, resize: "vertical", minHeight: "80px" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Expirare</label>
            <select
              value={form.expiresInDays}
              onChange={(e) => setForm({ ...form, expiresInDays: Number(e.target.value) })}
              style={inputBase}
            >
              <option value={3}>3 zile</option>
              <option value={7}>7 zile</option>
              <option value={14}>14 zile</option>
              <option value={30}>30 zile</option>
            </select>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 0",
              fontSize: "13px",
              color: "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.sendEmail}
              onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })}
            />
            Trimite automat pe email
          </label>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "10px 12px",
              background: "var(--red-soft)",
              border: "1px solid var(--red-500)",
              borderRadius: "6px",
              color: "var(--red-400)",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || loading || clients.length === 0}
          style={{
            padding: "11px 20px",
            borderRadius: "8px",
            border: "none",
            background: "var(--cobalt-600)",
            color: "#fff",
            fontSize: "13.5px",
            fontWeight: 500,
            cursor: submitting ? "wait" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            justifyContent: "center",
            opacity: submitting || clients.length === 0 ? 0.7 : 1,
          }}
        >
          <Send size={14} />
          {submitting ? "Se generează…" : "Generează link intake"}
        </button>
      </form>

      {result?.shareUrl && (
        <div
          style={{
            marginTop: "20px",
            background: "var(--emerald-soft)",
            border: "1px solid var(--emerald-500)",
            borderRadius: "10px",
            padding: "16px 18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <Link2 size={16} color="var(--emerald-400)" />
            <strong style={{ color: "var(--ink)" }}>Link intake generat</strong>
            {result.emailSent && (
              <span style={{ fontSize: "11.5px", color: "var(--emerald-400)" }}>
                Trimis pe email
              </span>
            )}
          </div>
          <div
            style={{
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12.5px",
              color: "var(--ink-muted)",
              fontFamily: "var(--font-mono, monospace)",
              wordBreak: "break-all",
            }}
          >
            <span style={{ flex: 1 }}>{result.shareUrl}</span>
            <button
              type="button"
              onClick={copyLink}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--ink-muted)",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copiat" : "Copy"}
            </button>
          </div>
          {result.expiresAtISO && (
            <div style={{ fontSize: "11.5px", color: "var(--ink-dim)", marginTop: "8px" }}>
              Expiră la {new Date(result.expiresAtISO).toLocaleString("ro-RO")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  color: "var(--ink-muted)",
  marginBottom: "6px",
  fontWeight: 500,
}

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-hover)",
  border: "1px solid var(--border-strong)",
  borderRadius: "8px",
  padding: "10px 12px",
  color: "var(--ink)",
  fontSize: "13.5px",
  outline: "none",
}
