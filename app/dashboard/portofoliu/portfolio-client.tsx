"use client"
import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, ChevronRight, AlertCircle, CheckCircle2, Building2, Send } from "lucide-react"

type ClientRow = {
  orgId: string
  orgName: string
  membershipId: string
  createdAtISO: string
  cui?: string
  aiSystemsCount: number
  literacyTrainingsCount: number
  onboardingCompleted: boolean
}

export function PortfolioClient() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({ orgName: "", cui: "" })
  const [switching, setSwitching] = useState<string | null>(null)
  const [intakeBusy, setIntakeBusy] = useState<string | null>(null)
  const [intakeLink, setIntakeLink] = useState<{ orgName: string; url: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/portfolio/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients ?? [])
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

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
      } else {
        setSwitching(null)
      }
    } catch {
      setSwitching(null)
    }
  }

  async function handleSendIntake(client: ClientRow, e: React.MouseEvent) {
    e.stopPropagation()
    const email = window.prompt(`Email-ul clientului ${client.orgName} pentru a primi link-ul de intake:`)
    if (!email) return
    setIntakeBusy(client.orgId)
    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "intake",
          clientOrgId: client.orgId,
          recipientEmail: email,
          targetLabel: `Onboarding inițial — ${client.orgName}`,
          expiresInDays: 14,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "Generare link eșuată.")
        return
      }
      setIntakeLink({ orgName: client.orgName, url: data.url })
    } catch {
      alert("Eroare de rețea. Încearcă din nou.")
    } finally {
      setIntakeBusy(null)
    }
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setFormLoading(true)
    try {
      const res = await fetch("/api/portfolio/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          cui: form.cui.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? "Eroare la adăugare.")
        return
      }
      setShowForm(false)
      setForm({ orgName: "", cui: "" })
      await load()
    } catch {
      setFormError("Eroare de rețea. Încearcă din nou.")
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Portofoliu · triaj</div>
          <h1 className="cr-title">
            Portofoliu clienți
          </h1>
          <p className="cr-subtitle">
            Gestionezi conformitatea pentru toți clienții cabinetului tău dintr-un singur loc.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="cr-btn cr-btn--primary"
          >
            <Plus size={15} /> Adaugă client
          </button>
        )}
      </div>

      {/* Add client form */}
      {showForm && (
        <form
          onSubmit={handleAddClient}
          className="cr-card cr-form-card"
        >
          <div className="cr-form-title">Client nou</div>

          <div>
            <label className="cr-field-label">
              Nume firmă <span style={{ color: "var(--red-400)" }}>*</span>
            </label>
            <input
              required
              minLength={2}
              value={form.orgName}
              onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
              placeholder="Ex: Firma Client SRL"
              className="cr-input"
            />
          </div>

          <div>
            <label className="cr-field-label">
              CUI / Cod fiscal (opțional)
            </label>
            <input
              value={form.cui}
              onChange={(e) => setForm((f) => ({ ...f, cui: e.target.value }))}
              placeholder="RO12345678 sau 12345678"
              className="cr-input"
            />
          </div>

          {formError && (
            <div className="cr-alert cr-alert--danger">
              {formError}
            </div>
          )}

          <div className="cr-actions" style={{ justifyContent: "flex-start" }}>
            <button
              type="submit"
              disabled={formLoading}
              className="cr-btn cr-btn--primary"
            >
              {formLoading ? "Se adaugă..." : "Adaugă client"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setFormError("")
                setForm({ orgName: "", cui: "" })
              }}
              className="cr-btn"
            >
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Intake link success banner */}
      {intakeLink && (
        <div className="cr-alert cr-alert--info">
          <Send size={14} style={{ color: "var(--cobalt-400)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
              Link de intake trimis pentru {intakeLink.orgName}
            </div>
            <code style={{
              fontSize: 11,
              color: "var(--ink-muted)",
              display: "block",
              overflowWrap: "anywhere",
              marginTop: 2,
            }}>
              {intakeLink.url}
            </code>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(intakeLink.url).catch(() => {})}
            className="cr-btn cr-btn--sm"
          >
            Copy
          </button>
          <button
            onClick={() => setIntakeLink(null)}
            className="cr-icon-button"
            aria-label="Închide mesaj intake"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && clients.length > 0 && (
        <div className="cr-stat-strip cr-stat-strip--three">
          {[
            { label: "Total clienți", value: clients.length },
            {
              label: "Onboarding complet",
              value: clients.filter((c) => c.onboardingCompleted).length,
            },
            {
              label: "Sisteme AI înregistrate",
              value: clients.reduce((sum, c) => sum + c.aiSystemsCount, 0),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="cr-stat"
            >
              <div className="cr-stat__value">
                {stat.value}
              </div>
              <div className="cr-stat__label" style={{ marginTop: 8 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clients list */}
      <div>
        <div className="cr-section-label" style={{ marginBottom: 10 }}>
          {loading ? "Se încarcă..." : `${clients.length} client${clients.length !== 1 ? "i" : ""}`}
        </div>

        {!loading && clients.length === 0 ? (
          <div className="cr-empty">
            <Building2 size={28} style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: "14px", color: "var(--ink-muted)", marginBottom: "4px" }}>
              Niciun client adăugat încă
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
              Adaugă primul client cu butonul de mai sus.
            </div>
          </div>
        ) : (
          <div className="cr-finding-list">
            {clients.map((c) => {
              const isSwitching = switching === c.orgId
              return (
                <div
                  key={c.orgId}
                  onClick={() => !switching && handleSwitch(c.orgId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !switching) {
                      e.preventDefault()
                      handleSwitch(c.orgId)
                    }
                  }}
                  className={isSwitching ? "cr-client-card cr-client-card--busy" : "cr-client-card"}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
                      {c.orgName}
                      {c.cui && (
                        <span style={{ color: "var(--ink-dim)", fontWeight: 400, marginLeft: "8px", fontSize: "12px" }}>
                          · {c.cui}
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: "12px",
                      color: "var(--ink-dim)",
                      marginTop: "3px",
                      display: "flex",
                      gap: "12px",
                      flexWrap: "wrap",
                    }}>
                      <span>{c.aiSystemsCount} sistem{c.aiSystemsCount !== 1 ? "e" : ""} AI</span>
                      <span>·</span>
                      <span>{c.literacyTrainingsCount} training-uri</span>
                    </div>
                  </div>

                  {c.onboardingCompleted ? (
                    <span className="cr-badge cr-badge--ok">
                      <CheckCircle2 size={11} /> Onboarding OK
                    </span>
                  ) : (
                    <span className="cr-badge cr-badge--high">
                      <AlertCircle size={11} /> Onboarding incomplet
                    </span>
                  )}

                  <button
                    onClick={(e) => handleSendIntake(c, e)}
                    disabled={intakeBusy === c.orgId}
                    title="Trimite intake la client"
                    className="cr-btn cr-btn--sm"
                  >
                    <Send size={11} />
                    {intakeBusy === c.orgId ? "Se trimite…" : "Trimite intake"}
                  </button>

                  <ChevronRight size={15} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
