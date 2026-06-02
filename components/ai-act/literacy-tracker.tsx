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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Records list */}
      {records.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {records.map((r) => (
            <div key={r.id} className="cr-card" style={{
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
                aria-label={`Șterge trainingul pentru ${r.employeeName}`}
                className="cr-btn cr-btn--icon cr-btn--sm"
                onClick={() => onDeleted(r.id)}
                type="button"
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
          className="cr-btn cr-btn--secondary"
          onClick={() => setShowForm(true)}
          type="button"
        >
          <Plus size={14} /> Adaugă înregistrare training
        </button>
      ) : (
        <form className="cr-form-card" onSubmit={(e) => void handleSubmit(e)} style={{
          background: "var(--bg-raised)", borderRadius: "8px",
          padding: "20px", border: "1px solid var(--border)",
          display: "flex", flexDirection: "column", gap: "16px",
        }}>
          <div className="cr-form-title">
            Training nou — Art. 4 EU AI Act
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label className="cr-field-label">Nume angajat *</label>
              <input className="cr-input" required value={form.employeeName} onChange={(e) => setForm((f) => ({ ...f, employeeName: e.target.value }))} />
            </div>
            <div>
              <label className="cr-field-label">Funcție / Rol</label>
              <input className="cr-input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div>
              <label className="cr-field-label">Data training *</label>
              <input className="cr-input" type="date" required value={form.trainingDate} onChange={(e) => setForm((f) => ({ ...f, trainingDate: e.target.value }))} />
            </div>
            <div>
              <label className="cr-field-label">Tip training *</label>
              <select className="cr-select" value={form.trainingType} onChange={(e) => setForm((f) => ({ ...f, trainingType: e.target.value as LiteracyRecord["trainingType"] }))}>
                {TRAINING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="cr-field-label">Durata (ore)</label>
              <input className="cr-input" type="number" min={0.5} step={0.5} value={form.durationHours} onChange={(e) => setForm((f) => ({ ...f, durationHours: parseFloat(e.target.value) }))} />
            </div>
          </div>

          <div>
            <label className="cr-field-label">Trainer / Instructor</label>
            <input className="cr-input" value={form.trainerName} onChange={(e) => setForm((f) => ({ ...f, trainerName: e.target.value }))} />
          </div>

          <div>
            <label className="cr-field-label">Teme acoperite</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {SUGGESTED_TOPICS.map((topic) => {
                const selected = form.topicsCovered.includes(topic)
                return (
                  <button
                    className={`cr-filter-chip ${selected ? "is-active" : ""}`}
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    type="button"
                  >
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
            <button className="cr-btn cr-btn--primary" type="submit" disabled={loading}>
              {loading ? "Se salvează..." : "Salvează"}
            </button>
            <button className="cr-btn cr-btn--secondary" type="button" onClick={() => setShowForm(false)}>
              Anulează
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
