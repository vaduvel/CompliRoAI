"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Building2, Check, ChevronsUpDown, Loader2 } from "lucide-react"

type Workspace = {
  orgId: string
  orgName: string
  role: "owner" | "partner_manager" | "compliance" | "reviewer" | "viewer"
  status: "active" | "inactive"
  membershipId: string
  isActive: boolean
}

type AuthMeResponse = {
  user: {
    userId: string
    email: string
    orgId: string
    orgName: string
    workspaceMode: "imm-classic" | "ai-builder" | "cabinet"
  } | null
  workspaces?: Workspace[]
}

const ROLE_LABELS: Record<Workspace["role"], string> = {
  owner: "Proprietar",
  partner_manager: "Consultant",
  compliance: "Compliance",
  reviewer: "Reviewer",
  viewer: "Vizualizator",
}

export function WorkspaceSwitcher() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [active, setActive] = useState<Workspace | null>(null)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json() as Promise<AuthMeResponse>)
      .then((data) => {
        if (cancelled) return
        const list = data.workspaces ?? []
        setWorkspaces(list)
        const current = list.find((w) => w.isActive) ?? null
        setActive(current)
      })
      .catch(() => {
        // Silent — sidebar still renders without switcher state.
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside)
      return () => document.removeEventListener("mousedown", onClickOutside)
    }
  }, [open])

  if (workspaces.length <= 1) return null

  async function handleSwitch(orgId: string) {
    if (switching) return
    setSwitching(orgId)
    try {
      const res = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      })
      if (!res.ok) {
        setSwitching(null)
        return
      }
      setOpen(false)
      router.refresh()
      // Soft reload to re-evaluate dashboard layout (cabinet vs solo header).
      router.push("/dashboard")
    } catch {
      setSwitching(null)
    }
  }

  const isCabinet = active?.role === "partner_manager"

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 12px",
          borderRadius: "8px",
          border: "1px solid var(--border-strong)",
          background: open ? "var(--bg-hover)" : "var(--bg-elev)",
          color: "var(--ink)",
          cursor: "pointer",
          fontSize: "13px",
          textAlign: "left",
          transition: "background 120ms",
        }}
      >
        <span
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "6px",
            background: isCabinet ? "var(--cobalt-soft)" : "var(--bg-hover)",
            color: isCabinet ? "var(--cobalt-400)" : "var(--ink-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {isCabinet ? <Briefcase size={13} /> : <Building2 size={13} />}
        </span>
        <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", overflow: "hidden" }}>
          <span
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {isCabinet ? "Lucrând pentru" : "Workspace"}
          </span>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--ink)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {active?.orgName ?? "—"}
          </span>
        </span>
        <ChevronsUpDown size={14} color="var(--ink-dim)" />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-raised)",
            border: "1px solid var(--border-strong)",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            padding: "6px",
            zIndex: 50,
            maxHeight: "360px",
            overflowY: "auto",
          }}
        >
          {workspaces.map((w) => {
            const isCurrent = w.orgId === active?.orgId
            const isLoading = switching === w.orgId
            return (
              <button
                key={w.orgId}
                type="button"
                onClick={() => !isCurrent && handleSwitch(w.orgId)}
                disabled={isCurrent || w.status !== "active" || !!switching}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 10px",
                  borderRadius: "7px",
                  border: "none",
                  background: isCurrent ? "var(--bg-hover)" : "transparent",
                  color: "var(--ink)",
                  cursor: isCurrent ? "default" : "pointer",
                  fontSize: "13px",
                  textAlign: "left",
                  opacity: w.status === "active" ? 1 : 0.5,
                  transition: "background 120ms",
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent && w.status === "active") {
                    ;(e.currentTarget as HTMLButtonElement).style.background = "var(--bg-hover)"
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    ;(e.currentTarget as HTMLButtonElement).style.background = "transparent"
                  }
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "6px",
                    background:
                      w.role === "partner_manager" ? "var(--cobalt-soft)" : "var(--bg-elev)",
                    color: w.role === "partner_manager" ? "var(--cobalt-400)" : "var(--ink-dim)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {w.role === "partner_manager" ? <Briefcase size={13} /> : <Building2 size={13} />}
                </span>
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1px", overflow: "hidden" }}>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "var(--ink)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {w.orgName}
                  </span>
                  <span
                    style={{
                      fontSize: "11px",
                      color: "var(--ink-dim)",
                    }}
                  >
                    {ROLE_LABELS[w.role]}
                  </span>
                </span>
                {isLoading ? (
                  <Loader2 size={14} color="var(--ink-dim)" style={{ animation: "spin 1s linear infinite" }} />
                ) : isCurrent ? (
                  <Check size={14} color="var(--cobalt-400)" />
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
