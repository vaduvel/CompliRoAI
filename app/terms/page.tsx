import Link from "next/link"
import { SiteNav } from "@/components/marketing/site-nav"

export const metadata = {
  title: "Termeni și Condiții",
  description: "Termenii și condițiile de utilizare ale platformei CompliRoAI.",
}

export default function TermsPage() {
  return (
    <div className="cr-legal-page">
      <SiteNav />
      <main className="cr-legal-main">
        <div className="cr-legal-notice">
          Document informativ al platformei CompliRoAI. Pentru interpretare juridică aplicată
          situației tale, validează cu avocatul sau consultantul tău.
        </div>

        <h1 className="cr-legal-title">
          Termeni și Condiții de Utilizare
        </h1>
        <p className="cr-legal-meta">
          Ultima actualizare: 15 mai 2026
        </p>

        <section className="cr-legal-content">
          <h2>1. Serviciul CompliRoAI</h2>
          <p>
            CompliRoAI (denumit în continuare „Serviciul&rdquo;) este un instrument digital de
            asistență în pregătirea conformității cu Regulamentul (UE) 2024/1689 privind
            inteligența artificială (EU AI Act) și cu obligațiile GDPR conexe. Serviciul este
            operat din România.
          </p>

          <h2>2. Natura Serviciului — Disclaimer Juridic</h2>
          <p>
            <strong>
              CompliRoAI NU oferă consultanță juridică.
            </strong>{" "}
            Conținutul generat de Serviciu — inclusiv documente Annex IV, JSON-uri pentru EU
            Database, clasificări de risc și recomandări — reprezintă instrumente de asistență
            și pregătire, nu avize juridice cu forță legală.
          </p>
          <p>
            Utilizatorii sunt responsabili pentru validarea finală a documentelor împreună cu un
            avocat sau consultant juridic calificat înainte de utilizare oficială. Serviciul nu
            garantează conformitatea deplină și nu se substituie consilierii juridice profesionale.
          </p>

          <h2>3. Eligibilitate și Conturi</h2>
          <p>
            Serviciul este destinat persoanelor juridice (societăți comerciale, ONG-uri, instituții
            publice) cu sediul sau activitate în Uniunea Europeană. Prin crearea unui cont,
            utilizatorul declară că are cel puțin 18 ani și autoritatea legală de a acționa în
            numele organizației.
          </p>

          <h2>4. Planuri și Facturare</h2>
          <p>
            Serviciul oferă o perioadă de trial gratuită de 14 zile, precum și planuri cu plată
            (Standard, Partner). Facturarea planurilor cu plată se realizează lunar. Prețurile
            afișate sunt în EUR și nu includ TVA, care se adaugă conform legislației aplicabile.
          </p>
          <p>
            La expirarea trial-ului, accesul la funcționalități este restricționat dacă nu a fost
            efectuată o plată.
          </p>

          <h2>5. Proprietate Intelectuală</h2>
          <p>
            Codul sursă, design-ul, algoritmii și modelele de date ale Serviciului sunt
            proprietatea operatorului platformei. Documentele generate de utilizator pe baza
            datelor proprii aparțin utilizatorului.
          </p>

          <h2>6. Protecția Datelor</h2>
          <p>
            Prelucrarea datelor cu caracter personal este descrisă în{" "}
            <Link href="/privacy">
              Politica de Confidențialitate
            </Link>{" "}
            și în{" "}
            <Link href="/dpa">
              Acordul de Prelucrare a Datelor (DPA)
            </Link>
            .
          </p>

          <h2>7. Limitarea Răspunderii</h2>
          <p>
            În măsura permisă de legea aplicabilă, CompliRoAI nu este răspunzătoare pentru:
            decizii de afaceri luate pe baza informațiilor din Serviciu; amenzi, sancțiuni sau
            consecințe juridice rezultate din conformitate incompletă; pierderi indirecte sau
            daune consecvente.
          </p>

          <h2>8. Modificarea Termenilor</h2>
          <p>
            Operatorul poate modifica acești Termeni cu notificare de minim 30 de zile prin email
            sau în aplicație. Continuarea utilizării după notificare constituie acceptul noilor
            termeni.
          </p>

          <h2>9. Drept Aplicabil</h2>
          <p>
            Acești Termeni sunt guvernați de legea română. Litigiile se vor soluționa pe cale
            amiabilă sau, în caz de eșec, la instanțele competente din România.
          </p>

          <h2>10. Contact</h2>
          <p>
            Pentru întrebări juridice sau privind termenii:{" "}
            <a href="mailto:legal@compliro.ai">
              legal@compliro.ai
            </a>
          </p>
        </section>

        <div className="cr-legal-footer">
          <Link href="/">
            ← Înapoi la pagina principală
          </Link>
        </div>
      </main>
    </div>
  )
}
