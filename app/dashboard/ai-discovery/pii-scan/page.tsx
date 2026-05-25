"use client"

/**
 * Sprint 009 — /dashboard/ai-discovery/pii-scan
 *
 * Pasează text (paste) sau încarcă fișier .txt/.json/.csv (max 5MB) și rulează
 * analiza PII. Preview rezultat. Buton „Salvează scan" persistă PIIDetection
 * în state + emite finding daca high-confidence.
 */

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
} from "lucide-react"

import { piiCategoryLabel } from "@/lib/compliance/pii-discovery"
import type { PIIDiscoveryResult } from "@/lib/compliance/pii-discovery"
import type { PIIDetection } from "@/lib/compliance/types"
import type { PIIDetectionSummary } from "@/lib/server/pii-discovery-store"

const MAX_FILE_BYTES = 5 * 1024 * 1024

type ListResponse = {
  detections: PIIDetection[]
  summary: PIIDetectionSummary
}

export default function PIIScanPage() {
  const [sourceLabel, setSourceLabel] = useState("")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<PIIDiscoveryResult | null>(null)
  const [savedDetections, setSavedDetections] = useState<PIIDetection[]>([])
  const [summary, setSummary] = useState<PIIDetectionSummary | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const loadDetections = useCallback(async () => {
    const res = await fetch("/api/pii-discovery")
    if (!res.ok) return
    const data = (await res.json()) as ListResponse
    setSavedDetections(data.detections)
    setSummary(data.summary)
  }, [])

  useEffect(() => {
    void loadDetections()
  }, [loadDetections])

  async function handleAnalyze() {
    if (!text.trim()) {
      setErr("Adaugă text înainte de a rula scan-ul.")
      return
    }
    setBusy(true)
    setErr(null)
    setResult(null)
    try {
      const res = await fetch("/api/pii-discovery/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceLabel: sourceLabel.trim(), text }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut analiza textul.")
        return
      }
      const data = (await res.json()) as { result: PIIDiscoveryResult }
      setResult(data.result)
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!result) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch("/api/pii-discovery", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceLabel: result.sourceLabel, text }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(j.error || "Nu am putut salva scan-ul.")
        return
      }
      await loadDetections()
      // Reset preview dupa save
      setResult(null)
      setText("")
      setSourceLabel("")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Ștergi acest scan PII? Acțiunea apare în audit trail.")) return
    const res = await fetch(`/api/pii-discovery/${id}`, { method: "DELETE" })
    if (res.ok) {
      await loadDetections()
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_BYTES) {
      setErr("Fișierul depășește 5MB.")
      return
    }
    if (!sourceLabel.trim()) setSourceLabel(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      const content = typeof reader.result === "string" ? reader.result : ""
      setText(content)
    }
    reader.readAsText(file)
  }

  return (
    <div className="cr-page cr-stack">
      <div className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <Eye size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Discovery & risc</div>
            <h1 className="cr-title">PII Scan</h1>
            <p className="cr-subtitle">
              Pastează text sau încarcă fișier (.txt, .json, .csv, max 5MB). Scannerul
              detectează CNP, IBAN, email, telefon, card, pașaport, IP, adrese și nume.
              Dacă găsește identificatori sensibili, emite finding GDPR automat în{" "}
              <strong>De rezolvat</strong>.
            </p>
          </div>
        </div>
      </div>

      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "10px",
          }}
        >
          <StatBox label="Total scan-uri" value={summary.total} color="var(--ink)" />
          <StatBox label="Categorii detectate" value={summary.totalCategoriesFound} color="#60a5fa" />
          <StatBox label="Cu finding GDPR" value={summary.withFindings} color="#a855f7" />
          <StatBox label="High-confidence" value={summary.highConfidence} color="#f87171" />
        </div>
      )}

      {err && (
        <div className="cr-alert cr-alert--danger">
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
          {err}
        </div>
      )}

      <section
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-soft)",
          borderRadius: "10px",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--ink)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Search size={15} color="#60a5fa" />
          Scan nou
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 500 }}>
            Etichetă sursă (opțional)
          </span>
          <input
            type="text"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            placeholder="ex: chat-log-mai-2026.json"
            className="cr-input"
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ fontSize: "11px", color: "var(--ink-dim)", fontWeight: 500 }}>
            Text de analizat (paste sau upload)
          </span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pastează aici text, conținut JSON sau CSV..."
            className="cr-input cr-textarea"
            style={{ minHeight: "150px", fontFamily: "ui-monospace, monospace" }}
          />
        </label>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <label className="cr-btn cr-btn--secondary cr-btn--sm" style={{ cursor: "pointer" }}>
            <Upload size={13} /> Încarcă fișier
            <input
              type="file"
              accept=".txt,.json,.csv,text/plain,application/json,text/csv"
              onChange={handleFile}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={handleAnalyze} disabled={busy || !text.trim()} className="cr-btn cr-btn--primary cr-btn--sm">
            {busy ? <Loader2 size={14} /> : <Search size={14} />}
            Analizează
          </button>
          {result && (
            <button onClick={handleSave} disabled={busy} className="cr-btn cr-btn--secondary cr-btn--sm">
              <Plus size={13} /> Salvează scan + emite finding
            </button>
          )}
        </div>
      </section>

      {result && (
        <section
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "10px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-display-v3)",
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Eye size={15} color="#a855f7" />
              Rezultat scan
            </div>
            <RiskBadge level={result.riskLevel} />
          </div>

          <div style={{ fontSize: "12px", color: "var(--ink-muted)" }}>
            <strong>{result.detectionCount}</strong> detectări în „{result.sourceLabel}".
            {result.candidateFinding && (
              <span style={{ color: "#f87171", marginLeft: "6px" }}>
                ⚠ Finding GDPR va fi emis la save.
              </span>
            )}
          </div>

          {result.categories.length === 0 ? (
            <div style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
              Nu au fost detectate identificatori personali în text.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-dim)" }}>
                  <th style={th}>Categorie</th>
                  <th style={th}>Număr</th>
                  <th style={th}>Încredere</th>
                  <th style={th}>Sample (masked)</th>
                </tr>
              </thead>
              <tbody>
                {result.categories.map((cat) => (
                  <tr key={cat.type} style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <td style={td}>{piiCategoryLabel(cat.type)}</td>
                    <td style={td}>{cat.count}</td>
                    <td style={td}>
                      <ConfidenceBadge confidence={cat.confidence} />
                    </td>
                    <td style={{ ...td, fontFamily: "ui-monospace, monospace" }}>
                      {cat.sample ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {savedDetections.length > 0 && (
        <section
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-soft)",
            borderRadius: "10px",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--ink)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Shield size={15} color="#34d399" />
            Scan-uri salvate ({savedDetections.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {savedDetections.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 14px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "8px",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                    {d.sourceLabel}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                    {d.detectionCount} detectări · {d.categories.length} categorii ·{" "}
                    {new Date(d.scannedAtISO).toLocaleString("ro-RO")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {d.linkedFindingId && (
                    <a
                      href="/dashboard/resolve"
                      style={{
                        fontSize: "11px",
                        color: "var(--cobalt-600)",
                        textDecoration: "underline",
                      }}
                    >
                      <FileText size={11} style={{ display: "inline", verticalAlign: "-2px" }} />{" "}
                      Finding
                    </a>
                  )}
                  <button onClick={() => handleDelete(d.id)} className="cr-btn cr-btn--secondary cr-btn--sm" aria-label="Șterge scan">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--surface-1)",
        border: "1px solid var(--border-soft)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-display-v3)",
          fontSize: "20px",
          fontWeight: 600,
          color,
          marginTop: "4px",
        }}
      >
        {value}
      </div>
    </div>
  )
}

function RiskBadge({ level }: { level: PIIDiscoveryResult["riskLevel"] }) {
  const map = {
    none: { bg: "var(--surface-2)", fg: "var(--ink-dim)", label: "Fără detectări" },
    low: { bg: "rgba(52,211,153,0.14)", fg: "#34d399", label: "Risc scăzut" },
    medium: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24", label: "Risc mediu" },
    high: { bg: "rgba(248,113,113,0.18)", fg: "#f87171", label: "Risc înalt" },
  }
  const c = map[level]
  return (
    <span
      style={{
        padding: "4px 12px",
        fontSize: "11px",
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        borderRadius: "999px",
      }}
    >
      {c.label}
    </span>
  )
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  const map = {
    high: { bg: "rgba(248,113,113,0.18)", fg: "#f87171", label: "high" },
    medium: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24", label: "medium" },
    low: { bg: "rgba(96,165,250,0.14)", fg: "#60a5fa", label: "low" },
  }
  const c = map[confidence]
  return (
    <span
      style={{
        padding: "2px 8px",
        fontSize: "10px",
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
        borderRadius: "999px",
      }}
    >
      {c.label}
    </span>
  )
}

const th: React.CSSProperties = {
  padding: "8px 6px",
  fontSize: "11px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
}

const td: React.CSSProperties = {
  padding: "8px 6px",
  color: "var(--ink)",
}
