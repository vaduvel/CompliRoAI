"use client"

/**
 * Sprint 024 — /dashboard/ai-ads — AI Ads & Claims compliance workspace.
 *
 * Tab-uri:
 *   - Campanii          → CRUD + tabel
 *   - Claims Registry   → CRUD + risc live preview
 *   - Creative Approvals → log per campanie + record approval
 *   - Tracking Reviews  → GDPR review per campanie
 *   - Export            → markdown download
 *
 * Mandate § 18.1 — positioning copy verbatim:
 *   "AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă,
 *    cine a aprobat, ce date au fost folosite și ce risc legal există."
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Link2,
  Loader2,
  Megaphone,
  Plus,
  ShieldAlert,
  Sparkles,
  Tag,
  Upload,
  X,
} from "lucide-react"

import type {
  AIAdsCampaign,
  AIAdsCampaignPlatform,
  AIAdsCampaignStatus,
  AIAdsCampaignType,
  AIAdsClaim,
  AIAdsCreativeApproval,
  AIClaimEvidenceStatus,
  AIClaimMisleadingRisk,
  AIClaimType,
  ConversionTrackingMethod,
  ConversionTrackingReview,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Constants
// ────────────────────────────────────────────────────────────────────────────

const PLATFORM_LABELS: Record<AIAdsCampaignPlatform, string> = {
  chatgpt_ads: "ChatGPT Ads",
  meta_ai_ads: "Meta AI Ads",
  google_ai_ads: "Google AI Ads",
  perplexity_sponsored: "Perplexity sponsored",
  anthropic_claude: "Anthropic Claude Ads",
  llm_recommendation_native: "LLM recommendation (organic)",
  ai_generated_creative_meta: "Meta + AI creative",
  ai_generated_creative_google: "Google + AI creative",
  ai_generated_creative_linkedin: "LinkedIn + AI creative",
  other: "Other AI platform",
}

const STATUS_LABELS: Record<AIAdsCampaignStatus, string> = {
  draft: "Schiță",
  in_review: "În review",
  approved: "Aprobată",
  active: "Activă",
  paused: "Pauzată",
  completed: "Finalizată",
  rejected: "Respinsă",
}

const STATUS_COLORS: Record<AIAdsCampaignStatus, { bg: string; fg: string }> = {
  draft: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  in_review: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24" },
  approved: { bg: "rgba(96,165,250,0.16)", fg: "#60a5fa" },
  active: { bg: "rgba(52,211,153,0.16)", fg: "#34d399" },
  paused: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  completed: { bg: "rgba(148,163,184,0.16)", fg: "#94a3b8" },
  rejected: { bg: "rgba(248,113,113,0.16)", fg: "#f87171" },
}

const CAMPAIGN_TYPE_LABELS: Record<AIAdsCampaignType, string> = {
  paid_placement: "Plasament plătit",
  llm_recommendation: "LLM recommendation",
  ai_generated_creative: "Creative AI",
  ai_landing_page: "Landing AI",
  hybrid: "Hybrid",
}

const CLAIM_TYPE_LABELS: Record<AIClaimType, string> = {
  performance_metric: "Performanță",
  price_promise: "Preț",
  guarantee: "Garanție",
  certification: "Certificare",
  comparative: "Comparativ",
  endorsement: "Endorsement",
  compliance_claim: "Claim conformitate",
  outcome_claim: "Rezultat promis",
  other: "Altul",
}

const EVIDENCE_LABELS: Record<AIClaimEvidenceStatus, string> = {
  unsubstantiated: "Nesubstanțiat",
  internal_data: "Date interne",
  third_party_audit: "Audit terț",
  public_record: "Înregistrare publică",
  vendor_attestation: "Declarație vendor",
  needs_review: "Necesită revizie",
  verified: "Verificat",
}

const RISK_COLORS: Record<AIClaimMisleadingRisk, { bg: string; fg: string; label: string }> = {
  low: { bg: "rgba(52,211,153,0.16)", fg: "#34d399", label: "Scăzut" },
  medium: { bg: "rgba(251,191,36,0.16)", fg: "#fbbf24", label: "Mediu" },
  high: { bg: "rgba(249,115,22,0.16)", fg: "#fb923c", label: "Ridicat" },
  critical: { bg: "rgba(248,113,113,0.16)", fg: "#f87171", label: "Critic" },
}

const TRACKING_METHODS: ConversionTrackingMethod[] = [
  "first_party_cookie",
  "third_party_cookie",
  "server_side_tagging",
  "pixel_meta",
  "pixel_google",
  "pixel_linkedin",
  "audience_matching_crm_upload",
  "fingerprinting",
]

const TRACKING_METHOD_LABELS: Record<ConversionTrackingMethod, string> = {
  first_party_cookie: "Cookie 1st-party",
  third_party_cookie: "Cookie 3rd-party",
  server_side_tagging: "Server-side tagging",
  pixel_meta: "Pixel Meta",
  pixel_google: "Pixel Google",
  pixel_linkedin: "Pixel LinkedIn",
  audience_matching_crm_upload: "CRM upload audience",
  fingerprinting: "Fingerprinting",
  none: "Niciuna",
}

type TabKey = "campaigns" | "claims" | "approvals" | "tracking" | "export"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "campaigns", label: "Campanii" },
  { key: "claims", label: "Claims Registry" },
  { key: "approvals", label: "Creative Approvals" },
  { key: "tracking", label: "Tracking Reviews" },
  { key: "export", label: "Export" },
]

// ────────────────────────────────────────────────────────────────────────────
//   Helpers
// ────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ro-RO")
  } catch {
    return iso
  }
}

function previewClaimRisk(
  claimType: AIClaimType,
  evidenceStatus: AIClaimEvidenceStatus,
): AIClaimMisleadingRisk {
  if (
    evidenceStatus === "verified" ||
    evidenceStatus === "third_party_audit" ||
    evidenceStatus === "public_record"
  )
    return "low"
  if (claimType === "compliance_claim") return "high"
  if (
    (claimType === "performance_metric" ||
      claimType === "price_promise" ||
      claimType === "guarantee" ||
      claimType === "outcome_claim" ||
      claimType === "comparative") &&
    (evidenceStatus === "unsubstantiated" || evidenceStatus === "needs_review")
  )
    return "high"
  if (evidenceStatus === "vendor_attestation") return "medium"
  if (evidenceStatus === "internal_data") return "medium"
  if (evidenceStatus === "unsubstantiated" || evidenceStatus === "needs_review")
    return "medium"
  return "low"
}

// ────────────────────────────────────────────────────────────────────────────
//   Data fetching
// ────────────────────────────────────────────────────────────────────────────

type AIAdsResponse = {
  campaigns: AIAdsCampaign[]
  claims: AIAdsClaim[]
  approvals: AIAdsCreativeApproval[]
  trackingReviews: ConversionTrackingReview[]
  summary: {
    totalCampaigns: number
    activeCampaigns: number
    totalClaims: number
    claimsUnsubstantiated: number
    totalApprovals: number
    totalTrackingReviews: number
    pendingTrackingReviews: number
    totalFindings: number
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

export default function AIAdsPage() {
  const [data, setData] = useState<AIAdsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>("campaigns")
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showTrackingModal, setShowTrackingModal] = useState(false)
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [exportLoading, setExportLoading] = useState(false)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/ai-ads/campaigns", { cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as AIAdsResponse
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const summary = data?.summary

  const handleExport = async () => {
    setExportLoading(true)
    try {
      const res = await fetch("/api/ai-ads/export?format=md")
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `ai-ads-pack-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare export")
    } finally {
      setExportLoading(false)
    }
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1280, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <Megaphone size={32} color="#60a5fa" />
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "var(--text-primary, #e2e8f0)",
            margin: 0,
          }}
        >
          AI Ads &amp; Claims
        </h1>
      </div>
      <p
        style={{
          color: "var(--text-secondary, #94a3b8)",
          fontSize: 14,
          marginBottom: 24,
          maxWidth: 820,
          lineHeight: 1.6,
        }}
      >
        AI Ads Compliance Pack: ce afirmă AI-ul despre brand, pe ce sursă, cine a
        aprobat, ce date au fost folosite și ce risc legal există.
      </p>

      {/* Summary bar */}
      {summary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            icon={<Megaphone size={16} />}
            label="Campanii"
            value={`${summary.activeCampaigns}/${summary.totalCampaigns}`}
            hint="active / total"
          />
          <StatCard
            icon={<Tag size={16} />}
            label="Claims"
            value={`${summary.claimsUnsubstantiated}/${summary.totalClaims}`}
            hint="nesubstanțiate / total"
            urgent={summary.claimsUnsubstantiated > 0}
          />
          <StatCard
            icon={<CheckCircle2 size={16} />}
            label="Aprobări creative"
            value={String(summary.totalApprovals)}
            hint="în log"
          />
          <StatCard
            icon={<ShieldAlert size={16} />}
            label="Tracking reviews"
            value={`${summary.pendingTrackingReviews}/${summary.totalTrackingReviews}`}
            hint="pending / total"
            urgent={summary.pendingTrackingReviews > 0}
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Findings deschise"
            value={String(summary.totalFindings)}
            hint="legate la AI Ads"
            urgent={summary.totalFindings > 0}
          />
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid rgba(148,163,184,0.12)",
          marginBottom: 24,
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: "10px 16px",
              background: "transparent",
              border: "none",
              color: activeTab === t.key ? "#60a5fa" : "var(--text-secondary, #94a3b8)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: activeTab === t.key ? 600 : 400,
              borderBottom:
                activeTab === t.key ? "2px solid #60a5fa" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: "rgba(248,113,113,0.1)",
            border: "1px solid rgba(248,113,113,0.3)",
            borderRadius: 8,
            color: "#f87171",
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8" }}>
          <Loader2 size={16} className="animate-spin" /> Încărcare...
        </div>
      ) : (
        <>
          {activeTab === "campaigns" && data && (
            <CampaignsTab
              campaigns={data.campaigns}
              expanded={expanded}
              setExpanded={setExpanded}
              onNew={() => setShowCampaignModal(true)}
              onRefresh={refresh}
              setActiveCampaign={setActiveCampaignId}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "claims" && data && (
            <ClaimsTab
              claims={data.claims}
              campaigns={data.campaigns}
              onNew={() => setShowClaimModal(true)}
              onRefresh={refresh}
            />
          )}
          {activeTab === "approvals" && data && (
            <ApprovalsTab
              approvals={data.approvals}
              campaigns={data.campaigns}
              onNew={(campaignId) => {
                setActiveCampaignId(campaignId)
                setShowApprovalModal(true)
              }}
            />
          )}
          {activeTab === "tracking" && data && (
            <TrackingTab
              trackingReviews={data.trackingReviews}
              campaigns={data.campaigns}
              onNew={(campaignId) => {
                setActiveCampaignId(campaignId)
                setShowTrackingModal(true)
              }}
            />
          )}
          {activeTab === "export" && data && (
            <ExportTab
              summary={summary}
              onExport={handleExport}
              loading={exportLoading}
            />
          )}
        </>
      )}

      {showCampaignModal && (
        <CampaignFormModal
          onClose={() => setShowCampaignModal(false)}
          onCreated={() => {
            setShowCampaignModal(false)
            void refresh()
          }}
        />
      )}
      {showClaimModal && (
        <ClaimFormModal
          campaigns={data?.campaigns ?? []}
          onClose={() => setShowClaimModal(false)}
          onCreated={() => {
            setShowClaimModal(false)
            void refresh()
          }}
        />
      )}
      {showApprovalModal && activeCampaignId && (
        <ApprovalFormModal
          campaignId={activeCampaignId}
          campaigns={data?.campaigns ?? []}
          onClose={() => {
            setShowApprovalModal(false)
            setActiveCampaignId(null)
          }}
          onCreated={() => {
            setShowApprovalModal(false)
            setActiveCampaignId(null)
            void refresh()
          }}
        />
      )}
      {showTrackingModal && activeCampaignId && (
        <TrackingFormModal
          campaignId={activeCampaignId}
          campaigns={data?.campaigns ?? []}
          existing={
            data?.trackingReviews.find(
              (t) =>
                t.campaignId === activeCampaignId ||
                t.id ===
                  data.campaigns.find((c) => c.id === activeCampaignId)
                    ?.conversionTrackingReviewId,
            ) ?? null
          }
          onClose={() => {
            setShowTrackingModal(false)
            setActiveCampaignId(null)
          }}
          onSaved={() => {
            setShowTrackingModal(false)
            setActiveCampaignId(null)
            void refresh()
          }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   StatCard
// ────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  hint,
  urgent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  urgent?: boolean
}) {
  return (
    <div
      style={{
        padding: 14,
        background: "rgba(15,23,42,0.4)",
        border: "1px solid rgba(148,163,184,0.12)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: urgent ? "#fb923c" : "#60a5fa",
          fontSize: 12,
          marginBottom: 6,
        }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: "var(--text-primary, #e2e8f0)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{hint}</div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Campaigns Tab
// ────────────────────────────────────────────────────────────────────────────

function CampaignsTab({
  campaigns,
  expanded,
  setExpanded,
  onNew,
  onRefresh,
  setActiveCampaign,
  setActiveTab,
}: {
  campaigns: AIAdsCampaign[]
  expanded: Record<string, boolean>
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  onNew: () => void
  onRefresh: () => void
  setActiveCampaign: (id: string | null) => void
  setActiveTab: (t: TabKey) => void
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi campania? (cascade va închide claims + approvals + tracking + findings)")) return
    try {
      const res = await fetch(`/api/ai-ads/campaigns/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Eroare ștergere")
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: "var(--text-primary, #e2e8f0)", margin: 0 }}>
          Campanii AI Ads ({campaigns.length})
        </h2>
        <button onClick={onNew} style={btnPrimary}>
          <Plus size={14} /> Adaugă campanie
        </button>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Nicio campanie înregistrată"
          hint="Adaugă prima campanie AI Ads pentru a începe să tracezi claims, aprobări creative și tracking GDPR."
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {campaigns.map((c) => (
            <div
              key={c.id}
              style={{
                background: "rgba(15,23,42,0.4)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "var(--text-primary, #e2e8f0)",
                      }}
                    >
                      {c.title}
                    </span>
                    <Badge {...STATUS_COLORS[c.status]}>
                      {STATUS_LABELS[c.status]}
                    </Badge>
                    {c.targetsVulnerableCategories && (
                      <Badge bg="rgba(248,113,113,0.16)" fg="#f87171">
                        Categorii vulnerabile
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 4 }}>
                    {c.brandName} · {PLATFORM_LABELS[c.platform]} ·{" "}
                    {CAMPAIGN_TYPE_LABELS[c.campaignType]}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {fmtDate(c.startDateISO)} → {fmtDate(c.endDateISO)}
                    {typeof c.budgetEUR === "number" && ` · ${c.budgetEUR} EUR`}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [c.id]: !e[c.id] }))
                    }
                    style={btnGhost}
                    aria-label="Toggle"
                  >
                    {expanded[c.id] ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </button>
                  <button onClick={() => handleDelete(c.id)} style={btnDanger}>
                    <X size={14} />
                  </button>
                </div>
              </div>
              {expanded[c.id] && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(148,163,184,0.12)",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Platform terms:</strong>{" "}
                      {c.platformTermsReviewed
                        ? `DA (${c.platformTermsReviewedByEmail ?? "?"})`
                        : "NU"}
                    </div>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Vendor link:</strong>{" "}
                      {c.linkedVendorId ?? "—"}
                    </div>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Claims linkate:</strong>{" "}
                      {c.linkedClaimIds.length}
                    </div>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Approvals:</strong>{" "}
                      {c.approvalIds.length}
                    </div>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Tracking review:</strong>{" "}
                      {c.conversionTrackingReviewId ?? "—"}
                    </div>
                    <div>
                      <strong style={{ color: "#e2e8f0" }}>Findings:</strong>{" "}
                      {c.linkedFindingIds.length}
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <button
                      style={btnGhost}
                      onClick={() => {
                        setActiveCampaign(c.id)
                        setActiveTab("approvals")
                      }}
                    >
                      <CheckCircle2 size={12} /> Înregistrează aprobare
                    </button>
                    <button
                      style={btnGhost}
                      onClick={() => {
                        setActiveCampaign(c.id)
                        setActiveTab("tracking")
                      }}
                    >
                      <ShieldAlert size={12} /> Tracking review
                    </button>
                  </div>
                  {c.notes && (
                    <div style={{ marginTop: 8, color: "#cbd5e1" }}>
                      <strong style={{ color: "#e2e8f0" }}>Note:</strong> {c.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Claims Tab
// ────────────────────────────────────────────────────────────────────────────

function ClaimsTab({
  claims,
  campaigns,
  onNew,
  onRefresh,
}: {
  claims: AIAdsClaim[]
  campaigns: AIAdsCampaign[]
  onNew: () => void
  onRefresh: () => void
}) {
  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi claim-ul?")) return
    try {
      const res = await fetch(`/api/ai-ads/claims/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      onRefresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Eroare ștergere")
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: "var(--text-primary, #e2e8f0)", margin: 0 }}>
          Claims registry ({claims.length})
        </h2>
        <button onClick={onNew} style={btnPrimary}>
          <Plus size={14} /> Adaugă afirmație
        </button>
      </div>
      {claims.length === 0 ? (
        <EmptyState
          icon={<Tag size={32} />}
          title="Niciun claim înregistrat"
          hint="Fiecare afirmație despre brand (performanță, preț, garanție, certificare) trebuie să poată fi demonstrată cu o sursă verificabilă (Directive 2005/29/EC + Law 363/2007)."
        />
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {claims.map((cl) => {
            const camp = cl.campaignId
              ? campaigns.find((c) => c.id === cl.campaignId)
              : null
            return (
              <div
                key={cl.id}
                style={{
                  background: "rgba(15,23,42,0.4)",
                  border: "1px solid rgba(148,163,184,0.12)",
                  borderRadius: 8,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <Badge {...RISK_COLORS[cl.misleadingRisk]}>
                        Risc {RISK_COLORS[cl.misleadingRisk].label}
                      </Badge>
                      <Badge bg="rgba(96,165,250,0.16)" fg="#60a5fa">
                        {CLAIM_TYPE_LABELS[cl.claimType]}
                      </Badge>
                      <Badge bg="rgba(148,163,184,0.16)" fg="#94a3b8">
                        {EVIDENCE_LABELS[cl.evidenceStatus]}
                      </Badge>
                      {camp && (
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          <Link2 size={12} /> {camp.title}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-primary, #e2e8f0)" }}>
                      „{cl.claimText}”
                    </div>
                    {cl.contextDescription && (
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                        Context: {cl.contextDescription}
                      </div>
                    )}
                    {cl.evidenceSource && (
                      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                        Sursă: {cl.evidenceSource}
                      </div>
                    )}
                    {cl.riskReasons.length > 0 && (
                      <ul
                        style={{
                          fontSize: 12,
                          color: "#fb923c",
                          marginTop: 8,
                          paddingLeft: 16,
                        }}
                      >
                        {cl.riskReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button onClick={() => handleDelete(cl.id)} style={btnDanger}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Approvals Tab
// ────────────────────────────────────────────────────────────────────────────

function ApprovalsTab({
  approvals,
  campaigns,
  onNew,
}: {
  approvals: AIAdsCreativeApproval[]
  campaigns: AIAdsCampaign[]
  onNew: (campaignId: string) => void
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "var(--text-primary, #e2e8f0)", marginTop: 0 }}>
        Creative Approval Log ({approvals.length})
      </h2>
      <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 720, marginBottom: 16 }}>
        Fiecare creative AI distribuit public trebuie să aibă semnătura unui
        aprobator uman cu 3 gate-uri confirmate (Art. 5 AI Act / Law 363/2007 /
        IP rights).
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {campaigns.map((c) => {
          const list = approvals.filter((a) => a.campaignId === c.id)
          return (
            <div
              key={c.id}
              style={{
                background: "rgba(15,23,42,0.4)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {list.length} aprobări înregistrate
                  </div>
                </div>
                <button onClick={() => onNew(c.id)} style={btnPrimary}>
                  <Plus size={12} /> Înregistrează aprobare
                </button>
              </div>
              {list.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {list.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        background: "rgba(15,23,42,0.5)",
                        padding: 10,
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                        <CheckOrX ok={a.art5Check} label="Art. 5" />
                        <CheckOrX ok={a.consumerLawCheck} label="Law 363" />
                        <CheckOrX ok={a.ipRightsCheck} label="IP rights" />
                      </div>
                      <div style={{ color: "#e2e8f0" }}>{a.creativeDescription}</div>
                      <div style={{ color: "#64748b", marginTop: 2 }}>
                        {a.approvedByEmail} · {fmtDate(a.approvedAtISO)}
                      </div>
                      {a.comment && (
                        <div style={{ marginTop: 4, color: "#94a3b8" }}>
                          „{a.comment}”
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <EmptyState
            icon={<CheckCircle2 size={32} />}
            title="Nicio campanie pentru aprobări"
            hint="Adaugă mai întâi o campanie."
          />
        )}
      </div>
    </div>
  )
}

function CheckOrX({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        background: ok ? "rgba(52,211,153,0.16)" : "rgba(248,113,113,0.16)",
        color: ok ? "#34d399" : "#f87171",
        borderRadius: 12,
        fontSize: 11,
      }}
    >
      {ok ? <CheckCircle2 size={12} /> : <X size={12} />} {label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Tracking Tab
// ────────────────────────────────────────────────────────────────────────────

function TrackingTab({
  trackingReviews,
  campaigns,
  onNew,
}: {
  trackingReviews: ConversionTrackingReview[]
  campaigns: AIAdsCampaign[]
  onNew: (campaignId: string) => void
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "var(--text-primary, #e2e8f0)", marginTop: 0 }}>
        Conversion Tracking Reviews ({trackingReviews.length})
      </h2>
      <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 720, marginBottom: 16 }}>
        Per campanie: metode tracking + consent + cookie/pixel/CRM upload +
        transferuri terță țară (GDPR Art. 44-49 + ePrivacy Art. 5(3)).
      </p>
      <div style={{ display: "grid", gap: 10 }}>
        {campaigns.map((c) => {
          const tr =
            trackingReviews.find((t) => t.id === c.conversionTrackingReviewId) ??
            trackingReviews.find((t) => t.campaignId === c.id) ??
            null
          return (
            <div
              key={c.id}
              style={{
                background: "rgba(15,23,42,0.4)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: 8,
                padding: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                    {c.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {tr ? `Review ${tr.id} — ${tr.gaps.length} gap(uri)` : "Niciun review"}
                  </div>
                </div>
                <button onClick={() => onNew(c.id)} style={btnPrimary}>
                  {tr ? (
                    <>
                      <Eye size={12} /> Editează
                    </>
                  ) : (
                    <>
                      <Plus size={12} /> Creează
                    </>
                  )}
                </button>
              </div>
              {tr && (
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Metode:</strong>{" "}
                    {tr.methods.map((m) => TRACKING_METHOD_LABELS[m]).join(", ")}
                  </div>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Consent:</strong>{" "}
                    {tr.consentRequired ? "necesar" : "nu"}
                    {tr.consentRecordedHow && ` · ${tr.consentRecordedHow}`}
                  </div>
                  <div>
                    <strong style={{ color: "#e2e8f0" }}>Transfer:</strong>{" "}
                    {tr.thirdCountryTransfer
                      ? `terță țară (${tr.transferMechanism ?? "—"})`
                      : "EU only"}
                  </div>
                  {tr.gaps.length > 0 && (
                    <ul
                      style={{
                        marginTop: 8,
                        paddingLeft: 16,
                        color: "#fb923c",
                      }}
                    >
                      {tr.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
        {campaigns.length === 0 && (
          <EmptyState
            icon={<ShieldAlert size={32} />}
            title="Nicio campanie pentru tracking review"
            hint="Adaugă mai întâi o campanie."
          />
        )}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Export Tab
// ────────────────────────────────────────────────────────────────────────────

function ExportTab({
  summary,
  onExport,
  loading,
}: {
  summary?: AIAdsResponse["summary"]
  onExport: () => void
  loading: boolean
}) {
  return (
    <div>
      <h2 style={{ fontSize: 18, color: "var(--text-primary, #e2e8f0)", marginTop: 0 }}>
        Export AI Ads Compliance Pack
      </h2>
      <p style={{ fontSize: 13, color: "#94a3b8", maxWidth: 720, marginBottom: 16 }}>
        Generează markdown cu toate campaniile, claims, aprobări și tracking
        reviews — utilizabil pentru audit DPO / consilier juridic.
      </p>
      <div
        style={{
          background: "rgba(15,23,42,0.4)",
          border: "1px solid rgba(148,163,184,0.12)",
          borderRadius: 8,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>
              {summary?.totalCampaigns ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Campanii</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>
              {summary?.totalClaims ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Claims</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>
              {summary?.totalApprovals ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Approvals</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#e2e8f0" }}>
              {summary?.totalTrackingReviews ?? 0}
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Tracking reviews</div>
          </div>
        </div>
        <button onClick={onExport} disabled={loading} style={btnPrimary}>
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}{" "}
          Generează AI Ads Pack (Markdown)
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modals — Campaign
// ────────────────────────────────────────────────────────────────────────────

function CampaignFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void
}) {
  const [title, setTitle] = useState("")
  const [brandName, setBrandName] = useState("")
  const [platform, setPlatform] = useState<AIAdsCampaignPlatform>("other")
  const [campaignType, setCampaignType] = useState<AIAdsCampaignType>("paid_placement")
  const [status, setStatus] = useState<AIAdsCampaignStatus>("draft")
  const [startDateISO, setStartDateISO] = useState("")
  const [endDateISO, setEndDateISO] = useState("")
  const [budgetEUR, setBudgetEUR] = useState<string>("")
  const [linkedVendorId, setLinkedVendorId] = useState("")
  const [linkedAssetIds, setLinkedAssetIds] = useState("")
  const [targetAudienceDescription, setTargetAudienceDescription] = useState("")
  const [targetsVulnerable, setTargetsVulnerable] = useState(false)
  const [platformTermsReviewed, setPlatformTermsReviewed] = useState(false)
  const [platformTermsReviewedByEmail, setPlatformTermsReviewedByEmail] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          brandName,
          platform,
          campaignType,
          status,
          startDateISO: startDateISO || undefined,
          endDateISO: endDateISO || undefined,
          budgetEUR: budgetEUR ? Number(budgetEUR) : undefined,
          linkedVendorId: linkedVendorId.trim() || undefined,
          linkedAssetIds: linkedAssetIds
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          targetAudienceDescription: targetAudienceDescription || undefined,
          targetsVulnerableCategories: targetsVulnerable,
          platformTermsReviewed,
          platformTermsReviewedByEmail: platformTermsReviewedByEmail || undefined,
          platformTermsReviewedAtISO: platformTermsReviewed
            ? new Date().toISOString()
            : undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Adaugă campanie AI Ads" onClose={onClose}>
      <Section title="Identificare">
        <FormField label="Titlu *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Brand *">
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Platformă">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as AIAdsCampaignPlatform)}
            style={inputStyle}
          >
            {(Object.keys(PLATFORM_LABELS) as AIAdsCampaignPlatform[]).map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABELS[p]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Tip campanie">
          <select
            value={campaignType}
            onChange={(e) => setCampaignType(e.target.value as AIAdsCampaignType)}
            style={inputStyle}
          >
            {(Object.keys(CAMPAIGN_TYPE_LABELS) as AIAdsCampaignType[]).map((p) => (
              <option key={p} value={p}>
                {CAMPAIGN_TYPE_LABELS[p]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AIAdsCampaignStatus)}
            style={inputStyle}
          >
            {(Object.keys(STATUS_LABELS) as AIAdsCampaignStatus[]).map((p) => (
              <option key={p} value={p}>
                {STATUS_LABELS[p]}
              </option>
            ))}
          </select>
        </FormField>
      </Section>
      <Section title="Cross-module links (Rule 1)">
        <FormField label="Vendor ID (Sprint 010 VendorRecord)">
          <input
            value={linkedVendorId}
            onChange={(e) => setLinkedVendorId(e.target.value)}
            placeholder="ex: vnd-abc123"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Asset IDs (Sprint 023.7 Content Register, comma-separated)">
          <input
            value={linkedAssetIds}
            onChange={(e) => setLinkedAssetIds(e.target.value)}
            placeholder="ex: cnt-abc, cnt-def"
            style={inputStyle}
          />
        </FormField>
      </Section>
      <Section title="Audiență / targeting">
        <FormField label="Descriere audiență">
          <input
            value={targetAudienceDescription}
            onChange={(e) => setTargetAudienceDescription(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={targetsVulnerable}
              onChange={(e) => setTargetsVulnerable(e.target.checked)}
            />
            Țintește categorii vulnerabile (minori, profiluri sensibile) — Art.
            5(1)(b) AI Act
          </label>
        </FormField>
      </Section>
      <Section title="Platform terms review">
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={platformTermsReviewed}
              onChange={(e) => setPlatformTermsReviewed(e.target.checked)}
            />
            Platform terms au fost revizuiți legal
          </label>
        </FormField>
        {platformTermsReviewed && (
          <FormField label="Reviewer email">
            <input
              value={platformTermsReviewedByEmail}
              onChange={(e) => setPlatformTermsReviewedByEmail(e.target.value)}
              style={inputStyle}
            />
          </FormField>
        )}
      </Section>
      <Section title="Detalii">
        <FormField label="Start (ISO)">
          <input
            type="date"
            value={startDateISO ? startDateISO.slice(0, 10) : ""}
            onChange={(e) => setStartDateISO(e.target.value ? `${e.target.value}T00:00:00.000Z` : "")}
            style={inputStyle}
          />
        </FormField>
        <FormField label="End (ISO)">
          <input
            type="date"
            value={endDateISO ? endDateISO.slice(0, 10) : ""}
            onChange={(e) => setEndDateISO(e.target.value ? `${e.target.value}T23:59:59.000Z` : "")}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Buget (EUR)">
          <input
            type="number"
            value={budgetEUR}
            onChange={(e) => setBudgetEUR(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Note">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FormField>
      </Section>
      {err && (
        <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{err}</div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          justifyContent: "flex-end",
        }}
      >
        <button style={btnGhost} onClick={onClose}>
          Anulează
        </button>
        <button
          style={btnPrimary}
          onClick={submit}
          disabled={submitting || !title || !brandName}
        >
          {submitting && <Loader2 size={14} className="animate-spin" />} Salvează
        </button>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modals — Claim
// ────────────────────────────────────────────────────────────────────────────

function ClaimFormModal({
  campaigns,
  onClose,
  onCreated,
}: {
  campaigns: AIAdsCampaign[]
  onClose: () => void
  onCreated: () => void
}) {
  const [campaignId, setCampaignId] = useState("")
  const [claimType, setClaimType] = useState<AIClaimType>("performance_metric")
  const [claimText, setClaimText] = useState("")
  const [contextDescription, setContextDescription] = useState("")
  const [evidenceStatus, setEvidenceStatus] =
    useState<AIClaimEvidenceStatus>("unsubstantiated")
  const [evidenceSource, setEvidenceSource] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const previewedRisk = useMemo(
    () => previewClaimRisk(claimType, evidenceStatus),
    [claimType, evidenceStatus],
  )

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-ads/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaignId || undefined,
          claimType,
          claimText,
          contextDescription,
          evidenceStatus,
          evidenceSource: evidenceSource || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal title="Adaugă afirmație" onClose={onClose}>
      <FormField label="Campanie (opțional)">
        <select
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          style={inputStyle}
        >
          <option value="">— fără campanie —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Tip claim">
        <select
          value={claimType}
          onChange={(e) => setClaimType(e.target.value as AIClaimType)}
          style={inputStyle}
        >
          {(Object.keys(CLAIM_TYPE_LABELS) as AIClaimType[]).map((p) => (
            <option key={p} value={p}>
              {CLAIM_TYPE_LABELS[p]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Afirmația *">
        <textarea
          value={claimText}
          onChange={(e) => setClaimText(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="ex: „10x mai rapid decât competiția”"
        />
      </FormField>
      <FormField label="Context (unde apare)">
        <input
          value={contextDescription}
          onChange={(e) => setContextDescription(e.target.value)}
          placeholder="ex: Landing page hero, banner Meta"
          style={inputStyle}
        />
      </FormField>
      <FormField label="Status dovadă">
        <select
          value={evidenceStatus}
          onChange={(e) => setEvidenceStatus(e.target.value as AIClaimEvidenceStatus)}
          style={inputStyle}
        >
          {(Object.keys(EVIDENCE_LABELS) as AIClaimEvidenceStatus[]).map((p) => (
            <option key={p} value={p}>
              {EVIDENCE_LABELS[p]}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Sursă dovadă (URL / referință)">
        <input
          value={evidenceSource}
          onChange={(e) => setEvidenceSource(e.target.value)}
          placeholder="https://audit.example.com/report.pdf"
          style={inputStyle}
        />
      </FormField>
      <FormField label="Note">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </FormField>
      <div
        style={{
          marginTop: 12,
          padding: 12,
          background: RISK_COLORS[previewedRisk].bg,
          borderRadius: 8,
          fontSize: 13,
          color: RISK_COLORS[previewedRisk].fg,
        }}
      >
        <strong>Risc previzionat:</strong>{" "}
        {RISK_COLORS[previewedRisk].label.toUpperCase()} — pe baza tipului de
        claim + status dovadă (heuristic engine).
      </div>
      {err && (
        <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{err}</div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          justifyContent: "flex-end",
        }}
      >
        <button style={btnGhost} onClick={onClose}>
          Anulează
        </button>
        <button style={btnPrimary} onClick={submit} disabled={submitting || !claimText}>
          {submitting && <Loader2 size={14} className="animate-spin" />} Salvează
        </button>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modals — Approval
// ────────────────────────────────────────────────────────────────────────────

function ApprovalFormModal({
  campaignId,
  campaigns,
  onClose,
  onCreated,
}: {
  campaignId: string
  campaigns: AIAdsCampaign[]
  onClose: () => void
  onCreated: () => void
}) {
  const camp = campaigns.find((c) => c.id === campaignId)
  const [creativeDescription, setCreativeDescription] = useState("")
  const [approvedByEmail, setApprovedByEmail] = useState("")
  const [comment, setComment] = useState("")
  const [prohibitedContentChecked, setProhibitedContentChecked] = useState(false)
  const [art5Check, setArt5Check] = useState(false)
  const [consumerLawCheck, setConsumerLawCheck] = useState(false)
  const [ipRightsCheck, setIpRightsCheck] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch(`/api/ai-ads/campaigns/${campaignId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeDescription,
          approvedByEmail,
          comment: comment || undefined,
          prohibitedContentChecked,
          art5Check,
          consumerLawCheck,
          ipRightsCheck,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onCreated()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Înregistrează aprobare pentru ${camp?.title ?? "campanie"}`}
      onClose={onClose}
    >
      <FormField label="Descriere creative *">
        <textarea
          value={creativeDescription}
          onChange={(e) => setCreativeDescription(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
          placeholder="ex: Banner Meta 1200x630 — Imagine AI generată cu prompt X"
        />
      </FormField>
      <FormField label="Aprobator email *">
        <input
          value={approvedByEmail}
          onChange={(e) => setApprovedByEmail(e.target.value)}
          placeholder="ceo@example.com"
          style={inputStyle}
        />
      </FormField>
      <Section title="Gate-uri compliance (3/3 necesare)">
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={art5Check}
              onChange={(e) => setArt5Check(e.target.checked)}
            />
            Art. 5 AI Act — Nu exploatează vulnerabilități, nu manipulează subliminal
          </label>
        </FormField>
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={consumerLawCheck}
              onChange={(e) => setConsumerLawCheck(e.target.checked)}
            />
            Law 363/2007 + Directive 2005/29/EC — Nu este practică comercială
            înșelătoare
          </label>
        </FormField>
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={ipRightsCheck}
              onChange={(e) => setIpRightsCheck(e.target.checked)}
            />
            IP rights — Drepturile de autor / mărci / personalitate sunt clarificate
          </label>
        </FormField>
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={prohibitedContentChecked}
              onChange={(e) => setProhibitedContentChecked(e.target.checked)}
            />
            Conținutul nu este în lista de prohibited content al platformei
          </label>
        </FormField>
      </Section>
      <FormField label="Comentariu">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </FormField>
      {err && (
        <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{err}</div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          justifyContent: "flex-end",
        }}
      >
        <button style={btnGhost} onClick={onClose}>
          Anulează
        </button>
        <button
          style={btnPrimary}
          onClick={submit}
          disabled={submitting || !creativeDescription || !approvedByEmail}
        >
          {submitting && <Loader2 size={14} className="animate-spin" />} Salvează
        </button>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Modals — Tracking
// ────────────────────────────────────────────────────────────────────────────

function TrackingFormModal({
  campaignId,
  campaigns,
  existing,
  onClose,
  onSaved,
}: {
  campaignId: string
  campaigns: AIAdsCampaign[]
  existing: ConversionTrackingReview | null
  onClose: () => void
  onSaved: () => void
}) {
  const camp = campaigns.find((c) => c.id === campaignId)
  const [methods, setMethods] = useState<ConversionTrackingMethod[]>(
    existing?.methods ?? [],
  )
  const [consentRequired, setConsentRequired] = useState<boolean>(
    existing?.consentRequired ?? true,
  )
  const [consentRecordedHow, setConsentRecordedHow] = useState(
    existing?.consentRecordedHow ?? "",
  )
  const [cookieList, setCookieList] = useState(
    (existing?.cookieList ?? []).join(", "),
  )
  const [pixelList, setPixelList] = useState((existing?.pixelList ?? []).join(", "))
  const [crmUploadUsed, setCrmUploadUsed] = useState(existing?.crmUploadUsed ?? false)
  const [crmDataCategoriesUploaded, setCrmDataCategoriesUploaded] = useState(
    (existing?.crmDataCategoriesUploaded ?? []).join(", "),
  )
  const [thirdCountryTransfer, setThirdCountryTransfer] = useState(
    existing?.thirdCountryTransfer ?? false,
  )
  const [transferMechanism, setTransferMechanism] = useState(
    existing?.transferMechanism ?? "none",
  )
  const [reviewedByEmail, setReviewedByEmail] = useState(
    existing?.reviewedByEmail ?? "",
  )
  const [reviewNotes, setReviewNotes] = useState(existing?.reviewNotes ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const toggleMethod = (m: ConversionTrackingMethod) => {
    setMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
    )
  }

  const submit = async () => {
    setSubmitting(true)
    setErr(null)
    try {
      const res = await fetch("/api/ai-ads/tracking-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          methods,
          consentRequired,
          consentRecordedHow,
          cookieList: cookieList
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          pixelList: pixelList
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          crmUploadUsed,
          crmDataCategoriesUploaded: crmDataCategoriesUploaded
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          thirdCountryTransfer,
          transferMechanism,
          reviewedByEmail: reviewedByEmail || undefined,
          reviewNotes: reviewNotes || undefined,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? `HTTP ${res.status}`)
      }
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Eroare")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={`Tracking Review — ${camp?.title ?? "Campanie"}`}
      onClose={onClose}
    >
      <Section title="Metode de tracking (selectează multiple)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {TRACKING_METHODS.map((m) => (
            <label key={m} style={checkboxLabel}>
              <input
                type="checkbox"
                checked={methods.includes(m)}
                onChange={() => toggleMethod(m)}
              />
              {TRACKING_METHOD_LABELS[m]}
            </label>
          ))}
        </div>
      </Section>
      <Section title="Consent (ePrivacy + GDPR Art. 6)">
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={consentRequired}
              onChange={(e) => setConsentRequired(e.target.checked)}
            />
            Consent este obligatoriu pentru această campanie
          </label>
        </FormField>
        <FormField label="Cum se înregistrează consent-ul">
          <input
            value={consentRecordedHow}
            onChange={(e) => setConsentRecordedHow(e.target.value)}
            placeholder="ex: CMP banner Cookiebot, granular per category"
            style={inputStyle}
          />
        </FormField>
      </Section>
      <Section title="Inventar tehnic">
        <FormField label="Cookies (comma-separated)">
          <input
            value={cookieList}
            onChange={(e) => setCookieList(e.target.value)}
            style={inputStyle}
            placeholder="_ga, _fbp"
          />
        </FormField>
        <FormField label="Pixel-uri (comma-separated)">
          <input
            value={pixelList}
            onChange={(e) => setPixelList(e.target.value)}
            style={inputStyle}
            placeholder="fbq, gtag, _linkedin_partner_id"
          />
        </FormField>
      </Section>
      <Section title="CRM upload (audience matching)">
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={crmUploadUsed}
              onChange={(e) => setCrmUploadUsed(e.target.checked)}
            />
            Se folosește CRM upload (custom audience)
          </label>
        </FormField>
        {crmUploadUsed && (
          <FormField label="Categorii date încărcate">
            <input
              value={crmDataCategoriesUploaded}
              onChange={(e) => setCrmDataCategoriesUploaded(e.target.value)}
              placeholder="email hashed, phone hashed"
              style={inputStyle}
            />
          </FormField>
        )}
      </Section>
      <Section title="Transfer terță țară (GDPR Art. 44-49)">
        <FormField label="">
          <label style={checkboxLabel}>
            <input
              type="checkbox"
              checked={thirdCountryTransfer}
              onChange={(e) => setThirdCountryTransfer(e.target.checked)}
            />
            Datele sunt transferate în afara EU/SEE
          </label>
        </FormField>
        {thirdCountryTransfer && (
          <FormField label="Mecanism transfer">
            <select
              value={transferMechanism ?? "none"}
              onChange={(e) =>
                setTransferMechanism(e.target.value as typeof transferMechanism)
              }
              style={inputStyle}
            >
              <option value="none">none</option>
              <option value="scc">SCC</option>
              <option value="adequacy">Adequacy decision</option>
              <option value="bcr">BCR</option>
              <option value="derogation">Derogare Art. 49</option>
            </select>
          </FormField>
        )}
      </Section>
      <Section title="Reviewer">
        <FormField label="Reviewer email">
          <input
            value={reviewedByEmail}
            onChange={(e) => setReviewedByEmail(e.target.value)}
            style={inputStyle}
          />
        </FormField>
        <FormField label="Note review">
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </FormField>
      </Section>
      {err && (
        <div style={{ color: "#f87171", fontSize: 13, marginTop: 8 }}>{err}</div>
      )}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          justifyContent: "flex-end",
        }}
      >
        <button style={btnGhost} onClick={onClose}>
          Anulează
        </button>
        <button
          style={btnPrimary}
          onClick={submit}
          disabled={submitting || methods.length === 0}
        >
          {submitting && <Loader2 size={14} className="animate-spin" />} Salvează
        </button>
      </div>
    </Modal>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   UI primitives
// ────────────────────────────────────────────────────────────────────────────

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2,6,23,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 1000,
        padding: 40,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-secondary, #0f172a)",
          border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 12,
          maxWidth: 720,
          width: "100%",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, color: "#e2e8f0", fontSize: 18 }}>{title}</h3>
          <button style={btnGhost} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#64748b",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      {label && (
        <div
          style={{
            fontSize: 12,
            color: "#94a3b8",
            marginBottom: 4,
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  )
}

function Badge({
  bg,
  fg,
  children,
}: {
  bg: string
  fg: string
  children: React.ReactNode
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        background: bg,
        color: fg,
        fontSize: 11,
        borderRadius: 12,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  )
}

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode
  title: string
  hint: string
}) {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        background: "rgba(15,23,42,0.4)",
        border: "1px dashed rgba(148,163,184,0.2)",
        borderRadius: 8,
      }}
    >
      <div style={{ color: "#64748b", marginBottom: 12 }}>{icon}</div>
      <div style={{ color: "#e2e8f0", marginBottom: 6, fontSize: 15 }}>{title}</div>
      <div style={{ color: "#94a3b8", fontSize: 13, maxWidth: 480, margin: "0 auto" }}>
        {hint}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
//   Styles
// ────────────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "rgba(15,23,42,0.6)",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 6,
  color: "#e2e8f0",
  fontSize: 13,
  outline: "none",
}

const checkboxLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  color: "#cbd5e1",
  cursor: "pointer",
}

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: "#60a5fa",
  color: "#0f172a",
  border: "none",
  borderRadius: 6,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
}

const btnGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "6px 10px",
  background: "transparent",
  color: "#94a3b8",
  border: "1px solid rgba(148,163,184,0.2)",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
}

const btnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "6px 10px",
  background: "transparent",
  color: "#f87171",
  border: "1px solid rgba(248,113,113,0.3)",
  borderRadius: 6,
  fontSize: 12,
  cursor: "pointer",
}
