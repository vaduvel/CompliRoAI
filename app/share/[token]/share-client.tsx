"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, FileText, Loader2 } from "lucide-react"

type TargetType = "intake" | "approval" | "report"

type Branding = {
  isCustom: boolean
  brandName: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  signerName: string | null
  signerTitle: string | null
  contactEmail: string | null
  website: string | null
}

const DEFAULT_BRANDING: Branding = {
  isCustom: false,
  brandName: "CompliRoAI",
  logoUrl: null,
  primaryColor: "#3b5bdb",
  secondaryColor: "#0ea5e9",
  signerName: null,
  signerTitle: null,
  contactEmail: null,
  website: null,
}

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
  branding?: Branding
  target: {
    name?: string
    purpose?: string
    vendor?: string
    riskLevel?: string
    recommendedActions?: string[]
  } | null
}

const containerStyle: React.CSSProperties = {
  minHeight: "100dvh",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "32px 20px",
  fontFamily: "var(--font-body-v3)",
  color: "var(--ink)",
}

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 640,
  background: "var(--surface-0)",
  borderRadius: "var(--r-xl)",
  border: "1px solid var(--border)",
  padding: 32,
  marginTop: 24,
  boxShadow: "var(--shadow-md)",
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ink-dim)",
  fontWeight: 650,
  marginBottom: 4,
  display: "block",
  letterSpacing: "0.02em",
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

  const branding = ctx?.branding ?? DEFAULT_BRANDING

  if (loading) {
    return (
      <div style={containerStyle}>
        <Header branding={DEFAULT_BRANDING} />
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ marginTop: 12, color: "var(--ink-muted)", fontSize: 14 }}>
            Verificăm linkul…
          </p>
        </div>
      </div>
    )
  }

  if (error || !ctx) {
    return (
      <div style={containerStyle}>
        <Header branding={DEFAULT_BRANDING} />
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 14,
              background: "var(--red-soft)",
              border: "1px solid var(--red-border)",
              borderRadius: "var(--r-lg)",
              color: "var(--red-700)",
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
        <Header branding={branding} />
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: 14,
              background: "var(--emerald-soft)",
              border: "1px solid var(--emerald-border)",
              borderRadius: "var(--r-lg)",
              color: "var(--emerald-700)",
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
          <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
            Poți închide această pagină. Vom anunța cabinetul automat.
          </p>
        </div>
        <Footer branding={branding} />
      </div>
    )
  }

  if (ctx.status === "used") {
    return (
      <div style={containerStyle}>
        <Header branding={branding} />
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: 14 }}>
            Acest link a fost deja folosit.
          </p>
        </div>
        <Footer branding={branding} />
      </div>
    )
  }
  if (ctx.status === "revoked" || ctx.status === "expired") {
    return (
      <div style={containerStyle}>
        <Header branding={branding} />
        <div style={cardStyle}>
          <p style={{ margin: 0, color: "var(--ink-muted)", fontSize: 14 }}>
            Acest link nu mai este activ. Cere cabinetului unul nou.
          </p>
        </div>
        <Footer branding={branding} />
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <Header branding={branding} />
      <div style={cardStyle}>
        <ContextHeader ctx={ctx} branding={branding} />
        {ctx.targetType === "intake" && (
          <IntakeForm
            token={token}
            branding={branding}
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
            branding={branding}
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
        {ctx.targetType === "report" && <ReportPlaceholder ctx={ctx} branding={branding} />}
      </div>
      <Footer branding={branding} />
    </div>
  )
}

function Header({ branding }: { branding: Branding }) {
  const tagline = branding.isCustom
    ? "Consultanță conformitate AI"
    : "Conformitate AI Act + GDPR pentru România"
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
      {branding.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt={branding.brandName}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            objectFit: "contain",
            background: "var(--surface-0)",
            padding: 2,
            border: "1px solid var(--border)",
          }}
        />
      ) : (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: branding.primaryColor,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          {branding.brandName.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <div style={{ fontSize: 15, fontFamily: "var(--font-display-v3)", fontWeight: 720 }}>{branding.brandName}</div>
        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 1 }}>{tagline}</div>
      </div>
    </header>
  )
}

function Footer({ branding }: { branding: Branding }) {
  return (
    <footer
      style={{
        width: "100%",
        maxWidth: 640,
        marginTop: 18,
        padding: "12px 4px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 11, color: "var(--ink-dim)" }}>
        Trimis de <strong style={{ color: "var(--ink)" }}>{branding.brandName}</strong>
        {branding.contactEmail ? (
          <>
            {" · "}
            <a
              href={`mailto:${branding.contactEmail}`}
              style={{ color: branding.primaryColor, textDecoration: "none" }}
            >
              {branding.contactEmail}
            </a>
          </>
        ) : null}
        {branding.website ? (
          <>
            {" · "}
            <a
              href={branding.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: branding.primaryColor, textDecoration: "none" }}
            >
              {branding.website.replace(/^https?:\/\//, "")}
            </a>
          </>
        ) : null}
      </div>
      {branding.isCustom && (
        <div style={{ fontSize: 10, color: "var(--ink-subtle)" }}>Powered by CompliRoAI</div>
      )}
    </footer>
  )
}

function ContextHeader({ ctx, branding }: { ctx: Context; branding: Branding }) {
  const cabinet =
    (branding.isCustom ? branding.brandName : ctx.cabinetName) ??
    "Cabinetul tău de consultanță"
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ ...labelStyle, marginBottom: 6 }}>De la</p>
      <h1 style={{ fontSize: 22, margin: 0, color: "var(--ink-strong)", fontFamily: "var(--font-display-v3)", fontWeight: 750, letterSpacing: "-0.02em" }}>
        {cabinet}
      </h1>
      {ctx.targetLabel && (
        <p style={{ fontSize: 13, color: "var(--ink-muted)", marginTop: 8 }}>
          {ctx.targetLabel}
        </p>
      )}
      <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 8 }}>
        Linkul expiră la {formatDate(ctx.expiresAtISO)}.
      </p>
    </div>
  )
}

function IntakeForm({
  token,
  branding,
  onSubmitted,
}: {
  token: string
  branding: Branding
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
      <h2 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-display-v3)", fontWeight: 720 }}>
        Completează datele firmei
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
        Aceste informații ne ajută să generăm raportul de conformitate AI Act +
        GDPR pentru firma ta.
      </p>

      <Field label="Nume contact" required>
        <input
          required
          value={form.contactName}
          onChange={(e) => setForm({ ...form, contactName: e.target.value })}
          placeholder="Ex: Ana Popescu"
          className="cr-input"
        />
      </Field>

      <Field label="Email contact" required>
        <input
          required
          type="email"
          value={form.contactEmail}
          onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
          placeholder="ana@firma.ro"
          className="cr-input"
        />
      </Field>

      <Field label="Nume firmă" required>
        <input
          required
          value={form.companyName}
          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
          placeholder="Firma SRL"
          className="cr-input"
        />
      </Field>

      <Field label="CUI (opțional)">
        <input
          value={form.companyCui}
          onChange={(e) => setForm({ ...form, companyCui: e.target.value })}
          placeholder="RO12345678"
          className="cr-input"
        />
      </Field>

      <Field label="Sisteme AI folosite (lista informală)">
        <textarea
          value={form.aiSystemsInUse}
          onChange={(e) =>
            setForm({ ...form, aiSystemsInUse: e.target.value })
          }
          placeholder="Ex: ChatGPT pentru drafting, Copilot pentru cod, scoring automat în CRM…"
          className="cr-input cr-textarea"
          style={{ minHeight: 80 }}
        />
      </Field>

      <Field label="Observații pentru cabinet">
        <textarea
          value={form.observations}
          onChange={(e) => setForm({ ...form, observations: e.target.value })}
          placeholder="Detalii pe care vrei să le știe cabinetul…"
          className="cr-input cr-textarea"
          style={{ minHeight: 60 }}
        />
      </Field>

      {err && (
        <div
          style={{
            background: "var(--red-soft)",
            border: "1px solid var(--red-border)",
            color: "var(--red-700)",
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
        className="cr-btn cr-btn--primary"
        style={{ background: branding.primaryColor, opacity: submitting ? 0.7 : 1 }}
      >
        {submitting ? "Se trimite…" : "Trimite datele"}
      </button>
    </form>
  )
}

function ApprovalForm({
  token,
  branding,
  target,
  targetLabel,
  onSubmitted,
}: {
  token: string
  branding: Branding
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
      <h2 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-display-v3)", fontWeight: 720 }}>
        Aprobă sistemul AI
      </h2>
      {target ? (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--r-lg)",
            padding: 14,
            background: "var(--surface-1)",
          }}
        >
          <p style={{ ...labelStyle, marginBottom: 2 }}>Sistem AI</p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink-strong)",
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
              color: "var(--ink-muted)",
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
                  color: "var(--ink-muted)",
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
        <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0 }}>
          {targetLabel ?? "Sistem AI selectat de cabinet."}
        </p>
      )}

      <Field label="Numele tău">
        <input
          value={approverName}
          onChange={(e) => setApproverName(e.target.value)}
          placeholder="Ex: Ana Popescu"
          className="cr-input"
        />
      </Field>
      <Field label="Email-ul tău">
        <input
          type="email"
          value={approverEmail}
          onChange={(e) => setApproverEmail(e.target.value)}
          placeholder="ana@firma.ro"
          className="cr-input"
        />
      </Field>

      {err && (
        <div
          style={{
            background: "var(--red-soft)",
            border: "1px solid var(--red-border)",
            color: "var(--red-700)",
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
          className="cr-btn cr-btn--success"
        >
          {submitting ? "Se trimite…" : "Aprobă sistemul AI"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => submitDecision("rejected")}
          className="cr-btn cr-btn--danger"
        >
          Respinge
        </button>
      </div>
    </div>
  )
}

function ReportPlaceholder({ ctx, branding }: { ctx: Context; branding: Branding }) {
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
        <FileText size={18} style={{ color: branding.primaryColor }} />
      <h2 style={{ margin: 0, fontSize: 18, fontFamily: "var(--font-display-v3)", fontWeight: 720 }}>
          {ctx.targetLabel ?? "Raport de conformitate"}
        </h2>
      </div>
      <p style={{ fontSize: 13, color: "var(--ink-muted)", lineHeight: 1.6, margin: 0 }}>
        Acesta este un link de tip raport. Cabinetul a partajat conținutul cu
        tine read-only. Conținutul detaliat va fi vizibil aici în versiunile
        următoare.
      </p>
      <p
        style={{
          marginTop: 12,
          padding: "8px 10px",
          background: "var(--surface-2)",
          color: "var(--ink-dim)",
          fontSize: 11,
          borderRadius: 6,
        }}
      >
        Shared via {branding.brandName}
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
        {required && <span style={{ color: "var(--red-600)" }}> *</span>}
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
        background: "var(--surface-2)",
        color: "var(--ink-muted)",
        fontSize: 11,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}
