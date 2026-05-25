import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  Cpu,
  FileCheck2,
  ShieldCheck,
  Users,
} from "lucide-react"
import { SiteNav } from "@/components/marketing/site-nav"

const urgencyCards = [
  {
    icon: BookOpen,
    title: "AI literacy este deja obligație activă",
    body: "Art. 4 cere ca oamenii care folosesc sau operează AI să aibă competențe proporționale cu rolul și riscul sistemului.",
    tone: "warning",
  },
  {
    icon: ShieldCheck,
    title: "AI Act nu stă singur",
    body: "În practică îl legi de GDPR, DPIA, RoPA, furnizori, securitate, transparență și dovezi pentru audit.",
    tone: "info",
  },
  {
    icon: AlertTriangle,
    title: "Procurement-ul cere dovezi, nu intenții",
    body: "Clienții enterprise vor întreba ce AI folosești, ce risc are, cine aprobă și unde este dosarul.",
    tone: "danger",
  },
]

const platformCards = [
  {
    icon: Cpu,
    title: "Inventar AI și clasificare",
    body: "Înregistrezi sistemele AI, rolul legal și riscul: deployer, provider, importer, distributor, high-risk, limited sau minimal.",
  },
  {
    icon: FileCheck2,
    title: "DPIA, FRIA, Annex IV și EU DB",
    body: "Transformi obligațiile în pași de lucru, documente și exporturi auditabile pentru fiecare proiect AI.",
  },
  {
    icon: Users,
    title: "Workspace pe rol real",
    body: "DPO intern, cabinet extern sau AI builder primesc aceeași lege aplicată diferit pe fluxul lor operațional.",
  },
  {
    icon: ShieldCheck,
    title: "Audit Pack cu dovezi",
    body: "Colectezi răspunsuri, aprobări, fișiere, loguri, findings și semnături într-un dosar verificabil.",
  },
]

const roleCards = [
  {
    label: "Cabinet / DPO extern",
    title: "Livrezi conformare AI pentru mai mulți clienți",
    body: "Portofoliu, magic links, white-label, approvals, dosar audit și cockpit de remediere pentru fiecare firmă.",
  },
  {
    label: "Firmă care folosește AI",
    title: "Controlezi tool-urile AI folosite intern",
    body: "Inventar, AI literacy, transparență, DPIA/RoPA, vendor review și monitorizare preventivă fără haos în Excel.",
  },
  {
    label: "AI builder / automatizări",
    title: "Livrezi proiecte AI cu compliance pack",
    body: "Role assessment, Annex IV, EU Database, API/SDK, logging evidence, QMS și obligații provider/deployer clare.",
  },
]

const deliverables = [
  "AI Inventory + role/risk classification",
  "EU AI Act + GDPR mapping pe sistem AI",
  "DPIA / FRIA / RoPA / Vendor AI Assessment",
  "AI Literacy evidence + transparency notices",
  "Human Oversight + Logging + PMM + Incident workflows",
  "Audit Pack ZIP/PDF cu surse, acțiuni și dovezi",
]

const tiers = [
  {
    name: "Advisor",
    price: "399 EUR",
    period: "/lună",
    description: "Pentru DPO, avocați și consultanți care lucrează cu mai mulți clienți.",
    features: ["Până la 10 clienți", "White-label basic", "Magic links", "Audit Pack per client"],
    highlighted: false,
  },
  {
    name: "Cabinet Pro",
    price: "799 EUR",
    period: "/lună",
    description: "Pentru cabinete care vor să transforme AI Act într-un serviciu repetabil.",
    features: ["Până la 50 clienți", "White-label complet", "Approval queue", "Trust Center public"],
    highlighted: true,
  },
  {
    name: "AI Builder",
    price: "399 EUR",
    period: "/lună",
    description: "Pentru agenții și startup-uri care livrează automatizări sau produse AI.",
    features: ["Annex IV", "EU Database", "API / SDK", "Provider/deployer pack"],
    highlighted: false,
  },
]

export default function HomePage() {
  return (
    <main className="cr-public-page">
      <SiteNav />

      <section className="cr-public-hero">
        <div className="cr-public-container cr-public-center">
          <div className="cr-public-badge">
            <ShieldCheck size={15} />
            AI Act + GDPR workspace pentru execuție, nu teorie
          </div>
          <h1 className="cr-public-title">
            Transformă obligațiile AI Act în pași, dovezi și dosare auditabile.
          </h1>
          <p className="cr-public-subtitle">
            CompliRoAI ajută DPO-uri, cabinete, firme și AI builders să inventarieze sistemele AI,
            să clasifice rolul și riscul, să colecteze evidence și să exporte Audit Pack-uri gata
            de verificare.
          </p>
          <div className="cr-public-actions">
            <Link href="/login?mode=register" className="cr-btn cr-btn--primary">
              Începe trial
              <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="cr-btn">
              Intră în cont
            </Link>
          </div>
        </div>
      </section>

      <section className="cr-public-section">
        <div className="cr-public-container">
          <div className="cr-section-label">De ce acum</div>
          <h2 className="cr-public-section-title">Piața nu are nevoie de încă un curs. Are nevoie de execuție.</h2>
          <div className="cr-public-grid">
            {urgencyCards.map(({ icon: Icon, title, body, tone }) => (
              <article className="cr-public-card" key={title}>
                <span className={`cr-public-card__icon cr-public-card__icon--${tone}`}>
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cr-public-section">
        <div className="cr-public-container">
          <div className="cr-section-label">Ce face platforma</div>
          <h2 className="cr-public-section-title">Un workspace care leagă legea de munca reală.</h2>
          <div className="cr-public-grid">
            {platformCards.map(({ icon: Icon, title, body }) => (
              <article className="cr-public-card" key={title}>
                <span className="cr-public-card__icon">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cr-public-section">
        <div className="cr-public-container">
          <div className="cr-section-label">Roluri operaționale, nu pachete generice</div>
          <h2 className="cr-public-section-title">Aceeași lege. Workspace diferit după cum lucrezi.</h2>
          <div className="cr-public-grid cr-public-grid--roles">
            {roleCards.map((role) => (
              <article className="cr-public-card cr-public-card--role" key={role.label}>
                <span className="cr-pill">{role.label}</span>
                <h3>{role.title}</h3>
                <p>{role.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cr-public-section">
        <div className="cr-public-container cr-public-split">
          <div>
            <div className="cr-section-label">Output concret</div>
            <h2 className="cr-public-section-title">Ce primește clientul după implementare.</h2>
            <p className="cr-public-copy">
              Nu promitem “AI magic”. Promitem un cadru de lucru defensibil: răspunsuri, surse,
              owneri, termene, documente și evidence care rămân în jurnal.
            </p>
          </div>
          <div className="cr-public-card cr-public-card--deliverables">
            <ul className="cr-check-list">
              {deliverables.map((item) => (
                <li key={item}>
                  <Check size={16} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="cr-public-section">
        <div className="cr-public-container">
          <div className="cr-section-label">Prețuri pilot</div>
          <h2 className="cr-public-section-title">Alege workspace-ul după modul de lucru.</h2>
          <div className="cr-public-grid">
            {tiers.map((tier) => (
              <article
                className={`cr-public-card cr-pricing-card${tier.highlighted ? " is-highlighted" : ""}`}
                key={tier.name}
              >
                {tier.highlighted && <span className="cr-pricing-card__label">Recomandat</span>}
                <h3>{tier.name}</h3>
                <div className="cr-pricing-card__price">
                  <strong>{tier.price}</strong>
                  <span>{tier.period}</span>
                </div>
                <p>{tier.description}</p>
                <ul className="cr-check-list cr-check-list--compact">
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <Check size={15} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=register" className={tier.highlighted ? "cr-btn cr-btn--primary" : "cr-btn"}>
                  Începe trial
                  <ArrowRight size={14} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="cr-public-footer">
        <div className="cr-public-container cr-public-footer__inner">
          <div>
            <strong>CompliRoAI</strong>
            <span>Platformă independentă. Nu substituie consultanța juridică.</span>
          </div>
          <nav aria-label="Legal">
            <Link href="/terms">Termeni</Link>
            <Link href="/privacy">Confidențialitate</Link>
            <Link href="/dpa">DPA</Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
