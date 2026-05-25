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
    <div ref={containerRef} className="cr-workspace-switcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={open ? "cr-workspace-trigger is-open" : "cr-workspace-trigger"}
      >
        <span className={isCabinet ? "cr-workspace-icon is-cabinet" : "cr-workspace-icon"}>
          {isCabinet ? <Briefcase size={13} /> : <Building2 size={13} />}
        </span>
        <span className="cr-workspace-copy">
          <span className="cr-workspace-kicker">
            {isCabinet ? "Lucrând pentru" : "Workspace"}
          </span>
          <span className="cr-workspace-name">
            {active?.orgName ?? "—"}
          </span>
        </span>
        <ChevronsUpDown size={14} />
      </button>

      {open && (
        <div className="cr-workspace-menu">
          {workspaces.map((w) => {
            const isCurrent = w.orgId === active?.orgId
            const isLoading = switching === w.orgId
            return (
              <button
                key={w.orgId}
                type="button"
                onClick={() => !isCurrent && handleSwitch(w.orgId)}
                disabled={isCurrent || w.status !== "active" || !!switching}
                className={isCurrent ? "cr-workspace-option is-current" : "cr-workspace-option"}
              >
                <span className={w.role === "partner_manager" ? "cr-workspace-icon is-cabinet" : "cr-workspace-icon"}>
                  {w.role === "partner_manager" ? <Briefcase size={13} /> : <Building2 size={13} />}
                </span>
                <span className="cr-workspace-copy">
                  <span className="cr-workspace-name">
                    {w.orgName}
                  </span>
                  <span className="cr-workspace-role">
                    {ROLE_LABELS[w.role]}
                  </span>
                </span>
                {isLoading ? (
                  <Loader2 size={14} className="cr-spin" />
                ) : isCurrent ? (
                  <Check size={14} className="cr-workspace-check" />
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
