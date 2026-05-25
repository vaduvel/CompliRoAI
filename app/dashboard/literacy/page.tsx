"use client"
import { useState, useEffect, useCallback } from "react"
import type { LiteracyRecord } from "@/lib/compliance/types"
import { LiteracyTracker } from "@/components/ai-act/literacy-tracker"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function LiteracyPage() {
  const [records, setRecords] = useState<LiteracyRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch("/api/literacy")
    if (res.ok) {
      const data = await res.json() as { records: LiteracyRecord[] }
      setRecords(data.records)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleDelete(id: string) {
    await fetch(`/api/literacy?id=${id}`, { method: "DELETE" })
    await load()
  }

  const attestedCount = records.filter((r) => r.attestationSigned).length
  const isCompliant = records.length > 0 && attestedCount === records.length
  const totalHours = records.reduce((sum, r) => sum + (r.durationHours ?? 0), 0)

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <div className="cr-eyebrow">Conformitate</div>
          <h1 className="cr-title">AI Literacy</h1>
          <p className="cr-subtitle">
            Obligație activă din 2 februarie 2025 · Art. 4 EU AI Act · documentează
            că angajații relevanți au primit training și au semnat atestarea.
          </p>
        </div>
      </div>

      {/* Status banner */}
      <div className={`cr-alert ${isCompliant ? "cr-alert--info" : "cr-alert--danger"}`}>
        {isCompliant
          ? <CheckCircle2 size={16} style={{ color: "var(--emerald-400)", flexShrink: 0, marginTop: "1px" }} />
          : <AlertCircle size={16} style={{ color: "var(--red-400)", flexShrink: 0, marginTop: "1px" }} />
        }
        <div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: isCompliant ? "var(--emerald-400)" : "var(--red-400)" }}>
            {isCompliant
              ? `${records.length} înregistrări de training — obligație documentată`
              : records.length === 0
                ? "Niciun training documentat — obligație neîndeplinită"
                : `${records.length - attestedCount} înregistrări fără atestat semnat`
            }
          </div>
          <div style={{ fontSize: "12px", color: isCompliant ? "var(--emerald-400)" : "var(--red-400)", marginTop: "2px", opacity: 0.8 }}>
            Art. 4 impune ca furnizorii și utilizatorii de sisteme AI să asigure un nivel suficient de cunoaștere al AI pentru angajații relevanți.
          </div>
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="cr-stat-strip" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          {[
            { label: "Total înregistrări", value: records.length },
            { label: "Atestate semnate", value: attestedCount },
            { label: "Ore de training", value: `${totalHours}h` },
          ].map((stat) => (
            <div key={stat.label} className="cr-stat">
              <div className="cr-stat__value">{stat.value}</div>
              <div className="cr-stat__label">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: "13px", color: "var(--ink-dim)" }}>Se încarcă...</div>
      ) : (
        <LiteracyTracker records={records} onAdded={load} onDeleted={handleDelete} />
      )}
    </div>
  )
}
