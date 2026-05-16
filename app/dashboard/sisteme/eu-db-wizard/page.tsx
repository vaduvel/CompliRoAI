"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCopy,
  Download,
  Loader2,
  Shield,
} from "lucide-react"
import { toast } from "sonner"

import type { AISystemPurpose } from "@/lib/compliance/types"
import type { EUDatabaseEntry } from "@/lib/compliance/ai-act-exporter"

const PURPOSE_LABELS: Record<AISystemPurpose, string> = {
  "hr-screening": "HR Screening / Recrutare",
  "credit-scoring": "Credit Scoring / Evaluare creditară",
  "biometric-identification": "Identificare biometrică",
  "fraud-detection": "Detectare fraudă",
  "marketing-personalization": "Personalizare marketing",
  "support-chatbot": "Chatbot suport",
  "document-assistant": "Asistent documente",
  "image-manipulation-intimate": "Generare conținut intim (INTERZIS Omnibus 2026)",
  "other": "Altul",
}

type WizardStep = 1 | 2 | 3 | 4

// ── Shared inline style helpers ──────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "5px",
}

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "13px",
  color: "var(--ink)",
  outline: "none",
  boxSizing: "border-box",
}

const card: React.CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  overflow: "hidden",
}

const cardHeader: React.CSSProperties = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--border)",
  background: "var(--bg-hover)",
}

const cardBody: React.CSSProperties = {
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "14px",
}

function BtnPrimary({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        background: disabled ? "var(--bg-hover)" : "var(--cobalt-600)",
        border: "none",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: disabled ? "var(--ink-dim)" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {children}
    </button>
  )
}

function BtnOutline({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        background: "transparent",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        fontSize: "13px",
        color: "var(--ink-muted)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  )
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export default function EUDatabaseWizardPage() {
  const [step, setStep] = useState<WizardStep>(1)
  const [loading, setLoading] = useState(false)
  const [entry, setEntry] = useState<EUDatabaseEntry | null>(null)

  const [form, setForm] = useState({
    systemName: "",
    purpose: "other" as AISystemPurpose,
    description: "",
    orgName: "",
    orgAddress: "",
    orgEmail: "",
    memberStates: "RO",
    humanOversightMeasures: "",
  })

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/ai-act/prepare-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          memberStates: form.memberStates
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? "Eroare")
      }
      const { entry: e } = (await res.json()) as { entry: EUDatabaseEntry }
      setEntry(e)
      setStep(3)
    } catch (err) {
      toast.error("Eroare la generare", {
        description: err instanceof Error ? err.message : "Încearcă din nou.",
      })
    } finally {
      setLoading(false)
    }
  }

  function copyJSON() {
    if (!entry) return
    navigator.clipboard.writeText(JSON.stringify(entry, null, 2))
    toast.success("JSON copiat în clipboard")
  }

  function downloadJSON() {
    if (!entry) return
    const blob = new Blob([JSON.stringify(entry, null, 2)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `eu-ai-database-${entry.systemName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const completenessColor =
    entry && entry.completenessPercent >= 80
      ? { bg: "var(--emerald-soft)", color: "var(--emerald-400)", border: "rgba(52,211,153,0.2)" }
      : { bg: "var(--amber-soft)", color: "var(--amber-400)", border: "rgba(251,191,36,0.2)" }

  return (
    <div style={{ padding: "32px", maxWidth: "760px", display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Back link */}
      <div>
        <Link
          href="/dashboard/sisteme"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "var(--ink-muted)", textDecoration: "none" }}
        >
          <ArrowLeft size={12} /> Inventar AI
        </Link>
      </div>

      {/* Page intro */}
      <div>
        <h1 style={{ fontFamily: "var(--font-display-v3)", fontSize: "22px", fontWeight: 600, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em" }}>
          Înregistrare EU AI Database
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Wizard pentru pregătirea înregistrării sistemului AI high-risk conform Art. 71 AI Act.
          Deadline standalone high-risk: 2 decembrie 2027.
        </p>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: "4px" }}>
        {([1, 2, 3, 4] as WizardStep[]).map((s) => (
          <div
            key={s}
            style={{
              flex: 1,
              height: "6px",
              borderRadius: "999px",
              background:
                s < step
                  ? "var(--emerald-400)"
                  : s === step
                  ? "var(--cobalt-400)"
                  : "var(--bg-hover)",
              transition: "background 0.2s",
            }}
          />
        ))}
      </div>

      {/* ── Step 1: System data ── */}
      {step === 1 && (
        <div style={card}>
          <div style={cardHeader}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
              Pas 1: Datele sistemului AI
            </span>
          </div>
          <div style={cardBody}>
            <div>
              <label style={fieldLabel}>Numele sistemului *</label>
              <input
                style={fieldInput}
                placeholder="HR Scorer, Chatbot Intern..."
                value={form.systemName}
                onChange={(e) => setForm((p) => ({ ...p, systemName: e.target.value }))}
              />
            </div>
            <div>
              <label style={fieldLabel}>Scop / Categorie</label>
              <select
                style={fieldInput}
                value={form.purpose}
                onChange={(e) =>
                  setForm((p) => ({ ...p, purpose: e.target.value as AISystemPurpose }))
                }
              >
                {Object.entries(PURPOSE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Descriere sistem</label>
              <textarea
                style={{ ...fieldInput, resize: "vertical" }}
                rows={3}
                placeholder="Ce face sistemul, ce date procesează..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <BtnPrimary
                onClick={() => setStep(2)}
                disabled={!form.systemName.trim()}
              >
                Continuă <ArrowRight size={13} />
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Provider + deployment ── */}
      {step === 2 && (
        <div style={card}>
          <div style={cardHeader}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
              Pas 2: Provider și deployment
            </span>
          </div>
          <div style={cardBody}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={fieldLabel}>Numele organizației</label>
                <input
                  style={fieldInput}
                  value={form.orgName}
                  onChange={(e) => setForm((p) => ({ ...p, orgName: e.target.value }))}
                />
              </div>
              <div>
                <label style={fieldLabel}>Email contact</label>
                <input
                  type="email"
                  style={fieldInput}
                  value={form.orgEmail}
                  onChange={(e) => setForm((p) => ({ ...p, orgEmail: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label style={fieldLabel}>Adresa sediului social</label>
              <input
                style={fieldInput}
                value={form.orgAddress}
                onChange={(e) => setForm((p) => ({ ...p, orgAddress: e.target.value }))}
              />
            </div>
            <div>
              <label style={fieldLabel}>State membre UE (unde e folosit sistemul)</label>
              <input
                style={fieldInput}
                placeholder="RO, DE, FR"
                value={form.memberStates}
                onChange={(e) => setForm((p) => ({ ...p, memberStates: e.target.value }))}
              />
            </div>
            <div>
              <label style={fieldLabel}>Măsuri de supraveghere umană (human oversight)</label>
              <textarea
                style={{ ...fieldInput, resize: "vertical" }}
                rows={2}
                placeholder="Confirmare umană obligatorie, audit periodic..."
                value={form.humanOversightMeasures}
                onChange={(e) =>
                  setForm((p) => ({ ...p, humanOversightMeasures: e.target.value }))
                }
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <BtnOutline onClick={() => setStep(1)}>
                <ArrowLeft size={13} /> Înapoi
              </BtnOutline>
              <BtnPrimary onClick={handleGenerate} disabled={loading}>
                {loading ? (
                  <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Shield size={13} />
                )}
                Generează JSON
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: JSON preview + completeness ── */}
      {step === 3 && entry && (
        <div style={card}>
          <div style={{ ...cardHeader, display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
              Pas 3: Preview înregistrare
            </span>
            {/* Completeness badge */}
            <span
              style={{
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "20px",
                background: completenessColor.bg,
                color: completenessColor.color,
                border: `1px solid ${completenessColor.border}`,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {entry.completenessPercent}% completat
            </span>
          </div>
          <div style={cardBody}>
            {/* Missing fields */}
            {entry.missingFields.length > 0 && (
              <div
                style={{
                  borderRadius: "8px",
                  border: "1px solid rgba(251,191,36,0.2)",
                  background: "var(--amber-soft)",
                  padding: "10px 14px",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--amber-400)",
                    margin: "0 0 6px",
                  }}
                >
                  Câmpuri lipsă
                </p>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {entry.missingFields.map((f) => (
                    <li key={f} style={{ fontSize: "12px", color: "var(--amber-400)", marginBottom: "2px" }}>
                      • {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <pre
              style={{
                maxHeight: "320px",
                overflow: "auto",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg)",
                padding: "14px",
                fontSize: "11px",
                color: "var(--ink-muted)",
                margin: 0,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              {JSON.stringify(entry, null, 2)}
            </pre>

            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <BtnOutline onClick={() => setStep(2)}>
                <ArrowLeft size={13} /> Editează
              </BtnOutline>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <BtnOutline onClick={copyJSON}>
                  <ClipboardCopy size={13} /> Copiază JSON
                </BtnOutline>
                <BtnOutline onClick={downloadJSON}>
                  <Download size={13} /> Descarcă
                </BtnOutline>
                <BtnPrimary onClick={() => setStep(4)}>
                  Continuă <ArrowRight size={13} />
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Submit instructions ── */}
      {step === 4 && (
        <div style={card}>
          <div style={{ ...cardHeader, display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={15} style={{ color: "var(--emerald-400)", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
              Pas 4: Instrucțiuni de submit
            </span>
          </div>
          <div style={cardBody}>
            {/* Legal boundary disclaimer */}
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid rgba(248,113,113,0.2)",
                background: "var(--red-soft)",
                padding: "14px 16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--red-400)", margin: "0 0 6px" }}>
                Limitele acestui instrument
              </p>
              <p style={{ fontSize: "12px", color: "var(--red-400)", margin: 0 }}>
                JSON-ul generat este un <strong>draft de pregătire</strong>, nu o înregistrare validată oficial.
                AI Act Compliance nu este certificat ca organism de evaluare a conformității EU AI Act.
                Înainte de submit, documentația trebuie verificată de un expert legal sau consultant
                certificat în AI Act.
              </p>
            </div>

            {/* Manual steps */}
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid rgba(96,165,250,0.25)",
                background: "var(--cobalt-soft)",
                padding: "14px 16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)", margin: "0 0 8px" }}>
                Pași pentru submit MANUAL pe EU AI Database:
              </p>
              <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {[
                  "Verifică documentația tehnică Annex IV (descarcă din inventar)",
                  "Consultă un expert legal pentru validarea clasificării de risc",
                  "Accesează platforma EU AI Database (euaidb.eu)",
                  "Autentifică-te cu credențialele organizației",
                  "Selectează \"Register a new AI system\" și completează cu datele din JSON",
                  "Verifică toate câmpurile, atașează Annex IV și trimite formularul",
                ].map((step, i) => (
                  <li key={i} style={{ fontSize: "12px", color: "var(--ink-muted)" }}>{step}</li>
                ))}
              </ol>
            </div>

            {/* Deadline warning */}
            <div
              style={{
                borderRadius: "8px",
                border: "1px solid rgba(251,191,36,0.2)",
                background: "var(--amber-soft)",
                padding: "14px 16px",
              }}
            >
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--amber-400)", margin: "0 0 4px" }}>
                Important
              </p>
              <p style={{ fontSize: "12px", color: "var(--amber-400)", margin: 0 }}>
                AI Act Compliance NU trimite automat la EU AI Database. Submiterea este responsabilitatea organizației.
                Termenul pentru sisteme high-risk standalone:{" "}
                <strong>2 decembrie 2027</strong> (extins prin Omnibus Agreement, 7 mai 2026).
              </p>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <BtnOutline onClick={copyJSON}>
                <ClipboardCopy size={13} /> Copiază JSON
              </BtnOutline>
              <BtnOutline onClick={downloadJSON}>
                <Download size={13} /> Descarcă JSON
              </BtnOutline>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px" }}>
              <BtnOutline onClick={() => setStep(3)}>
                <ArrowLeft size={13} /> Înapoi la preview
              </BtnOutline>
              <Link href="/dashboard/sisteme">
                <BtnOutline>Înapoi la inventar</BtnOutline>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
