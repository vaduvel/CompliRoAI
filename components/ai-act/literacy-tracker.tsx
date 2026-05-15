"use client"
import { useState } from "react"
import type { LiteracyRecord } from "@/lib/compliance/types"
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react"

const TRAINING_TYPES = [
  { value: "intern", label: "Training intern" },
  { value: "extern", label: "Training extern" },
  { value: "platforma-online", label: "Platformă online" },
  { value: "workshop", label: "Workshop / seminar" },
] as const

const SUGGESTED_TOPICS = [
  "Utilizare responsabilă AI",
  "Riscuri și limitări AI",
  "Obligații Art. 4 EU AI Act",
  "Recunoașterea conținutului generat AI",
  "Proceduri interne de aprobare AI",
  "Bias și discriminare algoritmică",
]

interface Props {
  records: LiteracyRecord[]
  onAdded: () => void
  onDeleted: (id: string) => void
}

export function LiteracyTracker({ records, onAdded, onDeleted }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    employeeName: "",
    role: "",
    trainingDate: "",
    trainingType: "intern" as LiteracyRecord["trainingType"],
    topicsCovered: [] as string[],
    trainerName: "",
    durationHours: 1,
    attestationSigned: false,
    notes: "",
  })

  function toggleTopic(topic: string) {
    setForm((f) => ({
      ...f,
      topicsCovered: f.topicsCovered.includes(topic)
        ? f.topicsCovered.filter((t) => t !== topic)
        : [...f.topicsCovered, topic],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/literacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        setError(d.error ?? "Eroare")
        return
      }
      setShowForm(false)
      setForm({
        employeeName: "", role: "", trainingDate: "", trainingType: "intern",
        topicsCovered: [], trainerName: "", durationHours: 1,
        attestationSigned: false, notes: "",
      })
      onAdded()
    } catch {
      setError("Eroare de rețea")
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bg-hover)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    padding: "8px 12px",
    color: "var(--ink)",
    fontSize: "13px",
    boxSizing: "border-box",
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Records list */}
      {records.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {records.map((r) => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: "16px",
              padding: "12px 16px", background: "var(--bg-raised)", borderRadius: "6px",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
                  {r.employeeName}
                  {r.role && <span style={{ color: "var(--ink-dim)", fontWeight: 400 }}> · {r.role}</span>}
                </div>
                <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "2px" }}>
                  {r.trainingDate} · {TRAINING_TYPES.find((t) => t.value === r.trainingType)?.label ?? r.trainingType} · {r.durationHours}h
                </div>
                {r.topicsCovered.length > 0 && (
                  <div style={{ fontSize: "11px", color: "var(--ink-subtle)", marginTop: "4px" }}>
                    {r.topicsCovered.join(" · ")}
                  </div>
                )}
              </div>
              {r.attestationSigned
                ? <CheckCircle2 size={15} style={{ color: "var(--emerald-400)", flexShrink: 0 }} />
                : <Circle size={15} style={{ color: "var(--ink-dim)", flexShrink: 0 }} />
              }
              <button
                onClick={() => onDeleted(r.id)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-dim)", padding: "4px" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 16px", borderRadius: "6px",
            border: "1px dashed var(--border-strong)",
            background: "transparent", cursor: "pointer",
            fontSize: "13px", color: "var(--ink-muted)", width: "fit-content",
          }}
        >
          <Plus size={14} /> Adaugă înregistrare training
        </button>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} style={{
          background: "var(--bg-raised)", borderRadius: "8px",
          padding: "20px", border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
            Training nou — Art. 4 EU AI Act
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Nume angajat *</label>
              <input required value={form.employeeName} onChange={(e) => setForm((f) => ({ ...f, employeeName: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Funcție / Rol</label>
              <input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Data training *</label>
              <input type="date" required value={form.trainingDate} onChange={(e) => setForm((f) => ({ ...f, trainingDate: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Tip training *</label>
              <select value={form.trainingType} onChange={(e) => setForm((f) => ({ ...f, trainingType: e.target.value as LiteracyRecord["trainingType"] }))} style={inputStyle}>
                {TRAINING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Durata (ore)</label>
              <input type="number" min={0.5} step={0.5} value={form.durationHours} onChange={(e) => setForm((f) => ({ ...f, durationHours: parseFloat(e.target.value) }))} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "4px" }}>Trainer / Instructor</label>
            <input value={form.trainerName} onChange={(e) => setForm((f) => ({ ...f, trainerName: e.target.value }))} style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-muted)", display: "block", marginBottom: "8px" }}>Teme acoperite</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SUGGESTED_TOPICS.map((topic) => {
                const selected = form.topicsCovered.includes(topic)
                return (
                  <button type="button" key={topic} onClick={() => toggleTopic(topic)} style={{
                    padding: "4px 10px", borderRadius: "4px", fontSize: "12px", cursor: "pointer",
                    border: "1px solid " + (selected ? "var(--cobalt-600)" : "var(--border-strong)"),
                    background: selected ? "var(--cobalt-soft)" : "transparent",
                    color: selected ? "var(--cobalt-400)" : "var(--ink-dim)",
                  }}>
                    {topic}
                  </button>
                )
              })}
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.attestationSigned} onChange={(e) => setForm((f) => ({ ...f, attestationSigned: e.target.checked }))} />
            <span style={{ fontSize: "13px", color: "var(--ink-muted)" }}>Angajatul a semnat atestatul de participare</span>
          </label>

          {error && <div style={{ fontSize: "13px", color: "var(--red-400)" }}>{error}</div>}

          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" disabled={loading} style={{
              padding: "9px 18px", borderRadius: "6px", border: "none", cursor: "pointer",
              background: "var(--cobalt-600)", color: "#fff", fontSize: "13px", fontWeight: 500,
            }}>
              {loading ? "Se salvează..." : "Salvează"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{
              padding: "9px 18px", borderRadius: "6px",
              border: "1px solid var(--border)", background: "transparent",
              cursor: "pointer", fontSize: "13px", color: "var(--ink-muted)",
            }}>
              Anulează
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
