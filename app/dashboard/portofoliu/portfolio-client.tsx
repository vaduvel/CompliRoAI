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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-hover)",
    border: "1px solid var(--border-strong)",
    borderRadius: "6px",
    padding: "9px 13px",
    color: "var(--ink)",
    fontSize: "13px",
    outline: "none",
  }

  return (
    <div style={{ padding: "32px", maxWidth: "1000px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}>
            Portofoliu clienți
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
            Gestionezi conformitatea pentru toți clienții cabinetului tău dintr-un singur loc.
          </p>
        </div>

        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: "var(--cobalt-600)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus size={15} /> Adaugă client
          </button>
        )}
      </div>

      {/* Add client form */}
      {showForm && (
        <form
          onSubmit={handleAddClient}
          style={{
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>Client nou</div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "5px" }}>
              Nume firmă <span style={{ color: "var(--red-400)" }}>*</span>
            </label>
            <input
              required
              minLength={2}
              value={form.orgName}
              onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
              placeholder="Ex: Firma Client SRL"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "5px" }}>
              CUI / Cod fiscal (opțional)
            </label>
            <input
              value={form.cui}
              onChange={(e) => setForm((f) => ({ ...f, cui: e.target.value }))}
              placeholder="RO12345678 sau 12345678"
              style={inputStyle}
            />
          </div>

          {formError && (
            <div style={{
              fontSize: "13px",
              color: "var(--red-400)",
              background: "var(--red-soft)",
              padding: "10px 12px",
              borderRadius: "6px",
            }}>
              {formError}
            </div>
          )}

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="submit"
              disabled={formLoading}
              style={{
                padding: "9px 18px",
                borderRadius: "6px",
                border: "none",
                background: "var(--cobalt-600)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: formLoading ? "not-allowed" : "pointer",
                opacity: formLoading ? 0.7 : 1,
              }}
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
              style={{
                padding: "9px 18px",
                borderRadius: "6px",
                border: "1px solid var(--border-strong)",
                background: "transparent",
                color: "var(--ink-muted)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Anulează
            </button>
          </div>
        </form>
      )}

      {/* Intake link success banner */}
      {intakeLink && (
        <div style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          padding: "10px 14px",
          background: "var(--cobalt-soft)",
          border: "1px solid rgba(96,165,250,0.25)",
          borderRadius: 8,
        }}>
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
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--ink-muted)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Copy
          </button>
          <button
            onClick={() => setIntakeLink(null)}
            style={{
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "var(--ink-dim)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Stats */}
      {!loading && clients.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
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
              style={{
                padding: "16px",
                background: "var(--bg-raised)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{
                fontSize: "22px",
                fontWeight: 600,
                color: "var(--ink)",
                fontFamily: "var(--font-display-v3)",
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "4px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clients list */}
      <div>
        <div style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--ink-dim)",
          marginBottom: "8px",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}>
          {loading ? "Se încarcă..." : `${clients.length} client${clients.length !== 1 ? "i" : ""}`}
        </div>

        {!loading && clients.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: "var(--bg-raised)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "10px",
            }}
          >
            <Building2 size={28} style={{ color: "var(--ink-dim)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: "14px", color: "var(--ink-muted)", marginBottom: "4px" }}>
              Niciun client adăugat încă
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
              Adaugă primul client cu butonul de mai sus.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
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
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "14px 16px",
                    background: isSwitching ? "var(--cobalt-soft)" : "var(--bg-raised)",
                    borderRadius: "8px",
                    border: "none",
                    cursor: switching ? "wait" : "pointer",
                    width: "100%",
                    textAlign: "left",
                    color: "var(--ink)",
                    transition: "background 120ms",
                  }}
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
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      color: "var(--emerald-400)",
                      background: "var(--emerald-soft)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}>
                      <CheckCircle2 size={11} /> Onboarding OK
                    </span>
                  ) : (
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "11px",
                      color: "var(--amber-400)",
                      background: "var(--amber-soft)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontWeight: 500,
                    }}>
                      <AlertCircle size={11} /> Onboarding incomplet
                    </span>
                  )}

                  <button
                    onClick={(e) => handleSendIntake(c, e)}
                    disabled={intakeBusy === c.orgId}
                    title="Trimite intake la client"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--cobalt-400)",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: intakeBusy === c.orgId ? "wait" : "pointer",
                      flexShrink: 0,
                    }}
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
