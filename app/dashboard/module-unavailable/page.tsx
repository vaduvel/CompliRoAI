import Link from "next/link"

const MODULE_COPY: Record<string, { title: string; body: string; primaryHref: string; primaryLabel: string }> = {
  portofoliu: {
    title: "Portofoliul este disponibil în workspace Cabinet",
    body: "Portofoliul multi-client apare doar când lucrezi ca DPO extern, avocat sau cabinet care gestionează firme pentru clienți.",
    primaryHref: "/dashboard",
    primaryLabel: "Înapoi la workspace-ul tău",
  },
  rapoarte: {
    title: "Rapoartele de cabinet sunt disponibile în workspace Cabinet",
    body: "Pagina de rapoarte agregă livrabile white-label pe clienți. Pentru workspace-ul curent folosește Dosarul audit sau Readiness Pack.",
    primaryHref: "/dashboard/audit-pack",
    primaryLabel: "Deschide Dosar audit",
  },
  "magic-links": {
    title: "Magic Links sunt disponibile în workspace Cabinet",
    body: "Linkurile HMAC sunt pentru colectare self-service de la clienții cabinetului. În workspace individual poți lucra direct în formularele de conformitate.",
    primaryHref: "/dashboard",
    primaryLabel: "Înapoi la Acasă",
  },
  branding: {
    title: "Brandingul white-label este disponibil în workspace Cabinet",
    body: "Logo-ul, culorile și semnătura de cabinet se aplică rapoartelor și portalurilor trimise clienților.",
    primaryHref: "/dashboard/setari/billing",
    primaryLabel: "Vezi planurile",
  },
}

export const dynamic = "force-dynamic"

export default async function ModuleUnavailablePage({
  searchParams,
}: {
  searchParams?: Promise<{ module?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const moduleKey = params.module ?? ""
  const copy = MODULE_COPY[moduleKey] ?? {
    title: "Modul indisponibil pentru workspace-ul curent",
    body: "Acest modul este ascuns în navigație pentru rolul tău, ca să păstrăm workflow-ul curat și relevant.",
    primaryHref: "/dashboard",
    primaryLabel: "Înapoi la Acasă",
  }

  return (
    <div className="cr-page cr-stack">
      <section className="cr-hero">
        <div className="cr-hero__copy">
          <span className="cr-eyebrow">Workspace · rol curent</span>
          <h1 className="cr-title">{copy.title}</h1>
          <p className="cr-subtitle">{copy.body}</p>
        </div>
        <div className="cr-actions">
          <Link href={copy.primaryHref} className="cr-btn cr-btn--primary">
            {copy.primaryLabel}
          </Link>
        </div>
      </section>

      <section className="cr-card">
        <div className="cr-card__body">
          <strong>De ce vezi asta?</strong> CompliRoAI filtrează modulele pe rol:
          IMM, AI Builder sau Cabinet. Dacă ai nevoie de portofoliu, magic links
          sau white-label, schimbă workspace-ul către Cabinet ori activează un
          plan de cabinet.
        </div>
      </section>
    </div>
  )
}
