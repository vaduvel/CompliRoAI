import Link from "next/link"
import { SiteNav } from "@/components/marketing/site-nav"

export const metadata = {
  title: "Politica de Confidențialitate",
  description: "Cum colectăm, utilizăm și protejăm datele personale în CompliRoAI.",
}

export default function PrivacyPage() {
  return (
    <div className="cr-legal-page">
      <SiteNav />
      <main className="cr-legal-main">
        <div className="cr-legal-notice">
          Document informativ al platformei CompliRoAI. Pentru interpretare juridică aplicată
          situației tale, validează cu avocatul sau consultantul tău.
        </div>

        <h1 className="cr-legal-title">
          Politica de Confidențialitate
        </h1>
        <p className="cr-legal-meta">
          Ultima actualizare: 15 mai 2026
        </p>

        <section className="cr-legal-content">
          <h2>1. Operatorul de Date</h2>
          <p>
            Operatorul datelor cu caracter personal este entitatea care operează CompliRoAI, cu
            sediul în România. Contact:{" "}
            <a href="mailto:privacy@compliro.ai">
              privacy@compliro.ai
            </a>
            .
          </p>

          <h2>2. Categorii de Date Prelucrate</h2>
          <ul>
            <li>
              <strong>Date de cont:</strong> adresă email,
              parolă (hash), nume organizație, CUI.
            </li>
            <li>
              <strong>Date de utilizare:</strong> logs de
              acces, IP, browser, acțiuni în aplicație.
            </li>
            <li>
              <strong>Date de conformitate:</strong>{" "}
              sistemele AI înregistrate, răspunsurile la evaluări, documente generate — aceste
              date aparțin utilizatorului.
            </li>
            <li>
              <strong>Date de facturare:</strong> procesate
              integral de furnizorul de plăți — nu stocăm date de card.
            </li>
          </ul>

          <h2>3. Scopurile Prelucrării</h2>
          <ul>
            <li>Furnizarea și îmbunătățirea Serviciului</li>
            <li>Autentificarea și securizarea conturilor</li>
            <li>Facturarea și gestionarea abonamentelor</li>
            <li>Comunicări de serviciu (notificări, digest)</li>
            <li>Respectarea obligațiilor legale</li>
          </ul>

          <h2>4. Temeiurile Juridice (Art. 6 GDPR)</h2>
          <ul>
            <li>
              <strong>Executarea contractului</strong> (Art. 6(1)(b)) — pentru furnizarea
              Serviciului
            </li>
            <li>
              <strong>Consimțământ</strong> (Art. 6(1)(a)) — pentru emailuri de marketing
              (opțional)
            </li>
            <li>
              <strong>Obligație legală</strong> (Art. 6(1)(c)) — pentru facturare și arhivare
              fiscală
            </li>
            <li>
              <strong>Interes legitim</strong> (Art. 6(1)(f)) — pentru securitate și detectarea
              fraudei
            </li>
          </ul>

          <h2>5. Destinatari și Transferuri</h2>
          <p>
            Datele pot fi accesate de subprocesori contractuali, toți cu sediul în UE sau cu
            garanții adecvate (SCC). Lista actualizată a subprocesorilor este disponibilă în{" "}
            <Link href="/dpa">
              DPA
            </Link>
            .
          </p>

          <h2>6. Retenție</h2>
          <p>
            Datele de cont se păstrează pe durata contractului și 3 ani după închiderea contului
            (obligații fiscale). Datele de utilizare anonimizate pot fi păstrate nedefinit în
            scopuri statistice.
          </p>

          <h2>7. Drepturile Tale (Art. 15–22 GDPR)</h2>
          <p>
            Ai dreptul la: acces, rectificare, ștergere, portabilitate, restricționare, opoziție
            și retragerea consimțământului. Cereri la:{" "}
            <a href="mailto:privacy@compliro.ai">
              privacy@compliro.ai
            </a>
            .
          </p>
          <p>
            Ai dreptul să depui plângere la ANSPDCP (Autoritatea Națională de Supraveghere a
            Prelucrării Datelor cu Caracter Personal).
          </p>

          <h2>8. Cookie-uri</h2>
          <p>
            Serviciul folosește cookie-uri strict necesare (sesiune autentificare) și, cu
            consimțământul tău, cookie-uri analitice. Nu folosim cookie-uri de tracking de la
            terți în absența consimțământului explicit.
          </p>

          <h2>9. Contact DPO</h2>
          <p>
            Pentru întrebări legate de protecția datelor:{" "}
            <a href="mailto:dpo@compliro.ai">
              dpo@compliro.ai
            </a>
            .
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
