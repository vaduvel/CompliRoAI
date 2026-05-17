"use client"

/**
 * Sprint 012 — /dashboard/ai-regulatory-scope
 *
 * Pagină overview AI sub DORA + NIS2. Read-only (singura mutație = profil
 * regulator self-declaration via modal). NU duplică vendor-review sau AI
 * inventory; doar agregă subset-ul AI-relevant cu link-uri către surface-
 * urile primare.
 *
 * Secțiuni:
 *  1. Header + summary stats
 *  2. Profil regulator org (read + edit)
 *  3. Vendori DORA-material (dacă doraApplies)
 *  4. AI systems NIS2-scoped (dacă nis2 != not_in_scope)
 *  5. Findings DORA / NIS2 recente
 *  6. Playbook expandabil ("când se aplică?")
 *
 * Style: inline + v3 tokens. Lucide-react icons.
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit,
  ExternalLink,
  FileText,
  Landmark,
  ShieldAlert,
  X,
} from "lucide-react"

import type {
  DoraEntityType,
  Nis2EntityClass,
  Nis2Sector,
  OrgRegulatoryProfile,
} from "@/lib/compliance/types"
import type {
  RegulatoryScopeSummary,
  ScopedAISystem,
  ScopedVendor,
} from "@/lib/compliance/ai-regulatory-scope"

// ── Labels (RO) ──────────────────────────────────────────────────────────────

const DORA_LABELS: Record<DoraEntityType, string> = {
  credit_institution: "Instituție de credit (bancă)",
  payment_institution: "Instituție de plată (PSP)",
  emi: "Instituție monedă electronică (EMI)",
  investment_firm: "Societate servicii de investiții (SSIF)",
  insurance: "Societate asigurare",
  ucits_aifm: "Administrator fond (UCITS / AIFM)",
  crowdfunding: "Platformă crowdfunding",
  crypto_casp: "Furnizor servicii crypto (CASP)",
  ict_third_party: "Furnizor critic ICT terță parte",
  not_applicable: "Neaplicabil",
}

const NIS2_CLASS_LABELS: Record<Nis2EntityClass, string> = {
  essential: "Entitate esențială (Anexa I)",
  important: "Entitate importantă (Anexa II)",
  not_in_scope: "Neaplicabil",
}

const NIS2_SECTOR_LABELS: Record<Nis2Sector, string> = {
  energy: "Energie",
  transport: "Transport",
  banking: "Banking",
  financial_markets: "Piețe financiare",
  health: "Sănătate",
  drinking_water: "Apă potabilă",
  waste_water: "Apă uzată",
  digital_infrastructure: "Infrastructură digitală",
  ict_service_management: "Servicii ICT management",
  public_administration: "Administrație publică",
  space: "Spațiu",
  postal_courier: "Poștă / curier",
  waste_management: "Deșeuri",
  chemicals: "Substanțe chimice",
  food: "Alimentație",
  manufacturing: "Producție",
  digital_providers: "Furnizori digitali",
  research: "Cercetare",
  not_applicable: "Neaplicabil",
}

const SEVERITY_COLORS: Record<
  "low" | "medium" | "high" | "critical",
  { bg: string; fg: string; label: string }
> = {
  low: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8", label: "low" },
  medium: { bg: "rgba(251,191,36,0.18)", fg: "#fbbf24", label: "medium" },
  high: { bg: "rgba(251,146,60,0.20)", fg: "#fb923c", label: "high" },
  critical: { bg: "rgba(248,113,113,0.22)", fg: "#f87171", label: "critical" },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" | "critical" }) {
  const s = SEVERITY_COLORS[severity]
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: "10px",
        fontSize: "11px",
        fontWeight: 600,
        background: s.bg,
        color: s.fg,
        textTransform: "uppercase",
        letterSpacing: "0.02em",
      }}
    >
      {s.label}
    </span>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AiRegulatoryScopePage() {
  const [summary, setSummary] = useState<RegulatoryScopeSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [playbookOpen, setPlaybookOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/ai-regulatory-scope")
      if (!res.ok) {
        setError("Nu am putut citi profilul regulator.")
      } else {
        const data = (await res.json()) as RegulatoryScopeSummary
        setSummary(data)
      }
    } catch {
      setError("Eroare de rețea.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const profile = summary?.profile ?? null
  const isDora = profile?.doraApplies === true
  const isNis2 =
    profile && profile.nis2EntityClass !== "not_in_scope" ? true : false

  return (
    <div
      style={{
        padding: "32px",
        maxWidth: "1080px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display-v3)",
            fontSize: "22px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: 0,
          }}
        >
          AI sub DORA + NIS2
        </h1>
        <p style={{ marginTop: "6px", fontSize: "13px", color: "var(--ink-dim)" }}>
          Scope și incidente AI pentru entitățile financiare (DORA) și entitățile esențiale/importante (NIS2). Doar slice AI-relevant — module pure DORA/NIS2 nu sunt incluse în CompliRoAI.
        </p>
      </div>

      {/* ── Loading / Error ─────────────────────────────────────────────── */}
      {loading && (
        <div style={{ color: "var(--ink-dim)", fontSize: "13px" }}>Se încarcă…</div>
      )}
      {error && (
        <div
          style={{
            color: "#f87171",
            background: "rgba(248,113,113,0.10)",
            padding: "10px 14px",
            borderRadius: "6px",
            border: "1px solid rgba(248,113,113,0.25)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {!loading && summary && (
        <>
          {/* ── Stats ─────────────────────────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            <StatCard
              icon={<Landmark size={16} />}
              label="Vendori DORA"
              value={summary.stats.doraVendorCount}
              hint={`${summary.stats.doraVendorOpenGaps} gap${summary.stats.doraVendorOpenGaps === 1 ? "" : "uri"} deschise`}
            />
            <StatCard
              icon={<Building size={16} />}
              label="Sisteme NIS2"
              value={summary.stats.nis2SystemCount}
              hint={`${summary.stats.nis2SystemOpenGaps} gap${summary.stats.nis2SystemOpenGaps === 1 ? "" : "uri"} deschise`}
            />
            <StatCard
              icon={<ShieldAlert size={16} />}
              label="Findings DORA"
              value={summary.stats.doraFindingsOpen}
              hint="deschise"
            />
            <StatCard
              icon={<ShieldAlert size={16} />}
              label="Findings NIS2"
              value={summary.stats.nis2FindingsOpen}
              hint="deschise"
            />
          </div>

          {/* ── Section 1: Org profile ──────────────────────────────────── */}
          <section style={sectionStyle}>
            <SectionHeader
              icon={<Landmark size={16} />}
              title="Profil regulator organizație"
              action={
                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  style={editButtonStyle}
                >
                  <Edit size={13} />
                  {profile ? "Editează" : "Declară"}
                </button>
              }
            />
            {!profile && (
              <div style={emptyStateStyle}>
                Nu ai declarat încă profilul regulator. Apasă <strong>Declară</strong> pentru a indica dacă orgul intră în scope DORA și/sau NIS2.
              </div>
            )}
            {profile && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <ProfileCard
                  title="DORA"
                  status={profile.doraApplies ? "active" : "inactive"}
                  rows={[
                    {
                      label: "Aplicabil",
                      value: profile.doraApplies ? "Da" : "Nu",
                    },
                    {
                      label: "Tip entitate",
                      value: DORA_LABELS[profile.doraEntityType],
                    },
                    profile.doraEntityRegistrationNumber
                      ? {
                          label: "Nr. înregistrare",
                          value: profile.doraEntityRegistrationNumber,
                        }
                      : null,
                  ]}
                />
                <ProfileCard
                  title="NIS2"
                  status={
                    profile.nis2EntityClass === "not_in_scope" ? "inactive" : "active"
                  }
                  rows={[
                    {
                      label: "Clasă",
                      value: NIS2_CLASS_LABELS[profile.nis2EntityClass],
                    },
                    {
                      label: "Sectoare",
                      value:
                        profile.nis2Sectors.length > 0
                          ? profile.nis2Sectors.map((s) => NIS2_SECTOR_LABELS[s]).join(", ")
                          : "—",
                    },
                    profile.nis2DnscRegistrationNumber
                      ? {
                          label: "Nr. DNSC",
                          value: profile.nis2DnscRegistrationNumber,
                        }
                      : null,
                  ]}
                />
              </div>
            )}
            {profile?.notes && (
              <div
                style={{
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--ink-muted)",
                }}
              >
                <strong style={{ color: "var(--ink-dim)" }}>Note:</strong> {profile.notes}
              </div>
            )}
          </section>

          {/* ── Section 2: DORA vendors ─────────────────────────────────── */}
          {isDora && (
            <section style={sectionStyle}>
              <SectionHeader
                icon={<Landmark size={16} />}
                title="Vendori DORA-material"
                action={
                  <a href="/dashboard/vendor-review" style={linkButtonStyle}>
                    Vendor Review <ExternalLink size={12} />
                  </a>
                }
              />
              {summary.doraScopedVendors.length === 0 && (
                <div style={emptyStateStyle}>
                  Nu ai marcat încă vendori ca DORA-material. Deschide /dashboard/vendor-review și setează <code>doraScope.material = true</code> pe vendorii ICT care suportă serviciile financiare.
                </div>
              )}
              {summary.doraScopedVendors.map((sv) => (
                <DoraVendorRow key={sv.vendor.id} sv={sv} />
              ))}
            </section>
          )}

          {/* ── Section 3: NIS2 AI systems ──────────────────────────────── */}
          {isNis2 && (
            <section style={sectionStyle}>
              <SectionHeader
                icon={<Building size={16} />}
                title="Sisteme AI în scope NIS2"
                action={
                  <a href="/dashboard/sisteme" style={linkButtonStyle}>
                    AI Inventory <ExternalLink size={12} />
                  </a>
                }
              />
              {summary.nis2ScopedSystems.length === 0 && (
                <div style={emptyStateStyle}>
                  Nu ai marcat încă sisteme AI ca NIS2-scoped. Deschide /dashboard/sisteme și setează <code>nis2EntityScope.inScope = true</code> pe sistemele care susțin serviciul esențial/important.
                </div>
              )}
              {summary.nis2ScopedSystems.map((ss) => (
                <Nis2SystemRow key={ss.system.id} ss={ss} />
              ))}
            </section>
          )}

          {/* ── Section 4: Recent findings ──────────────────────────────── */}
          {summary.recentFindings.length > 0 && (
            <section style={sectionStyle}>
              <SectionHeader
                icon={<ShieldAlert size={16} />}
                title={`Findings recente (${summary.recentFindings.length})`}
                action={
                  <a href="/dashboard/resolve" style={linkButtonStyle}>
                    Toate findings <ExternalLink size={12} />
                  </a>
                }
              />
              {summary.recentFindings.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "10px 12px",
                    background: "var(--bg-subtle)",
                    borderRadius: "6px",
                    marginBottom: "8px",
                    border: "1px solid var(--border-soft)",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "var(--ink)",
                        marginBottom: "3px",
                      }}
                    >
                      {f.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--ink-dim)" }}>
                      {f.legalReference ?? "—"} ·{" "}
                      {new Date(f.createdAtISO).toLocaleString("ro-RO", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <SeverityBadge severity={f.severity} />
                  <a
                    href={`/dashboard/resolve`}
                    style={{
                      color: "var(--ink-dim)",
                      textDecoration: "none",
                      fontSize: "11px",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Rezolvă <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </section>
          )}

          {/* ── Section 5: Playbook ──────────────────────────────────── */}
          <section style={sectionStyle}>
            <button
              type="button"
              onClick={() => setPlaybookOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--ink)",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={16} />
                Când se aplică DORA și NIS2?
              </span>
              {playbookOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {playbookOpen && (
              <div
                style={{
                  marginTop: "14px",
                  fontSize: "13px",
                  color: "var(--ink-muted)",
                  lineHeight: 1.6,
                }}
              >
                <h3 style={subheaderStyle}>DORA — Reg (UE) 2022/2554</h3>
                <p>
                  Se aplică din 17 ianuarie 2025 entităților financiare reglementate: instituții de credit, instituții de plată, EMI, SSIF, asigurători, administratori fonduri (UCITS/AIFM), platforme crowdfunding, furnizori servicii crypto (CASP), precum și furnizorilor critici ICT terță parte.
                </p>
                <h3 style={subheaderStyle}>NIS2 — Dir (UE) 2022/2555 (OUG 155/2024 RO)</h3>
                <p>
                  Se aplică entităților esențiale (Anexa I) și entităților importante (Anexa II) care depășesc pragul de 50 angajați sau 10M EUR cifră de afaceri (cu excepții). Sectoarele includ: energie, transport, banking, sănătate, infrastructură digitală (cloud, DNS, data centers), servicii ICT management, administrație publică, manufacturing critic etc.
                </p>
                <h3 style={subheaderStyle}>De ce un slice AI?</h3>
                <p>
                  CompliRoAI nu înlocuiește un produs DORA / NIS2 complet. Slice-ul AI acoperă obligațiile incidente când un sistem AI sau un vendor AI este material pentru un serviciu reglementat. Pentru cyber posture full sau registru DNSC complet, folosește un produs dedicat.
                </p>
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Edit profile modal ────────────────────────────────────────── */}
      {showProfileModal && (
        <ProfileModal
          initial={profile}
          onClose={() => setShowProfileModal(false)}
          onSaved={async () => {
            setShowProfileModal(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: number
  hint: string
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-subtle)",
        borderRadius: "8px",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          color: "var(--ink-dim)",
          fontSize: "11px",
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "8px",
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontSize: "24px",
          fontWeight: 600,
          color: "var(--ink)",
          fontFamily: "var(--font-display-v3)",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
        {hint}
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode
  title: string
  action?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}
    >
      <h2
        style={{
          fontSize: "15px",
          fontWeight: 600,
          color: "var(--ink)",
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {icon}
        {title}
      </h2>
      {action}
    </div>
  )
}

function ProfileCard({
  title,
  status,
  rows,
}: {
  title: string
  status: "active" | "inactive"
  rows: Array<{ label: string; value: string } | null>
}) {
  const dotColor = status === "active" ? "#10b981" : "#94a3b8"
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "var(--bg-subtle)",
        borderRadius: "8px",
        border: "1px solid var(--border-soft)",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--ink-dim)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: "10px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dotColor,
            display: "inline-block",
          }}
        />
        {title}
      </div>
      <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
        {rows
          .filter((r): r is { label: string; value: string } => r !== null)
          .map((r) => (
            <div
              key={r.label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
              }}
            >
              <dt style={{ color: "var(--ink-dim)" }}>{r.label}</dt>
              <dd
                style={{
                  color: "var(--ink)",
                  margin: 0,
                  fontWeight: 500,
                  textAlign: "right",
                  maxWidth: "60%",
                }}
              >
                {r.value}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  )
}

function DoraVendorRow({ sv }: { sv: ScopedVendor }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: "var(--bg-subtle)",
        borderRadius: "6px",
        border: "1px solid var(--border-soft)",
        marginBottom: "8px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
          {sv.vendor.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
          {sv.vendor.doraScope?.criticalForService
            ? `Suportă: ${sv.vendor.doraScope.criticalForService}`
            : sv.vendor.serviceCategory}
          {" · "}
          DPA: {sv.vendor.dpaStatus}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {sv.gapCount > 0 ? (
          <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            {sv.gapCount} gap{sv.gapCount === 1 ? "" : "uri"}
          </span>
        ) : (
          <CheckCircle2 size={14} color="#10b981" />
        )}
        <SeverityBadge severity={sv.highestSeverity} />
        <a
          href="/dashboard/vendor-review"
          style={{
            color: "var(--ink-dim)",
            textDecoration: "none",
            fontSize: "11px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          Detalii <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

function Nis2SystemRow({ ss }: { ss: ScopedAISystem }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        background: "var(--bg-subtle)",
        borderRadius: "6px",
        border: "1px solid var(--border-soft)",
        marginBottom: "8px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
          {ss.system.name}
        </div>
        <div style={{ fontSize: "11px", color: "var(--ink-dim)", marginTop: "2px" }}>
          {ss.system.nis2EntityScope?.service
            ? `Serviciu: ${ss.system.nis2EntityScope.service}`
            : ss.system.purpose}
          {" · "}
          Vendor: {ss.system.vendor || "—"}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {ss.gapCount > 0 ? (
          <span style={{ fontSize: "12px", color: "var(--ink-dim)" }}>
            {ss.gapCount} gap{ss.gapCount === 1 ? "" : "uri"}
          </span>
        ) : (
          <CheckCircle2 size={14} color="#10b981" />
        )}
        <SeverityBadge severity={ss.highestSeverity} />
        <a
          href="/dashboard/sisteme"
          style={{
            color: "var(--ink-dim)",
            textDecoration: "none",
            fontSize: "11px",
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          Detalii <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

// ── Profile modal ───────────────────────────────────────────────────────────

const ALL_NIS2_SECTORS: Nis2Sector[] = [
  "energy",
  "transport",
  "banking",
  "financial_markets",
  "health",
  "drinking_water",
  "waste_water",
  "digital_infrastructure",
  "ict_service_management",
  "public_administration",
  "space",
  "postal_courier",
  "waste_management",
  "chemicals",
  "food",
  "manufacturing",
  "digital_providers",
  "research",
]

const ALL_DORA_TYPES: DoraEntityType[] = [
  "credit_institution",
  "payment_institution",
  "emi",
  "investment_firm",
  "insurance",
  "ucits_aifm",
  "crowdfunding",
  "crypto_casp",
  "ict_third_party",
  "not_applicable",
]

function ProfileModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: OrgRegulatoryProfile | null
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [doraApplies, setDoraApplies] = useState(initial?.doraApplies ?? false)
  const [doraEntityType, setDoraEntityType] = useState<DoraEntityType>(
    initial?.doraEntityType ?? "not_applicable",
  )
  const [doraReg, setDoraReg] = useState(initial?.doraEntityRegistrationNumber ?? "")
  const [nis2EntityClass, setNis2EntityClass] = useState<Nis2EntityClass>(
    initial?.nis2EntityClass ?? "not_in_scope",
  )
  const [sectors, setSectors] = useState<Nis2Sector[]>(initial?.nis2Sectors ?? [])
  const [dnscReg, setDnscReg] = useState(initial?.nis2DnscRegistrationNumber ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canSelectDoraType = useMemo(() => doraApplies, [doraApplies])
  const canSelectSectors = useMemo(
    () => nis2EntityClass !== "not_in_scope",
    [nis2EntityClass],
  )

  function toggleSector(s: Nis2Sector) {
    setSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-regulatory-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doraApplies,
          doraEntityType: doraApplies ? doraEntityType : "not_applicable",
          doraEntityRegistrationNumber: doraReg || undefined,
          nis2EntityClass,
          nis2Sectors: nis2EntityClass !== "not_in_scope" ? sectors : [],
          nis2DnscRegistrationNumber: dnscReg || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        setErr("Nu am putut salva profilul.")
      } else {
        await onSaved()
      }
    } catch {
      setErr("Eroare de rețea.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-label="Editează profil regulator"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          borderRadius: "10px",
          maxWidth: "640px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-soft)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
            Profil regulator organizație
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-dim)",
            }}
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}
        >
          {/* DORA block */}
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>DORA — Reg (UE) 2022/2554</legend>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={doraApplies}
                onChange={(e) => setDoraApplies(e.target.checked)}
              />
              <span>DORA se aplică organizației</span>
            </label>
            {canSelectDoraType && (
              <>
                <label style={fieldLabelStyle}>Tip entitate DORA</label>
                <select
                  value={doraEntityType}
                  onChange={(e) => setDoraEntityType(e.target.value as DoraEntityType)}
                  style={inputStyle}
                >
                  {ALL_DORA_TYPES.filter((t) => t !== "not_applicable").map((t) => (
                    <option key={t} value={t}>
                      {DORA_LABELS[t]}
                    </option>
                  ))}
                </select>
                <label style={fieldLabelStyle}>Nr. înregistrare BNR / ASF (opțional)</label>
                <input
                  type="text"
                  value={doraReg}
                  onChange={(e) => setDoraReg(e.target.value)}
                  placeholder="ex. BNR-1234"
                  style={inputStyle}
                />
              </>
            )}
          </fieldset>

          {/* NIS2 block */}
          <fieldset style={fieldsetStyle}>
            <legend style={legendStyle}>NIS2 — Dir (UE) 2022/2555 / OUG 155/2024</legend>
            <label style={fieldLabelStyle}>Clasă entitate NIS2</label>
            <select
              value={nis2EntityClass}
              onChange={(e) => setNis2EntityClass(e.target.value as Nis2EntityClass)}
              style={inputStyle}
            >
              <option value="not_in_scope">Neaplicabil</option>
              <option value="important">Importantă (Anexa II)</option>
              <option value="essential">Esențială (Anexa I)</option>
            </select>
            {canSelectSectors && (
              <>
                <label style={fieldLabelStyle}>Sectoare (selectează cel puțin unul)</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "6px",
                  }}
                >
                  {ALL_NIS2_SECTORS.map((s) => (
                    <label key={s} style={checkboxLabelStyle}>
                      <input
                        type="checkbox"
                        checked={sectors.includes(s)}
                        onChange={() => toggleSector(s)}
                      />
                      <span style={{ fontSize: "12px" }}>{NIS2_SECTOR_LABELS[s]}</span>
                    </label>
                  ))}
                </div>
                <label style={fieldLabelStyle}>Nr. înregistrare DNSC (opțional)</label>
                <input
                  type="text"
                  value={dnscReg}
                  onChange={(e) => setDnscReg(e.target.value)}
                  placeholder="ex. DNSC-RO-5678"
                  style={inputStyle}
                />
              </>
            )}
          </fieldset>

          {/* Notes */}
          <label style={fieldLabelStyle}>Note interne (opțional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex. evaluare consultant juridic XYZ, observații pe overlap DORA/NIS2."
            style={{ ...inputStyle, fontFamily: "inherit", resize: "vertical" }}
          />

          {err && (
            <div
              style={{
                fontSize: "12px",
                color: "#f87171",
                padding: "6px 10px",
                background: "rgba(248,113,113,0.10)",
                borderRadius: "4px",
              }}
            >
              {err}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "flex-end",
              paddingTop: "8px",
              borderTop: "1px solid var(--border-soft)",
            }}
          >
            <button type="button" onClick={onClose} style={ghostButtonStyle}>
              Anulează
            </button>
            <button type="submit" disabled={saving} style={primaryButtonStyle}>
              {saving ? "Se salvează…" : "Salvează"}
            </button>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--ink-dim)",
              padding: "8px 10px",
              borderLeft: "3px solid var(--accent, #60a5fa)",
              background: "rgba(96,165,250,0.05)",
            }}
          >
            <AlertTriangle size={11} style={{ verticalAlign: "middle", marginRight: "4px" }} />
            Self-declaration. CompliRoAI nu garantează încadrarea juridică — verifică cu un consultant pentru DORA/NIS2 applicability.
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: "18px 20px",
  background: "var(--bg-card, var(--bg-sidebar, #0f172a))",
  borderRadius: "10px",
  border: "1px solid var(--border)",
}

const emptyStateStyle: React.CSSProperties = {
  padding: "16px 18px",
  background: "var(--bg-subtle)",
  borderRadius: "6px",
  border: "1px dashed var(--border-soft)",
  fontSize: "12px",
  color: "var(--ink-muted)",
  lineHeight: 1.5,
}

const editButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  fontSize: "12px",
  fontWeight: 500,
  background: "var(--bg-subtle)",
  color: "var(--ink)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  cursor: "pointer",
}

const linkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "12px",
  color: "var(--ink-dim)",
  textDecoration: "none",
}

const subheaderStyle: React.CSSProperties = {
  marginTop: "12px",
  marginBottom: "4px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--ink)",
}

const fieldsetStyle: React.CSSProperties = {
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  padding: "12px 14px",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
}

const legendStyle: React.CSSProperties = {
  padding: "0 6px",
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--ink-dim)",
}

const fieldLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "var(--ink-dim)",
  fontWeight: 500,
  marginTop: "4px",
}

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  cursor: "pointer",
  fontSize: "13px",
  color: "var(--ink)",
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  fontSize: "13px",
  background: "var(--bg-subtle)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  color: "var(--ink)",
}

const primaryButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 500,
  background: "var(--accent, #60a5fa)",
  color: "var(--ink-on-accent, #0f172a)",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
}

const ghostButtonStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: "13px",
  fontWeight: 500,
  background: "transparent",
  color: "var(--ink-dim)",
  border: "1px solid var(--border-soft)",
  borderRadius: "6px",
  cursor: "pointer",
}
