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
    <div style={{ padding: "32px", maxWidth: "900px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "22px", fontWeight: 600, color: "var(--ink)", margin: 0, letterSpacing: "-0.02em",
        }}>
          AI Literacy
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Obligație activă din 2 februarie 2025 · Art. 4 EU AI Act · Documentează că angajații au primit training
        </p>
      </div>

      {/* Status banner */}
      <div style={{
        display: "flex", gap: "12px", padding: "14px 16px",
        background: isCompliant ? "var(--emerald-soft)" : "var(--red-soft)",
        borderRadius: "8px",
        border: "1px solid " + (isCompliant ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)"),
      }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
          {[
            { label: "Total înregistrări", value: records.length },
            { label: "Atestate semnate", value: attestedCount },
            { label: "Ore de training", value: `${totalHours}h` },
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: "16px", background: "var(--bg-raised)",
              borderRadius: "8px", border: "1px solid var(--border)",
            }}>
              <div style={{
                fontSize: "22px", fontWeight: 600, color: "var(--ink)",
                fontFamily: "var(--font-display-v3)",
              }}>{stat.value}</div>
              <div style={{ fontSize: "12px", color: "var(--ink-dim)", marginTop: "4px" }}>{stat.label}</div>
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
