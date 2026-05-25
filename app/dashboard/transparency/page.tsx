"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Music,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import type {
  AIContentAssetType,
  AIContentEvidenceItem,
  AIContentEvidenceType,
  AIContentLabeledAsset,
  ContentLabelingStandard,
  TransparencyImplementation,
  TransparencyLanguage,
  TransparencyNoticeRequirement,
  TransparencyNoticeType,
  TransparencyPlacement,
} from "@/lib/compliance/types";

// ────────────────────────────────────────────────────────────────────────────
//   Local types — duplicate of API response shape
// ────────────────────────────────────────────────────────────────────────────

type AnnotatedRequirement = TransparencyNoticeRequirement & {
  implemented: boolean;
  implementation: TransparencyImplementation | null;
};

type SystemAnalysis = {
  systemId: string;
  systemName: string;
  requirements: AnnotatedRequirement[];
};

type AllRequiredResponse = {
  role: string | null;
  systems: SystemAnalysis[];
  stats: {
    totalSystems: number;
    pendingSystems: number;
    pendingNotices: number;
  };
  implementations: TransparencyImplementation[];
};

// ────────────────────────────────────────────────────────────────────────────
//   Constants — friendly labels
// ────────────────────────────────────────────────────────────────────────────

const NOTICE_TYPE_LABELS: Record<TransparencyNoticeType, string> = {
  "chatbot-disclosure": "Disclosure chatbot",
  "ai-generated-content": "Etichetare conținut generat AI",
  "deepfake-disclosure": "Disclosure deepfake",
  "personalization-notice": "Notificare personalizare",
  "emotion-recognition-notice": "Notificare recunoaștere emoții",
  "automated-decision-notice": "Notificare decizie automatizată",
};

const PLACEMENT_LABELS: Record<TransparencyPlacement, string> = {
  popup: "Popup",
  footer: "Footer",
  header: "Banner header",
  "email-signature": "Semnătură email",
  "video-overlay": "Overlay video",
  inline: "Inline / badge",
  advertisement: "Reclamă plătită",
  "social-post": "Post social media",
  broadcast: "Email broadcast",
};

const ALL_PLACEMENTS: TransparencyPlacement[] = [
  "popup",
  "footer",
  "header",
  "email-signature",
  "video-overlay",
  "inline",
  "advertisement",
  "social-post",
  "broadcast",
];

const ALL_LANGUAGES: TransparencyLanguage[] = ["ro", "en"];

function severityStatusClass(severity: "critical" | "high" | "medium") {
  switch (severity) {
    case "critical":
      return "cr-status-pill--danger";
    case "high":
      return "cr-status-pill--warning";
    case "medium":
    default:
      return "cr-status-pill--info";
  }
}

function TransparencyField({
  label,
  children,
  spanTwo = false,
}: {
  label: string;
  children: React.ReactNode;
  spanTwo?: boolean;
}) {
  return (
    <div className={`cr-field${spanTwo ? " cr-field--span-2" : ""}`}>
      <label className="cr-field-label">{label}</label>
      {children}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Page
// ────────────────────────────────────────────────────────────────────────────

type TabKey = "notices" | "content-register";

export default function TransparencyPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("notices");
  const [data, setData] = useState<AllRequiredResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSystemId, setOpenSystemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/transparency/all-required", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `HTTP ${res.status}`);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as AllRequiredResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = data?.stats ?? {
    totalSystems: 0,
    pendingSystems: 0,
    pendingNotices: 0,
  };
  const systemsWithRequirements = useMemo(() => {
    return (
      data?.systems.filter((system) => system.requirements.length > 0) ?? []
    );
  }, [data]);
  const totalImplemented = useMemo(() => {
    if (!data) return 0;
    return data.systems.reduce(
      (acc, s) => acc + s.requirements.filter((r) => r.implemented).length,
      0,
    );
  }, [data]);

  const openSystem =
    data?.systems.find((s) => s.systemId === openSystemId) ?? null;
  const systemTableColumns = {
    "--cr-data-columns": "1.4fr 1fr 1fr 1fr",
  } as React.CSSProperties;

  return (
    <div className="cr-page cr-stack">
      {/* Header */}
      <div className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Conformitate</span>
          <h1 className="cr-title">Notificări transparență · Art. 50</h1>
          <p className="cr-subtitle">
            Generează notice-uri de transparență RO + EN gata de copy-paste
            pentru sistemele AI care interacționează cu persoane fizice sau
            produc conținut sintetic. În tabul „Content Register” poți
            înregistra individual fiecare piesă de conținut AI (imagine, video,
            deepfake, text public-interest, chatbot) cu dovada provider +
            deployer duty.
          </p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="cr-toolbar">
        <div
          role="tablist"
          aria-label="Tabs transparency"
          className="cr-segment-bar"
        >
          {[
            { key: "notices" as TabKey, label: "Notice-uri per sistem" },
            {
              key: "content-register" as TabKey,
              label: "Content Register (per asset)",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={`cr-tab${isActive ? " is-active" : ""}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "content-register" && <ContentRegisterTab />}

      {activeTab === "notices" && (
        <>
          {/* Deadline banner */}
          <div role="status" className="cr-alert cr-alert--warning">
            <AlertTriangle size={16} className="tp-alert-icon" />
            <div>
              <div className="tp-banner-title">
                Art. 50 EU AI Act devine executoriu la 2 decembrie 2026
              </div>
              <div className="tp-banner-copy">
                Extindere prin Omnibus (mai 2026) de la 2 august 2026 → 2
                decembrie 2026. Sancțiuni: până la 15 mil EUR sau 3% din cifra
                de afaceri globală.
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="cr-stat-strip cr-stat-strip--four">
            {[
              { label: "Sisteme AI total", value: totals.totalSystems },
              {
                label: "Cu obligații Art. 50",
                value: systemsWithRequirements.length,
              },
              { label: "Notice-uri implementate", value: totalImplemented },
              { label: "Notice-uri pending", value: totals.pendingNotices },
            ].map((stat) => (
              <div key={stat.label} className="cr-stat">
                <div className="cr-stat__label">{stat.label}</div>
                <div className="cr-stat__value">{stat.value}</div>
                <div className="cr-stat__sub">
                  {stat.label === "Sisteme AI total" &&
                    "Inventar scanat în workspace"}
                  {stat.label === "Cu obligații Art. 50" &&
                    "Sisteme unde transparența trebuie publicată"}
                  {stat.label === "Notice-uri implementate" &&
                    "Notice-uri deja confirmate cu dovadă"}
                  {stat.label === "Notice-uri pending" &&
                    "Notice-uri care mai trebuie publicate"}
                </div>
              </div>
            ))}
          </div>

          {/* Role info */}
          {data?.role && (
            <div className="cr-inline-note">
              Rol organizație detectat: <strong>{data.role}</strong>
            </div>
          )}

          {/* States */}
          {loading && (
            <div className="cr-inline-note">
              <Loader2 size={14} className="tp-spin" />
              Se încarcă obligațiile de transparență…
            </div>
          )}

          {error && !loading && (
            <div className="cr-alert cr-alert--danger">{error}</div>
          )}

          {/* Systems table */}
          {!loading && !error && data && data.systems.length === 0 && (
            <div className="cr-empty">
              <div>
                Nu ai sisteme AI în inventar. Adaugă mai întâi sisteme în
                secțiunea{" "}
                <a href="/dashboard/sisteme" className="cr-link">
                  Sisteme AI
                </a>{" "}
                ca să vezi ce notice-uri Art. 50 trebuie publicate.
              </div>
            </div>
          )}

          {!loading && !error && data && data.systems.length > 0 && (
            <div className="cr-data-shell" style={systemTableColumns}>
              <div className="cr-data-head">
                <div className="cr-data-cell">Sistem AI</div>
                <div className="cr-data-cell">Notice obligatorii</div>
                <div className="cr-data-cell">Status</div>
                <div className="cr-data-cell cr-data-cell--actions">
                  Acțiuni
                </div>
              </div>

              {data.systems.map((sys) => {
                const total = sys.requirements.length;
                const implemented = sys.requirements.filter(
                  (r) => r.implemented,
                ).length;
                const pending = total - implemented;
                const isFullyOk = total === 0;
                const isComplete = total > 0 && pending === 0;

                return (
                  <div key={sys.systemId} className="cr-data-row">
                    <div className="cr-data-cell">
                      <div className="tp-row-title">{sys.systemName}</div>
                      <div className="tp-row-subline">{sys.systemId}</div>
                    </div>

                    <div className="cr-data-cell cr-pill-group">
                      {isFullyOk ? (
                        <span className="cr-muted tp-meta-note">
                          Niciunul (nu intră sub Art. 50)
                        </span>
                      ) : (
                        sys.requirements.map((req) => {
                          const statusClass =
                            req.severity === "critical"
                              ? "cr-status-pill--danger"
                              : req.severity === "high"
                                ? "cr-status-pill--warning"
                                : "cr-status-pill--info";
                          return (
                            <span
                              key={req.noticeType}
                              title={req.obligation}
                              className={`cr-status-pill ${statusClass}`}
                            >
                              {NOTICE_TYPE_LABELS[req.noticeType]}
                            </span>
                          );
                        })
                      )}
                    </div>

                    <div className="cr-data-cell">
                      {isFullyOk ? (
                        <span className="cr-muted">—</span>
                      ) : isComplete ? (
                        <span className="cr-status-pill cr-status-pill--ok">
                          <CheckCircle2 size={12} /> Toate implementate
                        </span>
                      ) : (
                        <span className="cr-status-pill cr-status-pill--danger">
                          <AlertTriangle size={12} /> {pending} / {total}{" "}
                          pending
                        </span>
                      )}
                    </div>

                    <div className="cr-data-cell cr-data-cell--actions">
                      {!isFullyOk && (
                        <button
                          onClick={() => setOpenSystemId(sys.systemId)}
                          className="cr-btn cr-btn--primary cr-btn--sm"
                        >
                          Vezi notice-uri
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal */}
          {openSystem && (
            <SystemNoticesModal
              system={openSystem}
              onClose={() => setOpenSystemId(null)}
              onChanged={load}
            />
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Modal
// ────────────────────────────────────────────────────────────────────────────

function SystemNoticesModal({
  system,
  onClose,
  onChanged,
}: {
  system: SystemAnalysis;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const [activeNoticeIdx, setActiveNoticeIdx] = useState(0);
  const active = system.requirements[activeNoticeIdx];

  return (
    <div onClick={onClose} className="cr-modal-backdrop">
      <div
        onClick={(e) => e.stopPropagation()}
        className="cr-modal cr-modal--lg"
      >
        {/* Header */}
        <div className="cr-modal__header">
          <div>
            <h2 className="cr-modal__title">
              Notice-uri pentru: {system.systemName}
            </h2>
            <div className="cr-modal__subtitle">
              {system.requirements.length} obligație(i) de transparență sub Art.
              50 EU AI Act
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="cr-icon-button cr-modal__close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Tabs notice types */}
        {system.requirements.length > 1 && (
          <div className="tp-modal-tabs">
            <div className="cr-segment-bar tp-modal-tabs-bar">
              {system.requirements.map((req, idx) => {
                const isActive = idx === activeNoticeIdx;
                return (
                  <button
                    key={req.noticeType}
                    onClick={() => setActiveNoticeIdx(idx)}
                    className={`cr-tab tp-no-wrap${isActive ? " is-active" : ""}`}
                  >
                    {NOTICE_TYPE_LABELS[req.noticeType]}
                    {req.implemented && (
                      <CheckCircle2 size={12} className="tp-tab-check" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body */}
        <div className="cr-modal__body tp-modal-scroll">
          {active && (
            <NoticeDetail
              key={active.noticeType}
              systemId={system.systemId}
              requirement={active}
              onChanged={onChanged}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Notice detail — placement/language tabs + template preview + actions
// ────────────────────────────────────────────────────────────────────────────

function NoticeDetail({
  systemId,
  requirement,
  onChanged,
}: {
  systemId: string;
  requirement: AnnotatedRequirement;
  onChanged: () => void | Promise<void>;
}) {
  // Sane defaults: prefer existing implementation's combo, else RO+popup (or first available).
  const defaultLang: TransparencyLanguage =
    requirement.implementation?.language ||
    (requirement.templates.some((t) => t.language === "ro") ? "ro" : "en");
  const defaultPlacement: TransparencyPlacement =
    requirement.implementation?.placement ||
    requirement.templates[0]?.placement ||
    "popup";

  const [language, setLanguage] = useState<TransparencyLanguage>(defaultLang);
  const [placement, setPlacement] =
    useState<TransparencyPlacement>(defaultPlacement);
  const [contactEmail, setContactEmail] = useState("");
  const [settingsUrl, setSettingsUrl] = useState("");
  const [notes, setNotes] = useState(requirement.implementation?.notes ?? "");

  const [generated, setGenerated] = useState<{
    text: string;
    shortText?: string;
    html?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [implementing, setImplementing] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "html" | "text">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);

  const availablePlacements = useMemo(() => {
    const set = new Set<TransparencyPlacement>();
    requirement.templates.forEach((t) => set.add(t.placement));
    // Permite și placement-uri care nu au template direct — fallback la limba.
    ALL_PLACEMENTS.forEach((p) => set.add(p));
    return Array.from(set);
  }, [requirement.templates]);

  const generate = useCallback(async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/transparency/notices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          noticeType: requirement.noticeType,
          placement,
          language,
          substitutions: {
            contactEmail: contactEmail || undefined,
            settingsUrl: settingsUrl || undefined,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`);
        setGenerated(null);
      } else {
        setGenerated({
          text: data.template?.text ?? "",
          shortText: data.template?.shortText,
          html: data.template?.html,
        });
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare la generare");
    } finally {
      setGenerating(false);
    }
  }, [
    systemId,
    requirement.noticeType,
    placement,
    language,
    contactEmail,
    settingsUrl,
  ]);

  // Auto-generate when tabs change
  useEffect(() => {
    void generate();
  }, [generate]);

  async function copy(payload: string, which: "html" | "text") {
    try {
      await navigator.clipboard.writeText(payload);
      setCopyState(which);
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setFeedback("Clipboard indisponibil — selectează manual textul.");
    }
  }

  async function markImplemented() {
    setImplementing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/transparency/notices/implement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          noticeType: requirement.noticeType,
          placement,
          language,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`);
      } else {
        setFeedback("✓ Marcat ca implementat.");
        await onChanged();
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare la marcare");
    } finally {
      setImplementing(false);
    }
  }

  async function unmarkImplemented() {
    if (!requirement.implementation) return;
    setImplementing(true);
    setFeedback(null);
    try {
      const res = await fetch(
        `/api/transparency/notices/implement?id=${encodeURIComponent(
          requirement.implementation.id,
        )}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedback(data?.error || `Eroare ${res.status}`);
      } else {
        setFeedback("Implementare ștearsă.");
        await onChanged();
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Eroare");
    } finally {
      setImplementing(false);
    }
  }

  const severityClass = severityStatusClass(requirement.severity);
  const severityPanelClass =
    requirement.severity === "critical"
      ? "tp-panel-tone-danger"
      : requirement.severity === "high"
        ? "tp-panel-tone-warning"
        : "tp-panel-tone-info";

  return (
    <div className="cr-stack tp-stack-tight">
      {/* Requirement summary */}
      <section className={`cr-panel ${severityPanelClass}`}>
        <div className="cr-panel__body">
          <div className="cr-inline-between tp-inline-start">
            <span className={`cr-status-pill ${severityClass}`}>
              {requirement.severity} · {requirement.article}
            </span>
            {requirement.implemented && (
              <span className="cr-status-pill cr-status-pill--ok">
                <CheckCircle2 size={11} /> Implementat
              </span>
            )}
          </div>
          <div className="cr-muted-copy tp-copy-strong">
            {requirement.obligation}
          </div>
          <div className="tp-meta-stack">
            <div className="tp-meta-note">{requirement.triggeredBy}</div>
            <div className="cr-summary-row">
              <span>Deadline aplicabilitate:</span>
              <strong>{requirement.deadline}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="cr-form-grid">
        <TransparencyField label="Limba">
          <div className="cr-segment-bar tp-segment-fill">
            {ALL_LANGUAGES.map((lang) => {
              const isActive = lang === language;
              return (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`cr-tab tp-tab-fill${isActive ? " is-active" : ""}`}
                >
                  {lang.toUpperCase()}
                </button>
              );
            })}
          </div>
        </TransparencyField>

        <TransparencyField label="Placement">
          <select
            className="cr-input"
            value={placement}
            onChange={(e) =>
              setPlacement(e.target.value as TransparencyPlacement)
            }
          >
            {availablePlacements.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_LABELS[p]}
              </option>
            ))}
          </select>
        </TransparencyField>
      </div>

      <div className="cr-form-grid">
        <TransparencyField label="Email contact (opțional)">
          <input
            className="cr-input"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="contact@firma.ro"
          />
        </TransparencyField>

        <TransparencyField label="URL preferințe (opțional)">
          <input
            className="cr-input"
            type="url"
            value={settingsUrl}
            onChange={(e) => setSettingsUrl(e.target.value)}
            placeholder="https://firma.ro/preferinte"
          />
        </TransparencyField>
      </div>

      <section className="cr-panel">
        <div className="cr-panel__header">
          <div>
            <h3 className="cr-panel__title">Text notice</h3>
            <p className="cr-panel__subtitle">
              Preview generat pentru combinația limbă + placement selectată.
            </p>
          </div>
        </div>
        <div className="cr-panel__body">
          <div className="tp-preview-block">
            {generating ? (
              <span className="cr-inline">
                <Loader2 size={12} className="tp-spin" />
                <span className="cr-muted">Se generează…</span>
              </span>
            ) : (
              generated?.text || "—"
            )}
          </div>
          <div className="cr-toolbar tp-toolbar-end">
            <div className="cr-toolbar__actions">
              <button
                onClick={() => generated?.text && copy(generated.text, "text")}
                disabled={!generated?.text}
                className="cr-btn cr-btn--secondary cr-btn--sm"
              >
                <Copy size={12} />
                {copyState === "text" ? "Copiat!" : "Copiază text"}
              </button>
              <button
                onClick={() => generated?.html && copy(generated.html, "html")}
                disabled={!generated?.html}
                className="cr-btn cr-btn--secondary cr-btn--sm"
              >
                <Copy size={12} />
                {copyState === "html" ? "Copiat!" : "Copiază HTML snippet"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {generated?.html && (
        <details className="cr-panel tp-details">
          <summary className="tp-details-summary">HTML source</summary>
          <div className="cr-panel__body">
            <pre className="tp-code-block">{generated.html}</pre>
          </div>
        </details>
      )}

      <section className="cr-panel">
        <div className="cr-panel__body">
          <TransparencyField label="Note implementare (opțional — unde ai pus notice-ul)">
            <input
              className="cr-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: footer pe /chat, popup la prima vizită"
            />
          </TransparencyField>
        </div>
        <div className="cr-panel__footer">
          <div className="cr-toolbar__actions">
            <button
              onClick={markImplemented}
              disabled={implementing || generating}
              className="cr-btn cr-btn--primary"
            >
              {implementing ? (
                <Loader2 size={12} className="tp-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              {requirement.implemented
                ? "Actualizează implementare"
                : "Marchează ca implementat"}
            </button>
            {requirement.implementation && (
              <button
                onClick={unmarkImplemented}
                disabled={implementing}
                className="cr-btn cr-btn--secondary"
              >
                Anulează marcaj
              </button>
            )}
          </div>
        </div>
      </section>

      {feedback && (
        <div className="cr-inline-note tp-inline-note-wrap">{feedback}</div>
      )}

      {requirement.implementation && (
        <div className="cr-inline-note tp-inline-note-wrap">
          Ultima implementare:{" "}
          {new Date(requirement.implementation.implementedAtISO).toLocaleString(
            "ro-RO",
          )}{" "}
          · {requirement.implementation.implementedByEmail} ·{" "}
          {requirement.implementation.placement} ·{" "}
          {requirement.implementation.language.toUpperCase()}
          {requirement.implementation.notes && (
            <>
              <br />
              <em>Notă: {requirement.implementation.notes}</em>
            </>
          )}
        </div>
      )}

      <a
        href="https://eur-lex.europa.eu/eli/reg/2024/1689/oj"
        target="_blank"
        rel="noopener noreferrer"
        className="cr-link tp-link-inline"
      >
        <ExternalLink size={11} />
        Textul oficial EU AI Act (EUR-Lex)
      </a>
    </div>
  );
}

// ============================================================================
//   Sprint 023.7 — Content Register tab (per-asset Art. 50)
// ============================================================================

type AnnotatedAsset = AIContentLabeledAsset & {
  gap: { providerGap?: string; deployerGap?: string; editorialGap?: string };
  hasAnyGap: boolean;
  appliedDutyType: "provider_marking" | "deployer_disclosure" | "both";
};

type ContentRegisterResponse = {
  assets: AnnotatedAsset[];
  summary: {
    total: number;
    withProviderMarking: number;
    withDeployerDisclosure: number;
    publicInterestReviewed: number;
    unresolvedGaps: number;
    byType: Partial<Record<AIContentAssetType, number>>;
  };
  schema: {
    version: string;
    assetTypes: AIContentAssetType[];
    standards: ContentLabelingStandard[];
    placements: TransparencyPlacement[];
    languages: TransparencyLanguage[];
  };
};

const ASSET_TYPE_LABELS: Record<AIContentAssetType, string> = {
  image: "Imagine sintetică",
  video: "Video sintetic",
  audio: "Audio sintetic",
  text_synthetic: "Text sintetic",
  deepfake: "Deepfake (Art. 50(4)(a))",
  public_interest_text: "Text public-interest (Art. 50(4)(b))",
  chatbot_interaction: "Sesiune chatbot (Art. 50(1))",
  other: "Altul",
};

const STANDARD_LABELS: Record<ContentLabelingStandard, string> = {
  c2pa: "C2PA",
  iptc_photo_metadata: "IPTC PhotoMetadata",
  watermark_visible: "Watermark vizibil",
  watermark_invisible: "Watermark invizibil (SynthID etc.)",
  metadata_only: "Metadata generică",
  none: "— niciunul —",
};

const PLACEMENT_LABELS_FULL: Record<TransparencyPlacement, string> = {
  popup: "Popup / modal",
  footer: "Footer pagină",
  header: "Banner header",
  "email-signature": "Semnătură email",
  "video-overlay": "Overlay video",
  inline: "Inline / badge",
  advertisement: "Reclamă plătită",
  "social-post": "Post social media",
  broadcast: "Email broadcast / newsletter / push",
};

const EVIDENCE_TYPE_LABELS: Record<AIContentEvidenceType, string> = {
  screenshot: "Screenshot disclosure",
  sample_file: "Fișier exemplu",
  metadata_proof: "Dovadă metadata (C2PA/IPTC)",
  editorial_log: "Log editorial",
  watermark_test: "Test watermark",
  other: "Altul",
};

function iconForType(type: AIContentAssetType): React.ReactNode {
  switch (type) {
    case "image":
      return <ImageIcon size={14} />;
    case "video":
      return <Video size={14} />;
    case "audio":
      return <Music size={14} />;
    case "deepfake":
      return <ShieldAlert size={14} className="tp-danger-icon" />;
    case "chatbot_interaction":
      return <MessageSquare size={14} />;
    default:
      return <FileText size={14} />;
  }
}

function ContentRegisterTab() {
  const [data, setData] = useState<ContentRegisterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<AIContentAssetType | "all">(
    "all",
  );
  const [filterGap, setFilterGap] = useState<"all" | "with-gap" | "no-gap">(
    "all",
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/transparency/content-assets", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `HTTP ${res.status}`);
        return;
      }
      const json = (await res.json()) as ContentRegisterResponse;
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare la încărcare");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let out = data.assets;
    if (filterType !== "all")
      out = out.filter((a) => a.assetType === filterType);
    if (filterGap === "with-gap") out = out.filter((a) => a.hasAnyGap);
    if (filterGap === "no-gap") out = out.filter((a) => !a.hasAnyGap);
    return out;
  }, [data, filterType, filterGap]);

  const assetTableColumns = {
    "--cr-data-columns": "auto 1.8fr 1fr 1fr 1fr auto",
  } as React.CSSProperties;

  return (
    <div className="cr-stack tp-stack-tight">
      <div className="cr-stat-strip tp-stat-strip-five">
        {[
          { label: "Total assets", value: data?.summary.total ?? 0 },
          {
            label: "Cu provider marking",
            value: data?.summary.withProviderMarking ?? 0,
          },
          {
            label: "Cu deployer disclosure",
            value: data?.summary.withDeployerDisclosure ?? 0,
          },
          {
            label: "Public-interest review",
            value: data?.summary.publicInterestReviewed ?? 0,
          },
          {
            label: "Unresolved gaps",
            value: data?.summary.unresolvedGaps ?? 0,
            danger: (data?.summary.unresolvedGaps ?? 0) > 0,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`cr-stat${stat.danger ? " tp-stat-card-danger" : ""}`}
          >
            <div
              className={`cr-stat__value${stat.danger ? " tp-stat-value-danger" : ""}`}
            >
              {stat.value}
            </div>
            <div className="cr-stat__label">{stat.label}</div>
            <div className="cr-stat__sub">
              {stat.label === "Total assets" &&
                "Toate asset-urile AI înregistrate"}
              {stat.label === "Cu provider marking" &&
                "Assets cu marcaj tehnic machine-readable"}
              {stat.label === "Cu deployer disclosure" &&
                "Assets cu disclosure vizibil publicat"}
              {stat.label === "Public-interest review" &&
                "Cazuri cu review editorial documentat"}
              {stat.label === "Unresolved gaps" &&
                "Gap-uri Art. 50 încă deschise"}
            </div>
          </div>
        ))}
      </div>

      <div className="cr-toolbar">
        <div className="cr-toolbar__filters">
          <select
            className="cr-input tp-toolbar-select"
            value={filterType}
            onChange={(e) =>
              setFilterType(e.target.value as AIContentAssetType | "all")
            }
          >
            <option value="all">Toate tipurile</option>
            {Object.entries(ASSET_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="cr-input tp-toolbar-select"
            value={filterGap}
            onChange={(e) =>
              setFilterGap(e.target.value as "all" | "with-gap" | "no-gap")
            }
          >
            <option value="all">Toate gap-urile</option>
            <option value="with-gap">Doar cu gap nerezolvat</option>
            <option value="no-gap">Doar fără gap</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="cr-btn cr-btn--primary"
        >
          <Plus size={14} />
          Adaugă asset
        </button>
      </div>

      {loading && (
        <div className="cr-inline-note">
          <Loader2 size={14} className="tp-spin" />
          Se încarcă registrul de content assets…
        </div>
      )}
      {error && !loading && (
        <div role="alert" className="cr-alert cr-alert--danger">
          {error}
        </div>
      )}

      {!loading && !error && data && filtered.length === 0 && (
        <div className="cr-empty">
          Niciun asset înregistrat. Înregistrează prima piesă de conținut AI
          (imagine, video, deepfake, text public-interest, chatbot) cu butonul
          „Adaugă asset".
        </div>
      )}

      {!loading && !error && data && filtered.length > 0 && (
        <div
          className="cr-data-shell cr-data-shell--accordion"
          style={assetTableColumns}
        >
          <div className="cr-data-head">
            <div className="cr-data-cell">Tip</div>
            <div className="cr-data-cell">Asset</div>
            <div className="cr-data-cell">Provider duty</div>
            <div className="cr-data-cell">Deployer duty</div>
            <div className="cr-data-cell">Gap</div>
            <div className="cr-data-cell cr-data-cell--actions">Detalii</div>
          </div>
          {filtered.map((asset) => {
            const isExpanded = expandedAssetId === asset.id;
            return (
              <div key={asset.id} className="tp-asset-entry">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedAssetId(isExpanded ? null : asset.id)
                  }
                  className={`cr-data-row tp-asset-row${isExpanded ? " tp-asset-row--expanded" : ""}`}
                >
                  <div className="cr-data-cell tp-asset-icon-cell">
                    {iconForType(asset.assetType)}
                  </div>
                  <div className="cr-data-cell">
                    <div className="tp-row-title">{asset.title}</div>
                    <div className="tp-row-subline">
                      {ASSET_TYPE_LABELS[asset.assetType]}
                      {asset.distributionContext.length > 0 &&
                        ` · ${asset.distributionContext.join(", ")}`}
                    </div>
                  </div>
                  <div className="cr-data-cell">
                    <span
                      className={`cr-status-pill ${
                        asset.providerMarkingApplied
                          ? "cr-status-pill--ok"
                          : "cr-status-pill--neutral"
                      }`}
                    >
                      {asset.providerMarkingApplied ? (
                        <ShieldCheck size={12} />
                      ) : (
                        <ShieldAlert size={12} />
                      )}
                      {asset.providerMarkingApplied
                        ? STANDARD_LABELS[asset.providerMarkingStandard]
                        : "Fără mark"}
                    </span>
                  </div>
                  <div className="cr-data-cell">
                    <span
                      className={`cr-status-pill ${
                        asset.deployerDisclosureApplied
                          ? "cr-status-pill--ok"
                          : "cr-status-pill--neutral"
                      }`}
                    >
                      {asset.deployerDisclosureApplied ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <X size={12} />
                      )}
                      {asset.deployerDisclosureApplied
                        ? asset.deployerDisclosurePlacement
                          ? PLACEMENT_LABELS_FULL[
                              asset.deployerDisclosurePlacement
                            ]
                          : "DA"
                        : "Fără disclosure"}
                    </span>
                  </div>
                  <div className="cr-data-cell">
                    {asset.hasAnyGap ? (
                      <span className="cr-status-pill cr-status-pill--danger">
                        {[
                          asset.gap.providerGap ? "provider" : null,
                          asset.gap.deployerGap ? "deployer" : null,
                          asset.gap.editorialGap ? "editorial" : null,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : (
                      <span className="cr-status-pill cr-status-pill--ok">
                        <CheckCircle2 size={11} /> Complet
                      </span>
                    )}
                  </div>
                  <div className="cr-data-cell cr-data-cell--actions">
                    {isExpanded ? (
                      <ChevronUp size={14} />
                    ) : (
                      <ChevronDown size={14} />
                    )}
                  </div>
                </button>
                {isExpanded && (
                  <div className="cr-data-row__detail">
                    <ContentAssetDetails asset={asset} onChanged={load} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && data && (
        <ContentAssetCreateModal
          schema={data.schema}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Inline expanded asset details panel
// ────────────────────────────────────────────────────────────────────────────

function ContentAssetDetails({
  asset,
  onChanged,
}: {
  asset: AnnotatedAsset;
  onChanged: () => void | Promise<void>;
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const markProviderApplied = async () => {
    setBusy("provider");
    setActionError(null);
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerMarkingApplied: true,
          providerMarkingStandard:
            asset.providerMarkingStandard === "none"
              ? "c2pa"
              : asset.providerMarkingStandard,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await onChanged();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  };

  const markDeployerApplied = async () => {
    setBusy("deployer");
    setActionError(null);
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deployerDisclosureApplied: true,
          deployerDisclosurePlacement:
            asset.deployerDisclosurePlacement ?? "footer",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await onChanged();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  };

  const deleteAsset = async () => {
    if (
      !window.confirm(
        `Ștergi asset-ul „${asset.title}"? Toate findings linkate se închid automat.`,
      )
    )
      return;
    setBusy("delete");
    setActionError(null);
    try {
      const res = await fetch(`/api/transparency/content-assets/${asset.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await onChanged();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="cr-stack tp-stack-tight">
      {asset.hasAnyGap && (
        <div className="cr-stack tp-stack-compact">
          {asset.gap.providerGap && (
            <div className="cr-alert cr-alert--warning">
              <strong>Provider gap (Art. 50(2)):</strong>{" "}
              {asset.gap.providerGap}
            </div>
          )}
          {asset.gap.deployerGap && (
            <div className="cr-alert cr-alert--danger">
              <strong>Deployer gap:</strong> {asset.gap.deployerGap}
            </div>
          )}
          {asset.gap.editorialGap && (
            <div className="cr-alert cr-alert--warning">
              <strong>Editorial gap (Art. 50(4)(b)):</strong>{" "}
              {asset.gap.editorialGap}
            </div>
          )}
        </div>
      )}

      <div className="cr-kv-grid tp-detail-grid">
        <section className="cr-panel">
          <div className="cr-panel__body">
            <div className="tp-section-title">
              A. Provider duty (Art. 50(2))
            </div>
            <div className="cr-summary-row">
              <span>Marcaj aplicat:</span>
              <strong>{asset.providerMarkingApplied ? "DA" : "NU"}</strong>
            </div>
            <div className="cr-summary-row">
              <span>Standard:</span>
              <strong>{STANDARD_LABELS[asset.providerMarkingStandard]}</strong>
            </div>
            {asset.providerMarkingProof && (
              <div className="cr-summary-row">
                <span>Dovadă:</span>
                <span>{asset.providerMarkingProof}</span>
              </div>
            )}
          </div>
        </section>

        <section className="cr-panel">
          <div className="cr-panel__body">
            <div className="tp-section-title">
              B. Deployer duty (Art. 50(1)/(3)/(4))
            </div>
            <div className="cr-summary-row">
              <span>Disclosure aplicat:</span>
              <strong>{asset.deployerDisclosureApplied ? "DA" : "NU"}</strong>
            </div>
            {asset.deployerDisclosurePlacement && (
              <div className="cr-summary-row">
                <span>Placement:</span>
                <strong>
                  {PLACEMENT_LABELS_FULL[asset.deployerDisclosurePlacement]}
                </strong>
              </div>
            )}
            {asset.deployerDisclosureLanguage && (
              <div className="cr-summary-row">
                <span>Limbă:</span>
                <strong>
                  {asset.deployerDisclosureLanguage.toUpperCase()}
                </strong>
              </div>
            )}
            {asset.deployerDisclosureText && (
              <div className="tp-quote-block">
                „{asset.deployerDisclosureText}”
              </div>
            )}
          </div>
        </section>

        {(asset.assetType === "public_interest_text" ||
          asset.isPublicInterest) && (
          <section className="cr-panel">
            <div className="cr-panel__body">
              <div className="tp-section-title">
                C. Editorial review (Art. 50(4)(b))
              </div>
              <div className="cr-summary-row">
                <span>Editorial responsibility claim:</span>
                <strong>
                  {asset.editorialResponsibilityClaim ? "DA" : "NU"}
                </strong>
              </div>
              {asset.editorialReviewBy && (
                <div className="cr-summary-row">
                  <span>Editor:</span>
                  <strong>{asset.editorialReviewBy}</strong>
                </div>
              )}
              {asset.editorialReviewAtISO && (
                <div className="cr-summary-row">
                  <span>Data revizuire:</span>
                  <strong>{asset.editorialReviewAtISO}</strong>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="cr-panel">
          <div className="cr-panel__body">
            <div className="tp-section-title">
              D. Evidence ({asset.evidenceItems.length})
            </div>
            {asset.evidenceItems.length === 0 ? (
              <div className="tp-meta-note">Nicio dovadă atașată.</div>
            ) : (
              <ul className="tp-evidence-list">
                {asset.evidenceItems.map((ev) => (
                  <li key={ev.id}>
                    <strong>{EVIDENCE_TYPE_LABELS[ev.type]}:</strong>{" "}
                    {ev.description}
                    {ev.url && (
                      <>
                        {" "}
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="cr-link"
                        >
                          link
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {asset.linkedFindingIds.length > 0 && (
        <div className="cr-inline-note tp-inline-note-wrap">
          Findings linkate:{" "}
          {asset.linkedFindingIds.map((fid) => (
            <a key={fid} href={`/dashboard/resolve/${fid}`} className="cr-link">
              {fid}
            </a>
          ))}
        </div>
      )}

      <div className="cr-toolbar tp-toolbar-end">
        <div className="cr-toolbar__actions">
          {!asset.providerMarkingApplied && (
            <button
              onClick={markProviderApplied}
              disabled={busy !== null}
              className="cr-btn cr-btn--secondary cr-btn--sm"
            >
              {busy === "provider" ? (
                <Loader2 size={12} className="tp-spin" />
              ) : (
                <ShieldCheck size={12} />
              )}
              Marchează provider mark aplicat
            </button>
          )}
          {!asset.deployerDisclosureApplied && (
            <button
              onClick={markDeployerApplied}
              disabled={busy !== null}
              className="cr-btn cr-btn--secondary cr-btn--sm"
            >
              {busy === "deployer" ? (
                <Loader2 size={12} className="tp-spin" />
              ) : (
                <CheckCircle2 size={12} />
              )}
              Marchează deployer disclosure aplicat
            </button>
          )}
          <button
            onClick={() => setShowEvidence(true)}
            className="cr-btn cr-btn--secondary cr-btn--sm"
          >
            <Upload size={12} />
            Atașează dovadă
          </button>
          <button
            onClick={deleteAsset}
            disabled={busy !== null}
            className="cr-btn cr-btn--danger cr-btn--sm"
          >
            {busy === "delete" ? (
              <Loader2 size={12} className="tp-spin" />
            ) : (
              <Trash2 size={12} />
            )}
            Șterge
          </button>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="cr-alert cr-alert--danger">
          {actionError}
        </div>
      )}

      {showEvidence && (
        <AttachEvidenceModal
          assetId={asset.id}
          onClose={() => setShowEvidence(false)}
          onAttached={() => {
            setShowEvidence(false);
            void onChanged();
          }}
        />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Create asset modal
// ────────────────────────────────────────────────────────────────────────────

function ContentAssetCreateModal({
  schema,
  onClose,
  onCreated,
}: {
  schema: ContentRegisterResponse["schema"];
  onClose: () => void;
  onCreated: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [assetType, setAssetType] = useState<AIContentAssetType>("image");
  const [distributionContext, setDistributionContext] = useState("");
  const [providerMarkingApplied, setProviderMarkingApplied] = useState(false);
  const [providerMarkingStandard, setProviderMarkingStandard] =
    useState<ContentLabelingStandard>("none");
  const [providerMarkingProof, setProviderMarkingProof] = useState("");
  const [deployerDisclosureApplied, setDeployerDisclosureApplied] =
    useState(false);
  const [deployerDisclosurePlacement, setDeployerDisclosurePlacement] =
    useState<TransparencyPlacement>("footer");
  const [deployerDisclosureText, setDeployerDisclosureText] = useState("");
  const [deployerDisclosureLanguage, setDeployerDisclosureLanguage] =
    useState<TransparencyLanguage>("ro");
  const [isPublicInterest, setIsPublicInterest] = useState(false);
  const [editorialReviewBy, setEditorialReviewBy] = useState("");
  const [editorialResponsibilityClaim, setEditorialResponsibilityClaim] =
    useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showPublicInterestSection =
    assetType === "public_interest_text" || isPublicInterest;

  const submit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Titlul este obligatoriu.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transparency/content-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          assetType,
          distributionContext: distributionContext
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          providerMarkingApplied,
          providerMarkingStandard,
          providerMarkingProof: providerMarkingProof.trim() || undefined,
          deployerDisclosureApplied,
          deployerDisclosurePlacement: deployerDisclosureApplied
            ? deployerDisclosurePlacement
            : undefined,
          deployerDisclosureText: deployerDisclosureApplied
            ? deployerDisclosureText.trim() || undefined
            : undefined,
          deployerDisclosureLanguage: deployerDisclosureApplied
            ? deployerDisclosureLanguage
            : undefined,
          isPublicInterest: isPublicInterest || undefined,
          editorialReviewBy: editorialReviewBy.trim() || undefined,
          editorialResponsibilityClaim: showPublicInterestSection
            ? editorialResponsibilityClaim
            : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} className="cr-modal-backdrop">
      <div
        onClick={(e) => e.stopPropagation()}
        className="cr-modal cr-modal--lg"
      >
        <div className="cr-modal__header">
          <div>
            <h2 className="cr-modal__title">
              Adaugă asset — Content Register Art. 50
            </h2>
            <div className="cr-modal__subtitle">
              Înregistrează provider duty, deployer disclosure și review
              editorial în același flux.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="cr-icon-button cr-modal__close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="cr-modal__body tp-modal-scroll">
          <div className="cr-form-grid">
            <TransparencyField label="Titlu asset *" spanTwo>
              <input
                className="cr-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Banner reclamă produs X — generat Midjourney"
              />
            </TransparencyField>

            <TransparencyField label="Tip asset *">
              <select
                className="cr-input"
                value={assetType}
                onChange={(e) =>
                  setAssetType(e.target.value as AIContentAssetType)
                }
              >
                {schema.assetTypes.map((t) => (
                  <option key={t} value={t}>
                    {ASSET_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </TransparencyField>

            <TransparencyField label="Canale distribuție (separate prin virgulă)">
              <input
                className="cr-input"
                value={distributionContext}
                onChange={(e) => setDistributionContext(e.target.value)}
                placeholder="ex: LinkedIn Ads, Website hero, Newsletter"
              />
            </TransparencyField>
          </div>

          <section className="cr-panel">
            <div className="cr-panel__body">
              <div className="tp-section-title">
                A. Provider duty (Art. 50(2))
              </div>
              <label className="cr-checkbox-row">
                <input
                  type="checkbox"
                  checked={providerMarkingApplied}
                  onChange={(e) => setProviderMarkingApplied(e.target.checked)}
                />
                <span>Marcaj tehnic machine-readable aplicat</span>
              </label>
              <div className="cr-form-grid">
                <TransparencyField label="Standard">
                  <select
                    className="cr-input"
                    value={providerMarkingStandard}
                    onChange={(e) =>
                      setProviderMarkingStandard(
                        e.target.value as ContentLabelingStandard,
                      )
                    }
                  >
                    {schema.standards.map((s) => (
                      <option key={s} value={s}>
                        {STANDARD_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </TransparencyField>

                <TransparencyField label="Dovadă marcaj (URL sau notă)">
                  <input
                    className="cr-input"
                    value={providerMarkingProof}
                    onChange={(e) => setProviderMarkingProof(e.target.value)}
                    placeholder="ex: https://verify.c2pa.org/asset/xyz sau IPTC Digital Source Type=trainedAlgorithmicMedia"
                  />
                </TransparencyField>
              </div>
            </div>
          </section>

          <section className="cr-panel">
            <div className="cr-panel__body">
              <div className="tp-section-title">
                B. Deployer duty (Art. 50(1)/(3)/(4))
              </div>
              <label className="cr-checkbox-row">
                <input
                  type="checkbox"
                  checked={deployerDisclosureApplied}
                  onChange={(e) =>
                    setDeployerDisclosureApplied(e.target.checked)
                  }
                />
                <span>Disclosure vizibil aplicat către utilizatori</span>
              </label>

              {deployerDisclosureApplied && (
                <>
                  <div className="cr-form-grid">
                    <TransparencyField label="Placement">
                      <select
                        className="cr-input"
                        value={deployerDisclosurePlacement}
                        onChange={(e) =>
                          setDeployerDisclosurePlacement(
                            e.target.value as TransparencyPlacement,
                          )
                        }
                      >
                        {schema.placements.map((p) => (
                          <option key={p} value={p}>
                            {PLACEMENT_LABELS_FULL[p]}
                          </option>
                        ))}
                      </select>
                    </TransparencyField>

                    <TransparencyField label="Limbă">
                      <select
                        className="cr-input"
                        value={deployerDisclosureLanguage}
                        onChange={(e) =>
                          setDeployerDisclosureLanguage(
                            e.target.value as TransparencyLanguage,
                          )
                        }
                      >
                        {schema.languages.map((l) => (
                          <option key={l} value={l}>
                            {l.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </TransparencyField>
                  </div>

                  <TransparencyField
                    label="Text disclosure (cum apare vizibil)"
                    spanTwo
                  >
                    <textarea
                      className="cr-input tp-textarea"
                      value={deployerDisclosureText}
                      onChange={(e) =>
                        setDeployerDisclosureText(e.target.value)
                      }
                      rows={2}
                      placeholder="ex: „Conținut generat cu AI — Art. 50(2) EU AI Act”"
                    />
                  </TransparencyField>
                </>
              )}
            </div>
          </section>

          {(assetType === "public_interest_text" ||
            assetType === "text_synthetic") && (
            <section className="cr-panel">
              <div className="cr-panel__body">
                <div className="tp-section-title">
                  C. Public-interest editorial (Art. 50(4)(b))
                </div>
                <label className="cr-checkbox-row">
                  <input
                    type="checkbox"
                    checked={isPublicInterest}
                    onChange={(e) => setIsPublicInterest(e.target.checked)}
                  />
                  <span>Conținutul este pe un subiect de interes public</span>
                </label>

                {showPublicInterestSection && (
                  <>
                    <label className="cr-checkbox-row">
                      <input
                        type="checkbox"
                        checked={editorialResponsibilityClaim}
                        onChange={(e) =>
                          setEditorialResponsibilityClaim(e.target.checked)
                        }
                      />
                      <span>
                        Editorul își asumă responsabilitatea editorială
                        (derogare Art. 50(4)(b))
                      </span>
                    </label>

                    <TransparencyField label="Editor responsabil (email)">
                      <input
                        className="cr-input"
                        value={editorialReviewBy}
                        onChange={(e) => setEditorialReviewBy(e.target.value)}
                        placeholder="editor@news.ro"
                      />
                    </TransparencyField>
                  </>
                )}
              </div>
            </section>
          )}

          <TransparencyField label="Note interne" spanTwo>
            <textarea
              className="cr-input tp-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="(opțional) context, decizii editoriale, etc."
            />
          </TransparencyField>

          {error && (
            <div role="alert" className="cr-alert cr-alert--danger">
              {error}
            </div>
          )}
        </div>

        <div className="cr-modal__footer">
          <div />
          <div className="cr-toolbar__actions">
            <button
              onClick={onClose}
              disabled={submitting}
              className="cr-btn cr-btn--secondary"
            >
              Anulează
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="cr-btn cr-btn--primary"
            >
              {submitting && <Loader2 size={12} className="tp-spin" />}
              Salvează asset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
//   Attach evidence modal
// ────────────────────────────────────────────────────────────────────────────

function AttachEvidenceModal({
  assetId,
  onClose,
  onAttached,
}: {
  assetId: string;
  onClose: () => void;
  onAttached: () => void | Promise<void>;
}) {
  const [type, setType] = useState<AIContentEvidenceType>("screenshot");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileHash, setFileHash] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (description.trim().length < 3) {
      setError("Descriere min 3 caractere.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/transparency/content-assets/${assetId}/evidence`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type,
            description: description.trim(),
            url: url.trim() || undefined,
            fileName: fileName.trim() || undefined,
            fileHash: fileHash.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      await onAttached();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eroare");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div onClick={onClose} className="cr-modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} className="cr-modal">
        <div className="cr-modal__header">
          <div>
            <h2 className="cr-modal__title">Atașează dovadă Art. 50</h2>
            <div className="cr-modal__subtitle">
              Păstrează artefactele de verificare pentru provider și deployer
              duty.
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="cr-icon-button cr-modal__close"
          >
            <X size={14} />
          </button>
        </div>

        <div className="cr-modal__body">
          <TransparencyField label="Tip dovadă">
            <select
              className="cr-input"
              value={type}
              onChange={(e) => setType(e.target.value as AIContentEvidenceType)}
            >
              {Object.entries(EVIDENCE_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </TransparencyField>

          <TransparencyField label="Descriere *" spanTwo>
            <textarea
              className="cr-input tp-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="ex: Screenshot post LinkedIn cu eticheta „Generated by AI” vizibilă în footer."
            />
          </TransparencyField>

          <TransparencyField label="URL dovadă (opțional)" spanTwo>
            <input
              className="cr-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://…"
            />
          </TransparencyField>

          <div className="cr-form-grid">
            <TransparencyField label="Nume fișier (opțional)">
              <input
                className="cr-input"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="screenshot.png"
              />
            </TransparencyField>

            <TransparencyField label="SHA-256 hash (opțional)">
              <input
                className="cr-input tp-input-mono"
                value={fileHash}
                onChange={(e) => setFileHash(e.target.value)}
                placeholder="ex: f3a8…"
              />
            </TransparencyField>
          </div>

          {error && (
            <div role="alert" className="cr-alert cr-alert--danger">
              {error}
            </div>
          )}
        </div>

        <div className="cr-modal__footer">
          <div />
          <div className="cr-toolbar__actions">
            <button
              onClick={onClose}
              disabled={submitting}
              className="cr-btn cr-btn--secondary cr-btn--sm"
            >
              Anulează
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="cr-btn cr-btn--primary cr-btn--sm"
            >
              {submitting && <Loader2 size={11} className="tp-spin" />}
              Atașează
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
