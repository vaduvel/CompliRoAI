"use client"

import { useState, useEffect, useCallback } from "react"
import type { AISystemRecord } from "@/lib/compliance/types"
import { AIInventoryPanel } from "@/components/ai-act/ai-inventory-panel"
import { AISystemsList } from "@/components/ai-act/ai-systems-list"
import { AlertTriangle } from "lucide-react"

export default function SistemePage() {
  const [systems, setSystems] = useState<AISystemRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch("/api/ai-systems")
    if (res.ok) {
      const data = await res.json()
      setSystems(data.systems)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: string) {
    await fetch(`/api/ai-systems?id=${id}`, { method: "DELETE" })
    await load()
  }

  const highRiskCount = systems.filter((s) => s.riskLevel === "high").length

  return (
    <div style={{ padding: "32px", maxWidth: "900px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "22px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: 0,
          letterSpacing: "-0.02em",
        }}>
          Sisteme AI
        </h1>
        <p style={{ fontSize: "13px", color: "var(--ink-muted)", marginTop: "6px" }}>
          Inventarul oficial al sistemelor AI utilizate în organizație · Deadline high-risk: 2 dec 2027
        </p>
      </div>

      {/* High-risk warning */}
      {highRiskCount > 0 && (
        <div style={{
          display: "flex", gap: "12px", padding: "12px 16px",
          background: "var(--amber-soft)", borderRadius: "8px",
          border: "1px solid rgba(251,191,36,0.2)",
        }}>
          <AlertTriangle size={16} style={{ color: "var(--amber-400)", flexShrink: 0, marginTop: "1px" }} />
          <div style={{ fontSize: "13px", color: "var(--amber-400)" }}>
            Ai {highRiskCount} sistem{highRiskCount !== 1 ? "e" : ""} de risc ridicat sau interzis.
            Documentează-le înainte de 2 decembrie 2027.{" "}
            <a
              href="/dashboard/sisteme/eu-db-wizard"
              style={{ color: "var(--cobalt-400)", textDecoration: "none", fontWeight: 500 }}
            >
              Înregistrare EU Database →
            </a>
          </div>
        </div>
      )}

      {/* Add system */}
      <AIInventoryPanel onAdded={load} />

      {/* List */}
      <div>
        <div style={{
          fontSize: "11px", fontWeight: 500, color: "var(--ink-dim)",
          marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {systems.length} sistem{systems.length !== 1 ? "e" : ""} înregistrat{systems.length !== 1 ? "e" : ""}
        </div>
        {loading ? (
          <div style={{ fontSize: "13px", color: "var(--ink-dim)", padding: "24px 0" }}>Se încarcă...</div>
        ) : (
          <AISystemsList systems={systems} onDelete={handleDelete} />
        )}
      </div>
    </div>
  )
}
