import { headers } from "next/headers"
import Link from "next/link"
import {
  Bell,
  Building2,
  CheckSquare,
  ClipboardCheck,
  Cpu,
  Database,
  FileCheck,
  Mail,
  Package,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"

import { readState } from "@/lib/server/store"
import { normalizeWorkspaceMode, type WorkspaceMode } from "@/lib/server/auth"

export const dynamic = "force-dynamic"

type ActionCard = {
  href: string
  iconName: keyof typeof CARD_ICONS
  title: string
  subtitle: string
}

const CARD_ICONS = {
  Cpu,
  FileCheck,
  Package,
  Database,
  ClipboardCheck,
  ShieldAlert,
  Sparkles,
  Mail,
  CheckSquare,
  Bell,
  UserPlus,
  Users,
  Building2,
}

function nextActionsFor(mode: WorkspaceMode): ActionCard[] {
  if (mode === "ai-builder") {
    return [
      {
        href: "/dashboard/sisteme",
        iconName: "Cpu",
        title: "Adaugă primul sistem AI",
        subtitle: "Înregistrează modelul/serviciul construit pentru clasificare automată.",
      },
      {
        href: "/dashboard/sisteme/eu-db-wizard",
        iconName: "Database",
        title: "Înregistrare EU Database",
        subtitle: "Pregătește dosarul Annex IV pentru sistemele high-risk.",
      },
      {
        href: "/dashboard/logging-evidence",
        iconName: "ClipboardCheck",
        title: "Configurează Logging (Art. 12)",
        subtitle: "Declarăloggingul + retenția pentru sistemele tale.",
      },
    ]
  }
  if (mode === "cabinet") {
    return [
      {
        href: "/dashboard/portofoliu",
        iconName: "Users",
        title: "Adaugă primul client",
        subtitle: "Creează un workspace izolat pentru clientul tău.",
      },
      {
        href: "/dashboard/client-intake",
        iconName: "UserPlus",
        title: "Trimite Magic Link Intake",
        subtitle: "Cere clientului datele AI + GDPR fără parolă.",
      },
      {
        href: "/dashboard/rapoarte",
        iconName: "Sparkles",
        title: "Generează primul Audit Pack",
        subtitle: "Compilează evidența compliance într-un dosar semnat.",
      },
    ]
  }
  // imm-classic
  return [
    {
      href: "/dashboard/sisteme",
      iconName: "Cpu",
      title: "Adaugă primul sistem AI",
      subtitle: "Tot ce folosești cu AI (ChatGPT, Copilot, vendor SaaS) merge în inventar.",
    },
    {
      href: "/dashboard/role-assessment",
      iconName: "FileCheck",
      title: "Rulează Role Assessment",
      subtitle: "Determină rolul firmei tale conform Art. 3 (deployer, provider, etc).",
    },
    {
      href: "/dashboard/vendor-review",
      iconName: "Package",
      title: "Verifică Vendor AI Risk",
      subtitle: "Evaluează DPA + risc pentru fiecare furnizor AI folosit.",
    },
  ]
}

const ROLE_GREETING: Record<WorkspaceMode, { title: string; subtitle: string }> = {
  "imm-classic": {
    title: "Bun venit înapoi",
    subtitle: "Continuă inventarierea AI și completează obligațiile EU AI Act + GDPR.",
  },
  "ai-builder": {
    title: "Workspace AI Builder",
    subtitle: "Annex IV, EU Database, FRIA, API/SDK — toate aliniate la rolul de provider.",
  },
  cabinet: {
    title: "Cabinet compliance",
    subtitle: "Gestionează portofoliul de clienți, audit pack-uri și aprobări într-un singur loc.",
  },
}

export default async function DashboardHomePage() {
  const h = await headers()
  const workspaceMode = normalizeWorkspaceMode(h.get("x-aiact-workspace-mode"))
  const orgName = h.get("x-aiact-org-name") ?? ""

  // Best-effort state read for counters + recent events.
  let pending = { findings: 0, dsar: 0, breach: 0, approvals: 0 }
  let recent: Array<{ id: string; createdAtISO: string; message: string; type: string }> = []
  try {
    const state = await readState()
    pending = {
      findings:
        state.findings?.filter(
          (f) => f.findingStatus === "open" || f.findingStatus === "confirmed"
        ).length ?? 0,
      dsar:
        state.dsarRequests?.filter(
          (r) =>
            r.status === "received" ||
            r.status === "in_progress" ||
            r.status === "awaiting_verification"
        ).length ?? 0,
      breach:
        state.breachRecords?.filter(
          (b) => b.status !== "closed" && b.status !== "no_notification_required"
        ).length ?? 0,
      approvals:
        state.approvalRequests?.filter((a) => a.status === "pending").length ?? 0,
    }
    recent = (state.events ?? [])
      .slice(-5)
      .reverse()
      .map((e) => ({ id: e.id, createdAtISO: e.createdAtISO, message: e.message, type: e.type }))
  } catch {
    // swallow — empty defaults are safe
  }

  const actions = nextActionsFor(workspaceMode)
  const greeting = ROLE_GREETING[workspaceMode]

  return (
    <div style={{ padding: "32px 32px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <header style={{ marginBottom: "24px" }}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display-v3)",
            fontSize: "26px",
            fontWeight: 600,
            color: "var(--ink)",
            letterSpacing: "-0.02em",
          }}
        >
          {greeting.title}
          {orgName ? <span style={{ color: "var(--ink-muted)" }}>, {orgName}</span> : null}
        </h1>
        <div style={{ fontSize: "14px", color: "var(--ink-dim)", marginTop: "6px" }}>
          {greeting.subtitle}
        </div>
      </header>

      {/* Pending counters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "28px",
        }}
      >
        <CounterCard
          label="De rezolvat"
          count={pending.findings}
          href="/dashboard/resolve"
          accent="amber"
        />
        {workspaceMode !== "ai-builder" && (
          <CounterCard
            label="DSAR în curs"
            count={pending.dsar}
            href="/dashboard/dsar"
            accent="cobalt"
          />
        )}
        {workspaceMode === "cabinet" && (
          <CounterCard
            label="Incidente date"
            count={pending.breach}
            href="/dashboard/breach"
            accent="red"
          />
        )}
        {workspaceMode === "cabinet" && (
          <CounterCard
            label="Aprobări pending"
            count={pending.approvals}
            href="/dashboard/approvals"
            accent="cobalt"
          />
        )}
      </div>

      {/* Next actions */}
      <section style={{ marginBottom: "32px" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-subtle)",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Următorii 3 pași
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {actions.map((a) => {
            const Icon = CARD_ICONS[a.iconName]
            return (
              <Link
                key={a.href + a.title}
                href={a.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "18px 20px",
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: "var(--ink)",
                  transition: "border-color 120ms, background 120ms",
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
                  }}
                >
                  <Icon size={16} />
                </div>
                <div style={{ fontSize: "14.5px", fontWeight: 600 }}>{a.title}</div>
                <div style={{ fontSize: "12.5px", color: "var(--ink-muted)", lineHeight: 1.5 }}>
                  {a.subtitle}
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <h2
          style={{
            margin: 0,
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--ink-subtle)",
            fontWeight: 600,
            marginBottom: "12px",
          }}
        >
          Activitate recentă
        </h2>
        {recent.length === 0 ? (
          <div
            style={{
              padding: "20px 18px",
              background: "var(--bg-elev)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "10px",
              fontSize: "13px",
              color: "var(--ink-dim)",
            }}
          >
            Niciun eveniment înregistrat încă. Pe măsură ce adaugi sisteme, training-uri și
            rapoarte, ele apar aici.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {recent.map((e) => (
              <div
                key={e.id}
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  fontSize: "13px",
                  color: "var(--ink)",
                }}
              >
                <span
                  style={{
                    fontSize: "10.5px",
                    color: "var(--ink-dim)",
                    fontFamily: "var(--font-mono, monospace)",
                    flexShrink: 0,
                  }}
                >
                  {new Date(e.createdAtISO).toLocaleString("ro-RO", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span style={{ flex: 1, color: "var(--ink-muted)" }}>{e.message}</span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--cobalt-400)",
                    background: "var(--cobalt-soft)",
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {e.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CounterCard({
  label,
  count,
  href,
  accent,
}: {
  label: string
  count: number
  href: string
  accent: "amber" | "cobalt" | "red"
}) {
  const color =
    accent === "amber"
      ? "var(--amber-400)"
      : accent === "red"
        ? "var(--red-400)"
        : "var(--cobalt-400)"
  const bg =
    accent === "amber"
      ? "var(--amber-soft)"
      : accent === "red"
        ? "var(--red-soft)"
        : "var(--cobalt-soft)"
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "14px 16px",
        background: "var(--bg-raised)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        textDecoration: "none",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--ink-subtle)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <span style={{ fontSize: "26px", fontWeight: 600, color: count > 0 ? color : "var(--ink-muted)" }}>
          {count}
        </span>
        {count > 0 && (
          <span
            style={{
              fontSize: "11px",
              padding: "2px 7px",
              borderRadius: "999px",
              background: bg,
              color,
              fontWeight: 500,
            }}
          >
            atenție
          </span>
        )}
      </div>
    </Link>
  )
}
