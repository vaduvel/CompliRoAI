import Link from "next/link"
import {
  ShieldCheck,
  FileCheck2,
  BookOpen,
  Cpu,
  Clock,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react"
import { SiteNav } from "@/components/marketing/site-nav"

const cardStyle: React.CSSProperties = {
  background: "var(--bg-raised)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display-v3)",
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: "-0.01em",
  color: "var(--ink-strong)",
  margin: 0,
}

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono-v3)",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "var(--ink-dim)",
  marginBottom: 12,
}

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--font-body-v3)",
      }}
    >
      <SiteNav />

      {/* HERO */}
      <section style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "80px 24px 96px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "var(--cobalt-soft)",
              border: "1px solid var(--cobalt-soft-strong)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--cobalt-400)",
              marginBottom: 24,
            }}
          >
            <ShieldCheck size={14} />
            Compliance OS pentru era AI
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display-v3)",
              fontSize: "clamp(36px, 5vw, 56px)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "var(--ink-strong)",
              margin: 0,
              maxWidth: 880,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Nu aștepți amenda. Faci prevenția.
          </h1>
          <p
            style={{
              marginTop: 20,
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--ink-muted)",
              maxWidth: 720,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Folosești chatbot, copilot AI, automatizări sau agenți AI în firmă?
            CompliRoAI îți spune EXACT ce obligații ai sub GDPR + AI Act + NIS2 + DORA,
            generează dosarul complet și îți dă audit pack semnat criptografic.
            <br /><br />
            <strong style={{ color: "var(--ink)" }}>AI Compliance Audit complet — de la €799 one-off.</strong>
          </p>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/login?mode=register"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--cobalt-600)",
                color: "#fff",
                fontWeight: 600,
                fontSize: 15,
                padding: "12px 22px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid var(--cobalt-600)",
              }}
            >
              Începe gratuit
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "transparent",
                color: "var(--ink-strong)",
                fontWeight: 600,
                fontSize: 15,
                padding: "12px 22px",
                borderRadius: 10,
                textDecoration: "none",
                border: "1px solid var(--border-strong)",
              }}
            >
              Conectează-te
            </Link>
          </div>
        </div>
      </section>

      {/* DE CE ACUM */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>De ce acum</div>
          <h2 style={sectionTitleStyle}>EU AI Act nu mai e teoretic</h2>
          <p
            style={{
              marginTop: 12,
              color: "var(--ink-muted)",
              fontSize: 16,
              maxWidth: 720,
            }}
          >
            Trei realități pe care orice IMM care folosește AI trebuie să le cunoască astăzi.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            <div style={cardStyle}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--amber-soft)",
                  color: "var(--amber-500)",
                  marginBottom: 16,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display-v3)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink-strong)",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Obligație ACTIVĂ din feb 2025
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-muted)", margin: 0 }}>
                Art. 4 AI Literacy. 63% din firmele RO folosesc AI fără reguli — și fără
                documentația obligatorie.
              </p>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--cobalt-soft)",
                  color: "var(--cobalt-400)",
                  marginBottom: 16,
                }}
              >
                <Clock size={20} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display-v3)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink-strong)",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Deadline high-risk: 2 dec 2027
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-muted)", margin: 0 }}>
                Annex III, înregistrare EU Database. Termen extins prin Omnibus 7 mai 2026 — nu
                pierde fereastra de pregătire.
              </p>
            </div>

            <div style={cardStyle}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--red-soft)",
                  color: "var(--red-500)",
                  marginBottom: 16,
                }}
              >
                <ShieldCheck size={20} />
              </div>
              <h3
                style={{
                  fontFamily: "var(--font-display-v3)",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--ink-strong)",
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Amenzi până la 7% din cifra de afaceri
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-muted)", margin: 0 }}>
                Sau 35M EUR, oricare e mai mare. În România supraveghează ANCOM (central), BNR
                (bănci), ASF (asigurări), ANSPDCP (date), ADR (notificare), DNSC (cyber),
                Inspecția Muncii (HR).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CE FACE PLATFORMA */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>Ce face platforma</div>
          <h2 style={sectionTitleStyle}>Tot ce ai nevoie pentru EU AI Act, într-un singur loc</h2>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                icon: Cpu,
                title: "Inventory AI",
                body:
                  "Înregistrezi sistemele AI, primești clasificarea automată (prohibited / high-risk / limited / minimal) conform Annex III.",
              },
              {
                icon: FileCheck2,
                title: "Annex IV",
                body:
                  "Documentația tehnică obligatorie pentru sisteme high-risk, generată din răspunsurile tale la 10 întrebări.",
              },
              {
                icon: ShieldCheck,
                title: "EU Database Wizard",
                body:
                  "Pregătește JSON-ul pentru înregistrare în EU AI Database (Art. 49), validat structural înainte de upload.",
              },
              {
                icon: BookOpen,
                title: "AI Literacy Tracker",
                body:
                  "Documentează că angajații tăi au primit training pe utilizarea AI (Art. 4) — cu evidență auditabilă.",
              },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} style={cardStyle}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--cobalt-soft)",
                    color: "var(--cobalt-400)",
                    marginBottom: 16,
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display-v3)",
                    fontSize: 17,
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "var(--ink-muted)",
                    margin: 0,
                  }}
                >
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CUM FUNCTIONEAZA */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>Cum funcționează</div>
          <h2 style={sectionTitleStyle}>De la zero la dovadă de conformitate în 4 pași</h2>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            {[
              { n: "01", t: "Introduci datele firmei tale" },
              { n: "02", t: "Adaugi sistemele AI pe care le folosești" },
              { n: "03", t: "Completezi evaluarea de conformitate" },
              { n: "04", t: "Descarci dovada (Annex IV, EU DB JSON, training records)" },
            ].map(({ n, t }) => (
              <div key={n} style={cardStyle}>
                <div
                  style={{
                    fontFamily: "var(--font-mono-v3)",
                    fontSize: 13,
                    color: "var(--cobalt-400)",
                    fontWeight: 500,
                    marginBottom: 12,
                  }}
                >
                  {n}
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: "var(--ink-strong)",
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  {t}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3 VERTICALE */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>Pentru tine, exact</div>
          <h2 style={sectionTitleStyle}>3 verticale. Aceeași platformă. Un singur cont.</h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 12, maxWidth: 720 }}>
            Indiferent dacă folosești AI, construiești cu AI sau vinzi soluții AI altora —
            CompliRoAI te ține compliant sub toate legile care se aplică azi.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                tag: "V1 · CHATBOT",
                title: "AI Chatbot Compliance",
                description: "Magazine, support, customer service automat.",
                bullets: [
                  "Art. 50 disclosure 'vorbești cu AI'",
                  "GDPR pe date comenzi/clienți",
                  "Loguri + human escalation",
                  "Template-uri RO+EN gata copy-paste",
                ],
                target: "Pentru: Zybots customers, e-commerce, SaaS cu chat AI",
              },
              {
                tag: "V2 · COPILOT",
                title: "AI Business Copilot",
                description: "FGO+ChatGPT, Copilot Enterprise, ChatGPT pe date interne.",
                bullets: [
                  "AI Inventory (ce tool-uri folosești)",
                  "GDPR DPIA (cine are acces)",
                  "Art. 4 Literacy training angajați",
                  "Vendor risk assessment",
                ],
                target: "Pentru: firme care folosesc Copilot, ChatGPT business, AI pe date proprii",
              },
              {
                tag: "V3 · AGENT",
                title: "AI Agent / Automation",
                description: "Roboți AI, Make/n8n/Zapier + AI, agenții care livrează automatizări.",
                bullets: [
                  "Risk classification per sistem AI",
                  "Annex IV + EU Database registration",
                  "Deployer obligations workspace",
                  "Audit pack semnat criptografic",
                ],
                target: "Pentru: agenții AI (Neodigital, Nenos type), firme care vând automatizări",
              },
            ].map((v) => (
              <div
                key={v.tag}
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--cobalt-400)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {v.tag}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-display-v3)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                    margin: 0,
                  }}
                >
                  {v.title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--ink-muted)", margin: 0, lineHeight: 1.5 }}>
                  {v.description}
                </p>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "8px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {v.bullets.map((b, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 12,
                        color: "var(--ink)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 6,
                      }}
                    >
                      <Check size={13} style={{ color: "var(--cobalt-500)", flexShrink: 0, marginTop: 2 }} />
                      {b}
                    </li>
                  ))}
                </ul>
                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: 12,
                    borderTop: "1px solid var(--border)",
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    fontStyle: "italic",
                  }}
                >
                  {v.target}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTA €799 AUDIT */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div style={sectionLabelStyle}>Pachet AI Compliance Audit</div>
          <h2 style={sectionTitleStyle}>De la €799 — dosar complet în 3-7 zile.</h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 16 }}>
            Setezi CUI + sistemele AI. Noi rulăm motorul. Tu primești dosarul gata de semnat.
          </p>

          <div
            style={{
              marginTop: 32,
              padding: 32,
              background: "var(--bg-raised)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--cobalt-400)", marginBottom: 16 }}>
              CE PRIMEȘTI:
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 10,
              }}
            >
              {[
                "AI Inventory + Risk Classification",
                "GDPR mapping (Art. 22 + DPIA)",
                "EU AI Act mapping (Art. 4 + 5 + 50)",
                "Transparency Notices RO+EN copy-paste",
                "Human Oversight Policy template",
                "AI Usage Policy template",
                "Literacy Training Evidence pack",
                "Incident Procedure",
                "Audit Pack PDF + ZIP semnat criptografic",
                "Verify-pack public URL (oricine verifică integritatea)",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: 13,
                    color: "var(--ink)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <Check size={15} style={{ color: "var(--cobalt-500)", flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>
            <div style={{ marginTop: 24, textAlign: "center" }}>
              <Link
                href="/login?mode=register"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--cobalt-600)",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 15,
                  padding: "12px 22px",
                  borderRadius: 10,
                  textDecoration: "none",
                }}
              >
                Cere demo + ofertă <ArrowRight size={16} />
              </Link>
              <p style={{ fontSize: 12, color: "var(--ink-dim)", marginTop: 12 }}>
                După audit one-off, abonament menținere €99-299/lună (update-uri legislative + change log).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PENTRU AGENȚII AI */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>Pentru agenții AI & cabinete consultanță</div>
          <h2 style={sectionTitleStyle}>White-label. Multi-client. Margin 95%.</h2>
          <p style={{ fontSize: 15, color: "var(--ink-muted)", marginTop: 12, maxWidth: 720 }}>
            Vindeți automatizări AI sau gestionați portofolii GDPR? Atașați la fiecare proiect/client
            un compliance pack semnat cu logo-ul vostru. Voi păstrați 100% relația cu clientul.
          </p>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                metric: "30+",
                label: "Clienți gestionați dintr-un singur cont",
                detail: "Multi-client portfolio + dropdown switcher",
              },
              {
                metric: "95%",
                label: "Margin pe revenuele voastre",
                detail: "Vindeți €700/audit, plătiți €399/lună abonament",
              },
              {
                metric: "5 min",
                label: "Setup per client nou",
                detail: "Magic link HMAC trimis pe email, semnătură inline",
              },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "var(--bg-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 22,
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-display-v3)",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "var(--cobalt-400)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.metric}
                </div>
                <div style={{ fontSize: 14, color: "var(--ink-strong)", marginTop: 8, fontWeight: 500 }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-muted)", marginTop: 6, lineHeight: 1.5 }}>
                  {s.detail}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              padding: "20px 24px",
              background: "var(--bg-elev)",
              borderRadius: 10,
              fontSize: 14,
              color: "var(--ink-muted)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--ink)" }}>Plan Cabinet Pro: €799/lună.</strong>{" "}
            Vindeți 30 clienți × €100-300/lună compliance subscription = €3-9k/lună revenue
            recurring. Marja netă 95%.
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section style={{ padding: "80px 24px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={sectionLabelStyle}>Prețuri</div>
          <h2 style={sectionTitleStyle}>Începe gratuit. Plătești când ești pregătit.</h2>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {[
              {
                name: "Free trial",
                price: "0 EUR",
                period: "14 zile",
                features: ["Acces complet", "Toate modulele", "Fără card de plată"],
                cta: "Începe acum",
                href: "/login?mode=register",
                highlighted: false,
              },
              {
                name: "IMM Standard",
                price: "99 EUR",
                period: "/lună",
                features: [
                  "1 organizație",
                  "AI Inventory + Annex IV + EU DB",
                  "AI Literacy (Art. 4) tracker",
                  "GDPR DPIA bridge",
                  "Audit pack criptografic",
                ],
                cta: "Începe trial",
                href: "/login?mode=register",
                highlighted: false,
              },
              {
                name: "Cabinet Pro",
                price: "399 EUR",
                period: "/lună",
                features: [
                  "Până la 30 clienți gestionați",
                  "Multi-client portfolio + white-label",
                  "Magic links HMAC pentru aprobări",
                  "Audit pack semnat per client",
                  "Branding logo + culori cabinet",
                  "Pentru DPO, avocați, contabili",
                ],
                cta: "Începe trial",
                href: "/login?mode=register",
                highlighted: true,
              },
              {
                name: "Cabinet Enterprise",
                price: "999 EUR",
                period: "/lună",
                features: [
                  "Clienți nelimitați",
                  "Onboarding asistat",
                  "SLA prioritar",
                  "Integrare custom + API",
                  "Pentru cabinete 50+ clienți",
                ],
                cta: "Contactează-ne",
                href: "/login?mode=register",
                highlighted: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                style={{
                  ...cardStyle,
                  position: "relative",
                  borderColor: tier.highlighted ? "var(--cobalt-500)" : "var(--border)",
                  boxShadow: tier.highlighted
                    ? "0 0 0 1px var(--cobalt-500), 0 8px 24px rgba(37, 99, 235, 0.12)"
                    : "none",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {tier.highlighted && (
                  <div
                    style={{
                      position: "absolute",
                      top: -10,
                      right: 16,
                      background: "var(--cobalt-600)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 999,
                      letterSpacing: "0.02em",
                    }}
                  >
                    Recomandat
                  </div>
                )}
                <h3
                  style={{
                    fontFamily: "var(--font-display-v3)",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ink-strong)",
                    margin: 0,
                  }}
                >
                  {tier.name}
                </h3>
                <div style={{ marginTop: 14, marginBottom: 18, display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-display-v3)",
                      fontSize: 32,
                      fontWeight: 700,
                      color: "var(--ink-strong)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {tier.price}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--ink-muted)" }}>{tier.period}</span>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        fontSize: 14,
                        color: "var(--ink-muted)",
                      }}
                    >
                      <Check size={16} style={{ color: "var(--emerald-500)", flexShrink: 0, marginTop: 2 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={tier.href}
                  style={{
                    marginTop: 24,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    background: tier.highlighted ? "var(--cobalt-600)" : "transparent",
                    color: tier.highlighted ? "#fff" : "var(--ink-strong)",
                    border: tier.highlighted
                      ? "1px solid var(--cobalt-600)"
                      : "1px solid var(--border-strong)",
                    fontWeight: 600,
                    fontSize: 14,
                    padding: "10px 16px",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  {tier.cta}
                  <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "40px 24px" }}>
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, color: "var(--ink-dim)" }}>
              © 2026 AI Act Compliance
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-subtle)" }}>
              Platformă independentă. Nu constituie consultanță juridică.
            </div>
          </div>
          <nav style={{ display: "flex", gap: 20, fontSize: 13 }}>
            <Link href="/terms" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
              Termeni
            </Link>
            <Link href="/privacy" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
              Confidențialitate
            </Link>
            <Link href="/dpa" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
              DPA
            </Link>
            <Link href="/login" style={{ color: "var(--ink-muted)", textDecoration: "none" }}>
              Securitate
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
