"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Sparkles, ShieldCheck, FileBarChart, ChevronRight } from "lucide-react"

type ReadinessRecord = {
  id: string
  generatedAtISO: string
  generatedByUserEmail?: string
  format: string
  hashRoot: string
  contentsCount: number
  clientOrgId?: string
  clientOrgName?: string
}

type AuditPackRecord = {
  id: string
  orgId: string
  orgName: string
  hashRoot: string
  fileCount: number
  sizeBytes: number
  createdByUserId: string
  createdAtISO: string
  reSigned?: boolean
}

type CombinedRow =
  | (ReadinessRecord & { kind: "readiness" })
  | (AuditPackRecord & { kind: "audit" })

type Filter = "all" | "readiness" | "audit"

/**
 * Sprint 015 — Cabinet "Rapoarte" page. Combined view of Readiness Pack +
 * Audit Pack history. Sorted by generation date desc. Filterable by type.
 * Click → deep-link to source page for re-download.
 */
export function ReportsList() {
  const [readiness, setReadiness] = useState<ReadinessRecord[]>([])
  const [audit, setAudit] = useState<AuditPackRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [readinessRes, auditRes] = await Promise.all([
        fetch("/api/readiness-pack/registry"),
        fetch("/api/audit-pack/registry"),
      ])
      if (readinessRes.ok) {
        const data = await readinessRes.json()
        setReadiness(data.packs ?? [])
      }
      if (auditRes.ok) {
        const data = await auditRes.json()
        setAudit(data.packs ?? [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const combined: CombinedRow[] = useMemo(() => {
    const rows: CombinedRow[] = [
      ...readiness.map((r) => ({ ...r, kind: "readiness" as const })),
      ...audit.map((a) => ({ ...a, kind: "audit" as const })),
    ]
    return rows.sort((a, b) => {
      const aDate = a.kind === "readiness" ? a.generatedAtISO : a.createdAtISO
      const bDate = b.kind === "readiness" ? b.generatedAtISO : b.createdAtISO
      return bDate.localeCompare(aDate)
    })
  }, [readiness, audit])

  const filtered = combined.filter((r) => filter === "all" || r.kind === filter)

  return (
    <div className="cr-page cr-stack">
      <header className="cr-hero">
        <div className="cr-hero__copy cr-hero__copy--icon">
          <span className="cr-action-card__icon">
            <FileBarChart size={20} />
          </span>
          <div>
            <div className="cr-eyebrow">Rapoarte & dosar</div>
            <h1 className="cr-title">Rapoarte</h1>
            <p className="cr-subtitle">
            Istoric Readiness Pack + Audit Pack pentru toți clienții. Click pe un raport
            pentru a-l regenera sau verifica.
            </p>
          </div>
        </div>
      </header>

      {/* Quick action cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <Link
          href="/dashboard/readiness-pack"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <Sparkles size={18} color="var(--cobalt-400)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 500 }}>Generează Readiness Pack</div>
            <div style={{ fontSize: "11.5px", color: "var(--ink-dim)" }}>
              {readiness.length} generat{readiness.length === 1 ? "" : "e"} până acum
            </div>
          </div>
          <ChevronRight size={14} color="var(--ink-dim)" />
        </Link>
        <Link
          href="/dashboard/audit-pack"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            background: "var(--bg-raised)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <ShieldCheck size={18} color="var(--cobalt-400)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 500 }}>Generează Audit Pack</div>
            <div style={{ fontSize: "11.5px", color: "var(--ink-dim)" }}>
              {audit.length} generat{audit.length === 1 ? "" : "e"} până acum
            </div>
          </div>
          <ChevronRight size={14} color="var(--ink-dim)" />
        </Link>
      </div>

      {/* Filter pills */}
      <div className="cr-segment-bar" style={{ marginBottom: "16px" }}>
        {(["all", "readiness", "audit"] as Filter[]).map((f) => {
          const active = filter === f
          const label = f === "all" ? "Toate" : f === "readiness" ? "Readiness Pack" : "Audit Pack"
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`cr-tab ${active ? "is-active" : ""}`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--ink-dim)", fontSize: "13px" }}>
          Se încarcă rapoartele…
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            border: "1px dashed var(--border-strong)",
            borderRadius: "12px",
            color: "var(--ink-dim)",
            fontSize: "13.5px",
          }}
        >
          Niciun raport generat încă. Folosește acțiunile de mai sus pentru primul.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {filtered.map((row) => {
            const isReadiness = row.kind === "readiness"
            const date = isReadiness ? row.generatedAtISO : row.createdAtISO
            const subject = isReadiness
              ? (row.clientOrgName ?? "Workspace propriu")
              : row.orgName
            const meta = isReadiness
              ? `${row.contentsCount} componente · format ${row.format}`
              : `${row.fileCount} fișiere · ${(row.sizeBytes / 1024).toFixed(0)} KB${row.reSigned ? " · re-semnat" : ""}`
            const hash = row.hashRoot.slice(0, 12)
            return (
              <div
                key={`${row.kind}-${row.id}`}
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "var(--bg-elev)",
                    color: isReadiness ? "var(--cobalt-400)" : "var(--emerald-400)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {isReadiness ? <Sparkles size={14} /> : <ShieldCheck size={14} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "13.5px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      marginBottom: "2px",
                    }}
                  >
                    {isReadiness ? "Readiness Pack" : "Audit Pack"} — {subject}
                  </div>
                  <div
                    style={{
                      fontSize: "11.5px",
                      color: "var(--ink-dim)",
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span>{new Date(date).toLocaleString("ro-RO")}</span>
                    <span>{meta}</span>
                    <span style={{ fontFamily: "var(--font-mono, monospace)" }}>
                      sha256:{hash}…
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
