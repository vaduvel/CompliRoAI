import { Bell } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function AIIncidentsPage() {
  return (
    <ComingSoonPage
      title="Raportare incidente AI"
      icon={Bell}
      sprintNumber={20}
      targetCopy="octombrie 2026"
      legalReference="Art. 73 Regulament (UE) 2024/1689 — Notificarea incidentelor serioase pentru sisteme AI high-risk (distinct de incidentele GDPR Art. 33)"
      description="Modulul gestionează raportarea incidentelor serioase legate de sisteme AI high-risk către autoritatea de supraveghere (în România: ANSPDCP pentru componenta de date personale + autoritatea AI Act dedicată). Este complementar modulului GDPR Breach (Art. 33), care rămâne separat pentru incidentele pure de date personale."
      bullets={[
        "Intake incident cu severitate (serios, mortal, prejudiciu major, încălcare drepturi)",
        "Identificare sistem AI afectat + timeline detaliat",
        "Generare draft notificare către autoritatea AI",
        "Track-uire dovada notificării + răspunsul autorității",
        "Corelație automată cu PMM + Logging Evidence",
        "Includere în Audit Pack ca evidență a procesului de gestionare",
      ]}
    />
  )
}
