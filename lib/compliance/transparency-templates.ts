// Art. 50 EU AI Act — Transparency Notice Templates (Sprint 6)
//
// Templates RO + EN pentru fiecare tip de notice de transparență, organizate
// per placement (popup / footer / header / email-signature / video-overlay /
// inline).
//
// Convenții:
//   - Toate textele RO sunt corecte juridic, citează articolul aplicabil.
//   - Variantele EN sunt traduceri funcționale (nu juridice) pentru clienții
//     internaționali ai cabinetelor.
//   - Placeholders între paranteze drepte: [SYSTEM_NAME], [VENDOR],
//     [CONTACT_EMAIL], [SETTINGS_URL], [DATE], [MODEL_NAME].
//
// Aplicabilitate generală Art. 50: 2 august 2026.
// Aplicabilitate etichetare conținut sintetic (watermark Art. 50(2)):
//   2 decembrie 2026 (extindere prin Omnibus mai 2026).

import type {
  TransparencyLanguage,
  TransparencyNoticeType,
  TransparencyPlacement,
  TransparencyTemplate,
} from "@/lib/compliance/types"

// ────────────────────────────────────────────────────────────────────────────
//   Helpers — substituire placeholders
// ────────────────────────────────────────────────────────────────────────────

export type TemplateSubstitutions = {
  systemName?: string
  vendor?: string
  contactEmail?: string
  settingsUrl?: string
  modelName?: string
  dateISO?: string
}

function applySubstitutions(text: string, sub: TemplateSubstitutions): string {
  const dateLabel = sub.dateISO
    ? (() => {
        try {
          return new Date(sub.dateISO).toLocaleDateString("ro-RO")
        } catch {
          return sub.dateISO
        }
      })()
    : "[DATE]"
  return text
    .replaceAll("[SYSTEM_NAME]", sub.systemName ?? "[SYSTEM_NAME]")
    .replaceAll("[VENDOR]", sub.vendor ?? "[VENDOR]")
    .replaceAll("[CONTACT_EMAIL]", sub.contactEmail ?? "[CONTACT_EMAIL]")
    .replaceAll("[SETTINGS_URL]", sub.settingsUrl ?? "[SETTINGS_URL]")
    .replaceAll("[MODEL_NAME]", sub.modelName ?? "[MODEL_NAME]")
    .replaceAll("[DATE]", dateLabel)
}

/** Wrap text într-un HTML snippet minimal, gata de copy-paste. */
function buildHtml(
  text: string,
  placement: TransparencyPlacement
): string {
  const safe = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
  switch (placement) {
    case "popup":
      return `<div role="dialog" aria-label="Notificare AI" style="position:fixed;bottom:16px;right:16px;max-width:360px;padding:14px 16px;background:#0f172a;color:#fff;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.25);font:13px/1.5 system-ui,-apple-system,sans-serif;z-index:9999;">${safe}</div>`
    case "footer":
      return `<div data-ai-notice="art-50" style="padding:10px 16px;background:#f1f5f9;color:#0f172a;border-top:1px solid #e2e8f0;font:12px/1.45 system-ui,-apple-system,sans-serif;text-align:center;">${safe}</div>`
    case "header":
      return `<div data-ai-notice="art-50" role="status" style="padding:8px 16px;background:#fef3c7;color:#78350f;border-bottom:1px solid #fcd34d;font:12px/1.45 system-ui,-apple-system,sans-serif;text-align:center;">${safe}</div>`
    case "email-signature":
      return `<p style="margin:8px 0 0;font:11px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#64748b;">${safe}</p>`
    case "video-overlay":
      return `<div data-ai-notice="art-50" style="position:absolute;top:8px;left:8px;padding:6px 10px;background:rgba(15,23,42,0.85);color:#fff;border-radius:6px;font:12px/1.3 system-ui,-apple-system,sans-serif;letter-spacing:0.01em;">${safe}</div>`
    case "inline":
    default:
      return `<span data-ai-notice="art-50" style="display:inline-block;padding:2px 8px;background:#e0e7ff;color:#3730a3;border-radius:4px;font:11px/1.3 system-ui,-apple-system,sans-serif;">${safe}</span>`
  }
}

// ────────────────────────────────────────────────────────────────────────────
//   Library — toate template-urile, organizate pe noticeType
// ────────────────────────────────────────────────────────────────────────────

const LIBRARY: Record<TransparencyNoticeType, TransparencyTemplate[]> = {
  "chatbot-disclosure": [
    {
      language: "ro",
      placement: "popup",
      text:
        "Acest serviciu este oferit de un sistem AI ([SYSTEM_NAME]). Răspunsurile sunt generate automat. Pentru asistență umană, scrie „operator” sau contactează-ne la [CONTACT_EMAIL]. Conform Art. 50(1) EU AI Act.",
      shortText: "Discuți cu un AI. Scrie „operator” pentru asistență umană.",
    },
    {
      language: "ro",
      placement: "header",
      text:
        "Atenție: chat-ul folosește un sistem AI ([SYSTEM_NAME]). Răspunsurile pot fi generate automat (Art. 50 EU AI Act).",
      shortText: "Chat asistat de AI",
    },
    {
      language: "ro",
      placement: "footer",
      text:
        "🤖 Asistat de AI ([SYSTEM_NAME]) — Art. 50 EU AI Act. Pentru asistență umană: [CONTACT_EMAIL].",
      shortText: "Asistat de AI (Art. 50)",
    },
    {
      language: "en",
      placement: "popup",
      text:
        "This service is powered by an AI system ([SYSTEM_NAME]). Responses are generated automatically. For human support, type “human” or contact us at [CONTACT_EMAIL]. Pursuant to Art. 50(1) EU AI Act.",
      shortText: "You’re talking to an AI. Type “human” for live support.",
    },
    {
      language: "en",
      placement: "footer",
      text:
        "🤖 Powered by AI ([SYSTEM_NAME]) — Art. 50 EU AI Act. Human support: [CONTACT_EMAIL].",
      shortText: "AI-assisted (Art. 50)",
    },
  ],

  "ai-generated-content": [
    {
      language: "ro",
      placement: "footer",
      text:
        "Acest conținut conține elemente generate cu inteligență artificială. Generat la [DATE] folosind [MODEL_NAME]. Conform Art. 50(2) EU AI Act.",
      shortText: "Conținut generat cu AI ([MODEL_NAME])",
    },
    {
      language: "ro",
      placement: "inline",
      text: "🪄 Conținut generat cu AI ([MODEL_NAME], [DATE])",
      shortText: "Generat cu AI",
    },
    {
      language: "ro",
      placement: "header",
      text:
        "Notă editorială: acest material conține text/imagini generate sau modificate cu AI ([SYSTEM_NAME]). Etichetare obligatorie din 2 decembrie 2026 — Art. 50(2) EU AI Act.",
    },
    {
      language: "en",
      placement: "footer",
      text:
        "This content contains material generated with artificial intelligence. Created on [DATE] using [MODEL_NAME]. Pursuant to Art. 50(2) EU AI Act.",
      shortText: "AI-generated content ([MODEL_NAME])",
    },
    {
      language: "en",
      placement: "inline",
      text: "🪄 AI-generated ([MODEL_NAME], [DATE])",
      shortText: "AI-generated",
    },
  ],

  "deepfake-disclosure": [
    {
      language: "ro",
      placement: "video-overlay",
      text:
        "⚠️ Conținut manipulat artificial — Acest material conține imagini/audio modificate cu AI ([SYSTEM_NAME]). Originalul reprezintă o realitate diferită. Conform Art. 50(4) EU AI Act.",
      shortText: "⚠️ Deepfake / conținut manipulat cu AI",
    },
    {
      language: "ro",
      placement: "header",
      text:
        "Avertisment: acest material este un deepfake — generat sau modificat artificial cu [SYSTEM_NAME]. Disclosure obligatoriu conform Art. 50(4) EU AI Act.",
    },
    {
      language: "ro",
      placement: "footer",
      text:
        "Acest material este un deepfake — generat sau modificat artificial. Disclosure conform Art. 50(4) EU AI Act.",
      shortText: "Deepfake — Art. 50(4)",
    },
    {
      language: "en",
      placement: "video-overlay",
      text:
        "⚠️ Artificially manipulated content — This material contains images/audio altered with AI ([SYSTEM_NAME]). The original depicts a different reality. Pursuant to Art. 50(4) EU AI Act.",
      shortText: "⚠️ Deepfake / AI-manipulated",
    },
    {
      language: "en",
      placement: "footer",
      text:
        "This material is a deepfake — artificially generated or manipulated. Disclosure pursuant to Art. 50(4) EU AI Act.",
      shortText: "Deepfake — Art. 50(4)",
    },
  ],

  "personalization-notice": [
    {
      language: "ro",
      placement: "footer",
      text:
        "Conținutul afișat este personalizat folosind sisteme automate (AI — [SYSTEM_NAME]). Poți schimba preferințele la [SETTINGS_URL]. Conform Art. 50 EU AI Act și GDPR Art. 13/14.",
      shortText: "Conținut personalizat cu AI · [SETTINGS_URL]",
    },
    {
      language: "ro",
      placement: "popup",
      text:
        "Recomandările și ofertele pe care le vezi sunt personalizate cu ajutorul unui sistem AI ([SYSTEM_NAME]). Detalii și opt-out: [SETTINGS_URL] sau scrie la [CONTACT_EMAIL].",
    },
    {
      language: "ro",
      placement: "email-signature",
      text:
        "Acest email conține recomandări personalizate cu AI ([SYSTEM_NAME]). Schimbă preferințele la [SETTINGS_URL]. — Art. 50 EU AI Act",
      shortText: "Personalizat cu AI — [SETTINGS_URL]",
    },
    {
      language: "en",
      placement: "footer",
      text:
        "The content shown is personalized using automated systems (AI — [SYSTEM_NAME]). Change your preferences at [SETTINGS_URL]. Pursuant to Art. 50 EU AI Act and GDPR Art. 13/14.",
      shortText: "AI-personalized · [SETTINGS_URL]",
    },
    {
      language: "en",
      placement: "email-signature",
      text:
        "This email contains AI-personalized recommendations ([SYSTEM_NAME]). Manage preferences at [SETTINGS_URL]. — Art. 50 EU AI Act",
      shortText: "AI-personalized — [SETTINGS_URL]",
    },
  ],

  "emotion-recognition-notice": [
    {
      language: "ro",
      placement: "popup",
      text:
        "Acest sistem ([SYSTEM_NAME]) detectează stări emoționale folosind AI. Datele sunt prelucrate conform GDPR. Pentru detalii sau opt-out: [CONTACT_EMAIL]. Conform Art. 50(3) EU AI Act.",
      shortText: "Sistem de recunoaștere emoții — Art. 50(3)",
    },
    {
      language: "ro",
      placement: "header",
      text:
        "Notificare: această sesiune folosește un sistem AI de recunoaștere a emoțiilor sau categorizare biometrică ([SYSTEM_NAME]). Conform Art. 50(3) EU AI Act. Detalii: [CONTACT_EMAIL].",
    },
    {
      language: "en",
      placement: "popup",
      text:
        "This system ([SYSTEM_NAME]) detects emotional states using AI. Data is processed under GDPR. For details or opt-out: [CONTACT_EMAIL]. Pursuant to Art. 50(3) EU AI Act.",
      shortText: "Emotion recognition system — Art. 50(3)",
    },
  ],

  "automated-decision-notice": [
    {
      language: "ro",
      placement: "popup",
      text:
        "Această decizie este luată parțial sau integral de un sistem AI ([SYSTEM_NAME]). Ai dreptul la intervenție umană, la a-ți exprima punctul de vedere și la a contesta decizia — scrie la [CONTACT_EMAIL]. Conform Art. 22 GDPR și Art. 50 EU AI Act.",
      shortText: "Decizie automatizată cu AI · [CONTACT_EMAIL]",
    },
    {
      language: "ro",
      placement: "inline",
      text:
        "🤖 Decizie luată cu AI ([SYSTEM_NAME]). Dreptul la review uman: [CONTACT_EMAIL].",
      shortText: "Decizie AI — review uman",
    },
    {
      language: "en",
      placement: "popup",
      text:
        "This decision is made wholly or partly by an AI system ([SYSTEM_NAME]). You have the right to human intervention, to express your point of view, and to contest the decision — contact [CONTACT_EMAIL]. Pursuant to GDPR Art. 22 and EU AI Act Art. 50.",
      shortText: "Automated decision · [CONTACT_EMAIL]",
    },
  ],
}

// ────────────────────────────────────────────────────────────────────────────
//   Public API
// ────────────────────────────────────────────────────────────────────────────

/** Returnează toate template-urile pentru un tip de notice, cu substituții opționale. */
export function getTemplatesForNotice(
  noticeType: TransparencyNoticeType,
  substitutions: TemplateSubstitutions = {}
): TransparencyTemplate[] {
  const base = LIBRARY[noticeType] ?? []
  return base.map((tpl) => {
    const text = applySubstitutions(tpl.text, substitutions)
    const shortText = tpl.shortText
      ? applySubstitutions(tpl.shortText, substitutions)
      : undefined
    return {
      ...tpl,
      text,
      shortText,
      html: buildHtml(text, tpl.placement),
    }
  })
}

/** Returnează un template specific pentru combinația notice + placement + language. */
export function findTemplate(
  noticeType: TransparencyNoticeType,
  placement: TransparencyPlacement,
  language: TransparencyLanguage,
  substitutions: TemplateSubstitutions = {}
): TransparencyTemplate | null {
  const matches = getTemplatesForNotice(noticeType, substitutions).filter(
    (t) => t.placement === placement && t.language === language
  )
  if (matches.length > 0) return matches[0]

  // Fallback: încearcă același language, oricare placement.
  const langOnly = getTemplatesForNotice(noticeType, substitutions).filter(
    (t) => t.language === language
  )
  if (langOnly.length > 0) return langOnly[0]

  // Ultim fallback: primul disponibil.
  const all = getTemplatesForNotice(noticeType, substitutions)
  return all[0] ?? null
}

/** Total număr de template-uri în bibliotecă (RO + EN, toate tipurile). */
export function getTemplateCount(): { total: number; ro: number; en: number } {
  let ro = 0
  let en = 0
  for (const tpls of Object.values(LIBRARY)) {
    for (const t of tpls) {
      if (t.language === "ro") ro += 1
      else en += 1
    }
  }
  return { total: ro + en, ro, en }
}

/** Etichete user-friendly pentru notice types. */
export const NOTICE_TYPE_LABELS: Record<TransparencyNoticeType, string> = {
  "chatbot-disclosure": "Disclosure chatbot (Art. 50(1))",
  "ai-generated-content": "Etichetare conținut generat AI (Art. 50(2))",
  "deepfake-disclosure": "Disclosure deepfake (Art. 50(4))",
  "personalization-notice": "Notificare personalizare (Art. 50)",
  "emotion-recognition-notice": "Notificare recunoaștere emoții (Art. 50(3))",
  "automated-decision-notice": "Notificare decizie automatizată (Art. 22 GDPR + Art. 50)",
}

/** Etichete user-friendly pentru placement. */
export const PLACEMENT_LABELS: Record<TransparencyPlacement, string> = {
  popup: "Popup / modal",
  footer: "Footer pagină",
  header: "Banner header",
  "email-signature": "Semnătură email",
  "video-overlay": "Overlay video",
  inline: "Inline / badge",
  // Sprint 023.7 — placements asset-level Art. 50
  advertisement: "Reclamă plătită",
  "social-post": "Post social media",
  broadcast: "Email broadcast / newsletter / push",
}
