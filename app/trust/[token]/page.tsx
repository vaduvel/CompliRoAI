/**
 * Sprint 013 — Public Trust Center page (no auth)
 *
 * Fetch-uri profile via /api/trust-center/[token]. Server Component pure ca
 * să fie indexat + SEO friendly. White-label aplicat (logo, colors din
 * branding). NU expune PII, NU listează findings/breach/vendor details.
 *
 * Route: /trust/<token>
 */

import Link from "next/link"
import { notFound } from "next/navigation"
import { headers } from "next/headers"

import type { TrustCenterPublicProfile } from "@/lib/compliance/types"

export const dynamic = "force-dynamic"

type FetchResult =
  | { ok: true; profile: TrustCenterPublicProfile; label: string }
  | { ok: false; status: number; error: string }

async function fetchProfile(token: string): Promise<FetchResult> {
  const h = await headers()
  // Build absolute origin (necessary for fetch în server component).
  const proto = h.get("x-forwarded-proto") ?? "http"
  const host = h.get("host") ?? "localhost:3000"
  const url = `${proto}://${host}/api/trust-center/${encodeURIComponent(token)}`
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, status: res.status, error: body.error ?? "Eroare necunoscută" }
    }
    const json = (await res.json()) as { profile: TrustCenterPublicProfile; label: string }
    return { ok: true, profile: json.profile, label: json.label }
  } catch (err) {
    return { ok: false, status: 500, error: err instanceof Error ? err.message : "fetch failed" }
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

const FRAMEWORK_LABEL: Record<string, string> = {
  AI_ACT: "Regulament (UE) 2024/1689 — EU AI Act",
  GDPR: "Regulament (UE) 2016/679 — GDPR",
  DORA: "Regulament (UE) 2022/2554 — DORA",
  NIS2: "Directiva (UE) 2022/2555 — NIS2",
}

const ROLE_LABEL_RO: Record<string, string> = {
  provider: "Furnizor (Provider)",
  deployer: "Implementator (Deployer)",
  importer: "Importator",
  distributor: "Distribuitor",
  manufacturer: "Producător",
  mixed: "Roluri multiple",
  exempt: "În afara scopului",
  unknown: "Nedeclarat",
}

export default async function TrustCenterPublicPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await fetchProfile(token)
  if (!result.ok) {
    if (result.status === 404 || result.status === 410) {
      notFound()
    }
    return (
      <main
        style={{
          minHeight: "100dvh",
          padding: 60,
          textAlign: "center",
          fontFamily: "var(--font-body-v3)",
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      >
        <h1>Eroare</h1>
        <p>{result.error}</p>
      </main>
    )
  }

  const { profile } = result
  const primaryColor = profile.brandingColor ?? "#3b5bdb"
  const secondaryColor = profile.brandingSecondaryColor ?? "#0ea5e9"

  return (
    <main
      style={{
        background: "var(--bg)",
        minHeight: "100dvh",
        fontFamily: "var(--font-body-v3)",
        color: "var(--ink)",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          color: "white",
          padding: "56px 24px 64px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto" }}>
          {profile.brandingLogoUrl && (
            <img
              src={profile.brandingLogoUrl}
              alt={profile.orgName}
              style={{ maxHeight: 56, marginBottom: 16, objectFit: "contain" }}
            />
          )}
          <div
            style={{
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              fontFamily: "var(--font-mono-v3)",
              opacity: 0.9,
              marginBottom: 6,
            }}
          >
            AI Compliance Status
          </div>
          <h1
            style={{
              fontSize: 38,
              margin: "0 0 12px",
              fontFamily: "var(--font-display-v3)",
              fontWeight: 750,
              letterSpacing: "-0.035em",
            }}
          >
            {profile.orgName}
          </h1>
          <p
            style={{
              fontSize: 15,
              opacity: 0.95,
              maxWidth: 640,
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            Pagină publică verificabilă cu postura de compliance pentru EU AI Act, GDPR și frameworks aplicabile.
            Datele de mai jos sunt generate automat din evidența criptografic semnată a organizației — fără PII, fără
            detalii sensibile.
          </p>
          <div style={{ fontSize: 11, marginTop: 18, opacity: 0.85 }}>
            Generat: {formatDate(profile.generatedAtISO)} · powered by CompliRoAI
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 920, margin: "-32px auto 0", padding: "0 24px 48px" }}>
        {/* Frameworks */}
        <section style={cardStyle}>
          <SectionTitle title="Frameworks în scop" color={primaryColor} />
          {profile.frameworksInScope.length === 0 ? (
            <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>Nicio reglementare declarată încă.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {profile.frameworksInScope.map((f) => (
                <span
                  key={f}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 99,
                    background: `${primaryColor}11`,
                    color: primaryColor,
                    border: `1px solid ${primaryColor}33`,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {FRAMEWORK_LABEL[f] ?? f}
                </span>
              ))}
            </div>
          )}
          {(profile.doraEntityType || profile.nis2EntityClass) && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--ink-muted)" }}>
              {profile.doraEntityType && (
                <div>
                  <strong>DORA:</strong> {profile.doraEntityType}
                </div>
              )}
              {profile.nis2EntityClass && (
                <div>
                  <strong>NIS2:</strong> {profile.nis2EntityClass}
                </div>
              )}
            </div>
          )}
        </section>

        {/* AI Act role */}
        <section style={cardStyle}>
          <SectionTitle title="Rol în lanțul AI" color={primaryColor} />
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                background: `${secondaryColor}15`,
                color: secondaryColor,
                fontSize: 15,
                fontWeight: 600,
                border: `1px solid ${secondaryColor}33`,
              }}
            >
              {ROLE_LABEL_RO[profile.aiActRole ?? "unknown"] ?? profile.aiActRole}
            </div>
            {profile.roleDeterminedAtISO && (
              <div style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                determinat {formatDate(profile.roleDeterminedAtISO)}
              </div>
            )}
          </div>
        </section>

        {/* Stats grid */}
        <section style={cardStyle}>
          <SectionTitle title="Indicatori de conformitate" color={primaryColor} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <StatBox label="Sisteme AI inventariate" value={profile.stats.aiSystemsCount} accent={primaryColor} />
            <StatBox label="Sisteme high-risk" value={profile.stats.highRiskSystemsCount} accent="#f97316" />
            <StatBox label="Findings deschise" value={profile.stats.findingsOpen} accent="#f59e0b" />
            <StatBox label="Findings rezolvate" value={profile.stats.findingsResolved} accent="#10b981" />
            <StatBox label="Findings critice" value={profile.stats.findingsCritical} accent="#dc2626" />
            <StatBox label="DPIA finalizate" value={profile.stats.dpiaCompletedCount} accent={primaryColor} />
            <StatBox label="Activități RoPA" value={profile.stats.ropaActivitiesCount} accent={secondaryColor} />
            <StatBox label="Incidente închise" value={profile.stats.breachesClosedCount} accent="#10b981" />
            <StatBox label="Incidente în lucru" value={profile.stats.breachesPendingCount} accent="#f59e0b" />
            <StatBox label="Vendori aprobați" value={profile.stats.vendorsApprovedCount} accent="#10b981" />
            <StatBox
              label="Notificări transparență Art. 50"
              value={profile.stats.transparencyNoticesImplementedCount}
              accent={primaryColor}
            />
            <StatBox label="AI Literacy (Art. 4)" value={profile.stats.literacyRecordsCount} accent={secondaryColor} />
          </div>
        </section>

        {/* Audit pack */}
        {profile.latestAuditPack && (
          <section style={cardStyle}>
            <SectionTitle title="Ultimul Audit Pack" color={primaryColor} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "var(--ink)" }}>
              <div>
                <strong>Generat:</strong> {formatDate(profile.latestAuditPack.generatedAtISO)}
              </div>
              <div>
                <strong>Documente:</strong> {profile.latestAuditPack.contentsCount}
              </div>
              <div style={{ wordBreak: "break-all" }}>
                <strong>Hash root SHA-256:</strong>{" "}
                <code style={{ fontSize: 12, background: "var(--surface-2)", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-mono-v3)" }}>
                  {profile.latestAuditPack.hashRoot}
                </code>
              </div>
              <div style={{ marginTop: 8 }}>
                <Link
                  href="/verify-pack"
                  style={{
                    color: primaryColor,
                    textDecoration: "underline",
                    fontSize: 13,
                  }}
                >
                  Verifică criptografic acest hash →
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Attestations */}
        {profile.attestations.length > 0 && (
          <section style={cardStyle}>
            <SectionTitle title="Atestări de conformitate" color={primaryColor} />
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {profile.attestations.map((a, i) => (
                <li
                  key={i}
                  style={{
                    paddingLeft: 16,
                    borderLeft: `3px solid ${primaryColor}`,
                  }}
                >
                  <div style={{ fontSize: 14, color: "var(--ink)", fontWeight: 650 }}>{a.label}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 3 }}>
                    {a.legalReference} · confirmat {formatDate(a.confirmedAtISO)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Footer */}
        <footer
          style={{
            marginTop: 32,
            padding: "20px 0",
            borderTop: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--ink-dim)",
            textAlign: "center",
          }}
        >
          Generat {formatDate(profile.generatedAtISO)} ·{" "}
          <strong>Verificat criptografic via CompliRoAI</strong>
          {profile.brandingFooter && (
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ink-subtle)" }}>{profile.brandingFooter}</div>
          )}
          <div style={{ marginTop: 12 }}>
            <Link href="/verify-pack" style={{ color: "var(--cobalt-700)", textDecoration: "underline" }}>
              Verifică hash root audit pack
            </Link>
            <span style={{ margin: "0 8px" }}>·</span>
            <a href="https://compliroai.com" style={{ color: "var(--cobalt-700)", textDecoration: "underline" }}>
              Despre CompliRoAI
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return (
    <h2
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        fontFamily: "var(--font-mono-v3)",
        color,
        margin: "0 0 14px",
        fontWeight: 760,
      }}
    >
      {title}
    </h2>
  )
}

function StatBox({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div
      style={{
        background: "var(--surface-0)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ fontSize: 11, color: "var(--ink-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-mono-v3)" }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontFamily: "var(--font-display-v3)", fontWeight: 750, color: accent, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface-0)",
  border: "1px solid var(--border)",
  borderRadius: "var(--r-xl)",
  padding: "22px 26px",
  marginTop: 16,
  boxShadow: "var(--shadow-sm)",
}
