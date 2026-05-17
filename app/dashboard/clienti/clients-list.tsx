"use client"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, ChevronRight, Search, AlertCircle, CheckCircle2 } from "lucide-react"

type ClientRow = {
  orgId: string
  orgName: string
  membershipId: string
  createdAtISO: string
  cui?: string
  aiSystemsCount: number
  literacyTrainingsCount: number
  onboardingCompleted: boolean
}

type StatusFilter = "all" | "onboarded" | "pending"

/**
 * Sprint 015 — Cabinet "Clienți" page. Streamlined list view, distinct from
 * /dashboard/portofoliu (which is the full portfolio dashboard with onboarding
 * CTAs + magic-link send). This page focuses on quick search + status filter +
 * direct switch to client workspace.
 */
export function ClientsList() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [switching, setSwitching] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/portfolio/clients")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients ?? [])
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

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter === "onboarded" && !c.onboardingCompleted) return false
      if (statusFilter === "pending" && c.onboardingCompleted) return false
      if (query.trim().length > 0) {
        const q = query.trim().toLowerCase()
        const hay = `${c.orgName} ${c.cui ?? ""}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [clients, query, statusFilter])

  async function handleSwitch(orgId: string) {
    setSwitching(orgId)
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      })
      if (res.ok) {
        router.push("/dashboard/sisteme")
        router.refresh()
      }
    } finally {
      setSwitching(null)
    }
  }

  return (
    <div style={{ padding: "32px 32px", maxWidth: "1100px", margin: "0 auto" }}>
      <header style={{ marginBottom: "20px" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display-v3)",
            fontSize: "22px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          Clienți
        </h1>
        <div style={{ fontSize: "13px", color: "var(--ink-dim)", marginTop: "4px" }}>
          Listă rapidă cu căutare + filtru status. Pentru gestiune completă
          (adăugare, intake) folosește pagina <a href="/dashboard/portofoliu" style={{ color: "var(--cobalt-400)" }}>Portofoliu</a>.
        </div>
      </header>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "16px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            position: "relative",
            flex: "1 1 280px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "12px",
              color: "var(--ink-dim)",
            }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută după nume sau CUI…"
            style={{
              width: "100%",
              background: "var(--bg-hover)",
              border: "1px solid var(--border-strong)",
              borderRadius: "8px",
              padding: "9px 12px 9px 32px",
              color: "var(--ink)",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "onboarded", "pending"] as StatusFilter[]).map((s) => {
            const active = statusFilter === s
            const label = s === "all" ? "Toți" : s === "onboarded" ? "Onboarded" : "În așteptare"
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: active
                    ? "1px solid var(--cobalt-500)"
                    : "1px solid var(--border-strong)",
                  background: active ? "var(--cobalt-soft)" : "transparent",
                  color: active ? "var(--ink)" : "var(--ink-muted)",
                  fontSize: "12.5px",
                  fontWeight: active ? 500 : 400,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: "40px", textAlign: "center", color: "var(--ink-dim)", fontSize: "13px" }}>
          Se încarcă lista clienților…
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
          {clients.length === 0
            ? "Nu ai încă niciun client în portofoliu. Adaugă primul din Portofoliu."
            : "Niciun client nu se potrivește cu filtrele actuale."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((c) => (
            <div
              key={c.orgId}
              style={{
                background: "var(--bg-raised)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  background: "var(--cobalt-soft)",
                  color: "var(--cobalt-400)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Building2 size={16} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: "var(--ink)",
                    marginBottom: "2px",
                  }}
                >
                  {c.orgName}
                </div>
                <div
                  style={{
                    fontSize: "11.5px",
                    color: "var(--ink-dim)",
                    display: "flex",
                    gap: "12px",
                  }}
                >
                  {c.cui && <span>CUI {c.cui}</span>}
                  <span>{c.aiSystemsCount} sisteme AI</span>
                  <span>{c.literacyTrainingsCount} training-uri</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "11.5px",
                  color: c.onboardingCompleted ? "var(--emerald-400)" : "var(--amber-400)",
                }}
              >
                {c.onboardingCompleted ? (
                  <>
                    <CheckCircle2 size={12} /> Onboarded
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} /> În așteptare
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSwitch(c.orgId)}
                disabled={switching === c.orgId}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-strong)",
                  background: "transparent",
                  color: "var(--ink-muted)",
                  fontSize: "12.5px",
                  cursor: switching === c.orgId ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {switching === c.orgId ? "..." : "Deschide"}
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
