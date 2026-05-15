"use client"

import { useState } from "react"
import { Plus, X, Loader2 } from "lucide-react"
import type { AISystemPurpose } from "@/lib/compliance/types"

const PURPOSE_OPTIONS: { value: AISystemPurpose; label: string }[] = [
  { value: "hr-screening", label: "HR Screening / Recrutare" },
  { value: "credit-scoring", label: "Credit Scoring / Evaluare creditară" },
  { value: "biometric-identification", label: "Identificare biometrică" },
  { value: "fraud-detection", label: "Detectare fraudă" },
  { value: "marketing-personalization", label: "Personalizare marketing" },
  { value: "support-chatbot", label: "Chatbot suport" },
  { value: "document-assistant", label: "Asistent documente" },
  { value: "other", label: "Altul" },
]

interface AIInventoryPanelProps {
  onAdded: () => void
}

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10px",
  fontWeight: 600,
  color: "var(--ink-dim)",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: "5px",
}

export function AIInventoryPanel({ onAdded }: AIInventoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    purpose: "other" as AISystemPurpose,
    vendor: "",
    modelType: "",
    usesPersonalData: false,
    makesAutomatedDecisions: false,
    impactsRights: false,
    hasHumanReview: false,
  })

  function reset() {
    setForm({
      name: "",
      purpose: "other",
      vendor: "",
      modelType: "",
      usesPersonalData: false,
      makesAutomatedDecisions: false,
      impactsRights: false,
      hasHumanReview: false,
    })
    setError(null)
  }

  function handleCancel() {
    reset()
    setOpen(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/ai-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Eroare ${res.status}`)
      }

      reset()
      setOpen(false)
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare la salvare. Încearcă din nou.")
    } finally {
      setLoading(false)
    }
  }

  function setCheck(field: "usesPersonalData" | "makesAutomatedDecisions" | "impactsRights" | "hasHumanReview") {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.checked }))
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "9px 16px",
          background: "var(--cobalt-soft)",
          border: "1px solid rgba(96,165,250,0.25)",
          borderRadius: "8px",
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--cobalt-400)",
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(96,165,250,0.15)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--cobalt-soft)"
        }}
      >
        <Plus size={14} />
        Adaugă sistem AI
      </button>
    )
  }

  return (
    <div
      style={{
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-hover)",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
          Sistem AI nou
        </span>
        <button
          onClick={handleCancel}
          aria-label="Închide formularul"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--ink-dim)",
            borderRadius: "4px",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border)" }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent" }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Name + Purpose row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Nume sistem *</label>
            <input
              style={inputStyle}
              type="text"
              required
              placeholder="HR Scorer, Chatbot Intern..."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Scop / Categorie</label>
            <select
              style={inputStyle}
              value={form.purpose}
              onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value as AISystemPurpose }))}
            >
              {PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Vendor + Model row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <label style={labelStyle}>Vendor (opțional)</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="OpenAI, Google, intern..."
              value={form.vendor}
              onChange={(e) => setForm((p) => ({ ...p, vendor: e.target.value }))}
            />
          </div>
          <div>
            <label style={labelStyle}>Tip model (opțional)</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="GPT-4, LLaMA, XGBoost..."
              value={form.modelType}
              onChange={(e) => setForm((p) => ({ ...p, modelType: e.target.value }))}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div>
          <label style={{ ...labelStyle, marginBottom: "8px" }}>Caracteristici</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {(
              [
                { field: "usesPersonalData", label: "Procesează date personale" },
                { field: "makesAutomatedDecisions", label: "Decizii automate" },
                { field: "impactsRights", label: "Impact asupra drepturilor" },
                { field: "hasHumanReview", label: "Supraveghere umană" },
              ] as const
            ).map(({ field, label }) => (
              <label
                key={field}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: form[field] ? "var(--cobalt-soft)" : "transparent",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={form[field]}
                  onChange={setCheck(field)}
                  style={{ accentColor: "var(--cobalt-400)", width: "14px", height: "14px" }}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "var(--red-soft)",
              border: "1px solid rgba(248,113,113,0.25)",
              borderRadius: "6px",
              fontSize: "12px",
              color: "var(--red-400)",
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: "8px 14px",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              background: "transparent",
              fontSize: "13px",
              color: "var(--ink-muted)",
              cursor: "pointer",
            }}
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: form.name.trim() ? "var(--cobalt-600)" : "var(--bg-hover)",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 500,
              color: form.name.trim() ? "#fff" : "var(--ink-dim)",
              cursor: form.name.trim() ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
          >
            {loading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />}
            Salvează sistem
          </button>
        </div>
      </form>
    </div>
  )
}
