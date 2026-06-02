"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Download,
  Sparkles,
  Users,
  ChevronDown,
  AlertCircle,
  Loader2,
  FileText,
  FileCode,
  Archive,
  Clock,
  CheckCircle2,
  Compass,
} from "lucide-react"

import { ROLE_LABELS_SHORT } from "@/lib/compliance/role-classifier"
import type { AIActRole } from "@/lib/compliance/types"

type RoleAssessmentSummary = {
  id: string
  primaryRole: AIActRole
  answeredAtISO: string
  answeredByEmail: string
}

type ClientRow = {
  orgId: string
  orgName: string
  cui?: string
}

type PackEntry = {
  id: string
  generatedAtISO: string
  generatedByUserId: string
  generatedByUserEmail?: string
  format: "zip" | "markdown" | "html"
  hashRoot: string
  contentsCount: number
  clientOrgId?: string
  clientOrgName?: string
}

type Format = "zip" | "markdown" | "html"

const FORMAT_LABELS: Record<Format, string> = {
  zip: "ZIP complet (toate documentele)",
  markdown: "Markdown consolidat",
  html: "HTML print-ready (un singur fișier)",
}

const FORMAT_ICONS: Record<Format, React.ReactNode> = {
  zip: <Archive size={14} />,
  markdown: <FileCode size={14} />,
  html: <FileText size={14} />,
}

export default function ReadinessPackPage() {
  const [workspaceMode, setWorkspaceMode] = useState<"solo" | "cabinet">("solo")
  const [clients, setClients] = useState<ClientRow[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("__self__")
  const [format, setFormat] = useState<Format>("zip")
  const [generating, setGenerating] = useState(false)
  const [registry, setRegistry] = useState<PackEntry[]>([])
  const [registryLoading, setRegistryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastPackId, setLastPackId] = useState<string | null>(null)
  const [role, setRole] = useState<RoleAssessmentSummary | null>(null)
  const [roleLoaded, setRoleLoaded] = useState(false)

  const loadRegistry = useCallback(async () => {
    setRegistryLoading(true)
    try {
      const res = await fetch("/api/readiness-pack/registry")
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

  useEffect(() => {
    fetch("/api/role-assessment")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.assessment) {
          setRole({
            id: data.assessment.id,
            primaryRole: data.assessment.primaryRole,
            answeredAtISO: data.assessment.answeredAtISO,
            answeredByEmail: data.assessment.answeredByEmail,
          })
        }
      })
      .catch(() => {})
      .finally(() => setRoleLoaded(true))
  }, [])

  async function handleGenerate() {
    setError(null)
    setGenerating(true)
    try {
      const clientOrgId = selectedClient === "__self__" ? null : selectedClient
      const params = new URLSearchParams()
      if (clientOrgId) params.set("clientOrgId", clientOrgId)
      params.set("format", format)
      const res = await fetch(`/api/readiness-pack/generate?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? `Eroare ${res.status}`)
        return
      }
      const packId = res.headers.get("X-Readiness-Pack-Id")
      const blob = await res.blob()
      const cd = res.headers.get("Content-Disposition") ?? ""
      const match = /filename="([^"]+)"/.exec(cd)
      const fileName = match?.[1] ?? `readiness-pack.${format}`
      triggerDownload(blob, fileName)
      if (packId) setLastPackId(packId)
      setTimeout(() => loadRegistry(), 400)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la generare.")
    } finally {
      setGenerating(false)
    }
  }

  const targetLabel =
    selectedClient === "__self__"
      ? workspaceMode === "cabinet"
        ? "cabinetul tău"
        : "organizația ta"
      : clients.find((c) => c.orgId === selectedClient)?.orgName ?? "client necunoscut"

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Rapoarte & dosar</div>
          <h1 className="cr-title">AI Act Readiness Pack</h1>
          <p className="cr-subtitle">
          {workspaceMode === "cabinet"
            ? "Generează în 2 minute un pachet complet de conformitate AI Act pentru un client. Brand-uit cu logo-ul cabinetului tău, gata de facturat."
            : "Generează un pachet complet de conformitate AI Act pentru organizația ta — rezumat executiv, inventar, evidență training, notificări transparență, plan high-risk."}
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
          <Sparkles size={20} />
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
            Ce conține Readiness Pack-ul?
          </div>
          <ol
            style={{
              margin: 0,
              paddingLeft: "20px",
              fontSize: "13px",
              color: "var(--ink-muted)",
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>Rezumat executiv</strong> — 1 pagină pentru CEO/Admin (scor, top
              acțiuni, deadline-uri)
            </li>
            <li>
              <strong>Registru sisteme AI</strong> — toate sistemele cu clasificare,
              obligații, recomandări
            </li>
            <li>
              <strong>Evidență Art. 4 (AI Literacy)</strong> — training-uri + template
              certificat de semnat
            </li>
            <li>
              <strong>Notificări Art. 50</strong> — disclaimer-e gata de pus pe site,
              chatbot, marketing
            </li>
            <li>
              <strong>Memo GDPR ↔ AI Act</strong> — DPIA / FRIA / Art. 22 — integrare
              recomandată
            </li>
            <li>
              <strong>Plan high-risk</strong> — roadmap până la deadline-ul 2 decembrie
              2027 (HRAIS)
            </li>
            <li>
              <strong>Audit Art. 5</strong> — verificare practici interzise (alertă dacă
              există)
            </li>
            <li>
              <strong>Raport branduit (HTML)</strong> — cover cu logo cabinet, semnătură,
              gata de print/PDF
            </li>
          </ol>
        </div>
      </div>

      {/* Role Assessment gating */}
      {roleLoaded && !role && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            borderRadius: "10px",
            padding: "16px 18px",
            display: "flex",
            gap: "14px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              background: "rgba(245, 158, 11, 0.18)",
              color: "#f59e0b",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Compass size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: "4px",
              }}
            >
              Mai întâi completează evaluarea de rol
            </div>
            <div
              style={{
                fontSize: "12px",
                color: "var(--ink-muted)",
                lineHeight: 1.55,
                marginBottom: "10px",
              }}
            >
              Fără să știi dacă ești <strong>provider</strong>, <strong>deployer</strong>,{" "}
              <strong>importer</strong> etc., Readiness Pack-ul ratează contextul juridic
              fundamental. Răspunde la 8 întrebări (~5 min) și pack-ul va include un memo
              dedicat ca primă secțiune.
            </div>
            <a
              href="/dashboard/role-assessment"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "7px 12px",
                background: "#f59e0b",
                color: "#fff",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Compass size={12} />
              Începe evaluarea (5 min)
            </a>
          </div>
        </div>
      )}

      {/* Generate panel */}
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
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <span>Generează pack</span>
          {role && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.3px",
              }}
              title={`Evaluat la ${new Date(role.answeredAtISO).toLocaleString("ro-RO")} de ${role.answeredByEmail}`}
            >
              <CheckCircle2 size={11} />
              Rol: {ROLE_LABELS_SHORT[role.primaryRole]}
            </span>
          )}
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
                <option value="__self__">Cabinetul tău (organizația proprie)</option>
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
            <Users
              size={12}
              style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}
            />
            Nu ai încă clienți în portofoliu. Importă sau adaugă primul client din{" "}
            <a href="/dashboard/clienti" style={{ color: "var(--cobalt-400)" }}>
              Clienți
            </a>
            .
          </div>
        )}

        {/* Format selector */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--ink-muted)",
              marginBottom: "6px",
            }}
          >
            Format livrare
          </label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(["zip", "markdown", "html"] as Format[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${format === f ? "var(--cobalt-400)" : "var(--border-strong)"}`,
                  background: format === f ? "var(--cobalt-soft)" : "var(--bg)",
                  color: format === f ? "var(--cobalt-400)" : "var(--ink-muted)",
                  fontSize: "12px",
                  fontWeight: format === f ? 600 : 500,
                  cursor: "pointer",
                  transition: "all 120ms",
                }}
              >
                {FORMAT_ICONS[f]}
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

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
          {generating ? "Generăm pachetul…" : `Generează pentru ${targetLabel}`}
        </button>

        {lastPackId && !error && !generating && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "var(--emerald-soft, rgba(52,211,153,0.15))",
              border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--emerald-400, #10b981)",
            }}
          >
            <CheckCircle2
              size={12}
              style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}
            />
            Pachet generat: <code>{lastPackId}</code> — descărcat și înregistrat în
            istoric.
          </div>
        )}

        {error && (
          <div
            style={{
              marginTop: "12px",
              padding: "10px 12px",
              background: "var(--red-soft, rgba(248,113,113,0.15))",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--red-400, #ef4444)",
            }}
          >
            <AlertCircle
              size={12}
              style={{ display: "inline", verticalAlign: "middle", marginRight: "6px" }}
            />
            {error}
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
            Pachete generate
          </div>
          <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            {registryLoading ? "se încarcă…" : `${registry.length} pachete`}
          </div>
        </div>

        {!registryLoading && registry.length === 0 && (
          <div
            style={{ fontSize: "13px", color: "var(--ink-muted)", padding: "12px 0" }}
          >
            Niciun readiness pack generat încă. Apasă „Generează” mai sus.
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
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>
                      {pack.clientOrgName ?? "Organizația ta"}
                    </span>
                    <span
                      style={{
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
                      {pack.format}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-dim)",
                      fontFamily: "ui-monospace, SFMono-Regular, monospace",
                      wordBreak: "break-all",
                    }}
                  >
                    {pack.hashRoot.slice(0, 24)}…
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-muted)",
                      marginTop: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Clock size={10} />
                    {new Date(pack.generatedAtISO).toLocaleString("ro-RO")} ·{" "}
                    {pack.contentsCount} componente
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
