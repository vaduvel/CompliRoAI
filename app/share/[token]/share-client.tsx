"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react"

type TargetType = "intake" | "approval" | "report"

type Context = {
  targetType: TargetType
  targetId: string | null
  targetLabel: string | null
  orgName: string | null
  cabinetName: string | null
  expiresAtISO: string
  createdAtISO: string
  status: "active" | "used" | "revoked" | "expired"
  metadata: Record<string, unknown>
  target: {
    name?: string
    purpose?: string
    vendor?: string
    riskLevel?: string
    recommendedActions?: string[]
  } | null
}

const containerStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f6f7fb",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "32px 20px",
  fontFamily:
    "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  color: "#0f172a",
}

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  background: "#ffffff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  padding: 32,
  marginTop: 24,
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 500,
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.02em",
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  fontSize: 14,
  outline: "none",
  color: "#0f172a",
  background: "#fff",
  boxSizing: "border-box",
}

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "11px 20px",
  borderRadius: 6,
  border: "none",
  background: "#3b5bdb",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ro-RO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return iso
  }
}

export function ShareTokenClient({ token }: { token: string }) {
  const [ctx, setCtx] = useState<Context | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{ message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}`, {
        cache: "no-store",
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Link invalid sau expirat.")
        return
      }
      const data = (await res.json()) as Context & { ok: boolean }
      setCtx(data)
    } catch {
      setError("Eroare de rețea. Verifică conexiunea și reîncearcă.")
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div style={containerStyle}>
        <Header />
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 12, color: "#64748b", fontSize: 14 }}>
            Verificăm linkul…
          </p>
        </div>
      </div>
    )
  }

  if (error || !ctx) {
    return (
      <div style={containerStyle}>
        <Header />
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 14,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 8,
              color: "#b91c1c",
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ display: "block", marginBottom: 2 }}>
                Linkul nu mai este valabil
              </strong>
              <span style={{ fontSize: 13 }}>
                {error ?? "Linkul a expirat, a fost folosit sau revocat."}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={containerStyle}>
        <Header />
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 14,
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 8,
              color: "#047857",
              marginBottom: 16,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ display: "block", marginBottom: 2 }}>
                Mulțumim!
              </strong>
              <span style={{ fontSize: 13 }}>{submitted.message}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
            Poți închide această pagină. Vom anunța cabinetul automat.
          </p>
        </div>
      </div>
    )
  }

  if (ctx.status === "used") {
    return (
      <div style={containerStyle}>
        <Header />
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Acest link a fost deja folosit.
          </p>
        </div>
      </div>
    )
  }
  if (ctx.status === "revoked" || ctx.status === "expired") {
    return (
      <div style={containerStyle}>
        <Header />
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>
            Acest link nu mai este activ. Cere cabinetului unul nou.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <Header />
      <div style={cardStyle}>
        <ContextHeader ctx={ctx} />
        {ctx.targetType === "intake" && (
          <IntakeForm
            token={token}
            onSubmitted={(submission) =>
              setSubmitted({
                message: `Datele au fost salvate (referință ${submission.id}).`,
              })
            }
          />
        )}
        {ctx.targetType === "approval" && (
          <ApprovalForm
            token={token}
            target={ctx.target}
            targetLabel={ctx.targetLabel}
            onSubmitted={(decision) =>
              setSubmitted({
                message:
                  decision === "approved"
                    ? "Decizia ta de aprobare a fost înregistrată."
                    : "Decizia de respingere a fost înregistrată.",
              })
            }
          />
        )}
        {ctx.targetType === "report" && <ReportPlaceholder ctx={ctx} />}
      </div>
    </div>
  )
}

function Header() {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        maxWidth: 640,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "#3b5bdb",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        Ro
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>CompliRoAI</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
          Conformitate AI Act + GDPR pentru România
        </div>
      </div>
    </header>
  )
}

function ContextHeader({ ctx }: { ctx: Context }) {
  const cabinet = ctx.cabinetName ?? "Cabinetul tău de consultanță"
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ ...labelStyle, marginBottom: 6 }}>De la</p>
      <h1 style={{ fontSize: 20, margin: 0, color: "#0f172a", fontWeight: 600 }}>
        {cabinet}
      </h1>
      {ctx.targetLabel && (
        <p style={{ fontSize: 13, color: "#475569", marginTop: 8 }}>
          {ctx.targetLabel}
        </p>
      )}
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
        Linkul expiră la {formatDate(ctx.expiresAtISO)}.
      </p>
    </div>
  )
}

function IntakeForm({
  token,
  onSubmitted,
}: {
  token: string
  onSubmitted: (submission: { id: string }) => void
}) {
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    companyName: "",
    companyCui: "",
    aiSystemsInUse: "",
    observations: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(token)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? "Trimitere eșuată.")
        return
      }
      onSubmitted(data.submission ?? { id: "—" })
    } catch {
      setErr("Eroare de rețea. Încearcă din nou.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
        Completează datele firmei
      </h2>
      <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
        Aceste informații ne ajută să generăm raportul de conformitate AI Act +
        GDPR pentru firma ta.
      </p>

      <Field label="Nume contact" required>
        <input
          required
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          placeholder="Ex: Ana Popescu"
          style={inputStyle}
        />
      </Field>

      <Field label="Email contact" required>
        <input
          required
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          placeholder="ana@firma.ro"
          style={inputStyle}
        />
      </Field>

      <Field label="Nume firmă" required>
        <input
          required
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          placeholder="Firma SRL"
          style={inputStyle}
        />
      </Field>

      <Field label="CUI (opțional)">
        <input
          value={form.companyCui}
          onChange={(e) => setForm({ ...form, companyCui: e.target.value })}
          placeholder="RO12345678"
          style={inputStyle}
        />
      </Field>

      <Field label="Sisteme AI folosite (lista informală)">
        <textarea
          value={form.aiSystemsInUse}
          onChange={(e) =>
            setForm({ ...form, aiSystemsInUse: e.target.value })
          }
          placeholder="Ex: ChatGPT pentru drafting, Copilot pentru cod, scoring automat în CRM…"
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
        />
      </Field>

      <Field label="Observații pentru cabinet">
        <textarea
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
          placeholder="Detalii pe care vrei să le știe cabinetul…"
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
        />
      </Field>

      {err && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? "Se trimite…" : "Trimite datele"}
      </button>
    </form>
  )
}

function ApprovalForm({
  token,
  target,
  targetLabel,
  onSubmitted,
}: {
  token: string
  target: Context["target"]
  targetLabel: string | null
  onSubmitted: (decision: "approved" | "rejected") => void
}) {
  const [approverName, setApproverName] = useState("")
  const [approverEmail, setApproverEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submitDecision(decision: "approved" | "rejected") {
    setErr(null)
    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(token)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision, approverName, approverEmail }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        setErr(data.error ?? "Trimitere eșuată.")
        return
      }
      onSubmitted(decision)
    } catch {
      setErr("Eroare de rețea. Încearcă din nou.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
        Aprobă sistemul AI
      </h2>
      {target ? (
        <div
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            padding: 14,
            background: "#f8fafc",
          }}
        >
          <p style={{ ...labelStyle, marginBottom: 2 }}>Sistem AI</p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "#0f172a",
            }}
          >
            {target.name ?? targetLabel ?? "—"}
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 10,
              fontSize: 12,
              color: "#475569",
            }}
          >
            {target.purpose && (
              <Badge>Scop: {target.purpose.replace(/-/g, " ")}</Badge>
            )}
            {target.vendor && <Badge>Furnizor: {target.vendor}</Badge>}
            {target.riskLevel && <Badge>Risc: {target.riskLevel}</Badge>}
          </div>
          {target.recommendedActions &&
            target.recommendedActions.length > 0 && (
              <ul
                style={{
                  fontSize: 13,
                  color: "#475569",
                  marginTop: 12,
                  paddingLeft: 18,
                  lineHeight: 1.5,
                }}
              >
                {target.recommendedActions.slice(0, 5).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            )}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
          {targetLabel ?? "Sistem AI selectat de cabinet."}
        </p>
      )}

      <Field label="Numele tău">
        <input
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          placeholder="Ex: Ana Popescu"
          style={inputStyle}
        />
      </Field>
      <Field label="Email-ul tău">
        <input
          type="email"
          value={approverEmail}
          onChange={(e) => setApproverEmail(e.target.value)}
          placeholder="ana@firma.ro"
          style={inputStyle}
        />
      </Field>

      {err && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 6,
          }}
        >
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          disabled={submitting}
          onClick={() => submitDecision("approved")}
          style={{ ...primaryBtn, background: "#10b981" }}
        >
          {submitting ? "Se trimite…" : "Aprobă sistemul AI"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => submitDecision("rejected")}
          style={{
            ...primaryBtn,
            background: "#ffffff",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          }}
        >
          Respinge
        </button>
      </div>
    </div>
  )
}

function ReportPlaceholder({ ctx }: { ctx: Context }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <FileText size={18} style={{ color: "#3b5bdb" }} />
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
          {ctx.targetLabel ?? "Raport de conformitate"}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0 }}>
        Acesta este un link de tip raport. Cabinetul a partajat conținutul cu
        tine read-only. Conținutul detaliat va fi vizibil aici în versiunile
        următoare ale CompliRoAI.
      </p>
      <p
        style={{
          marginTop: 12,
          padding: "8px 10px",
          background: "#f1f5f9",
          color: "#64748b",
          fontSize: 11,
          borderRadius: 6,
        }}
      >
        Shared via CompliRoAI
      </p>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
        {required && <span style={{ color: "#dc2626" }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 4,
        background: "#e2e8f0",
        color: "#475569",
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}
