import { TrendingUp } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function PostMarketMonitoringPage() {
  return (
    <ComingSoonPage
      title="Post-Market Monitoring (PMM)"
      icon={TrendingUp}
      sprintNumber={19}
      targetCopy="septembrie 2026"
      legalReference="Art. 72 Regulament (UE) 2024/1689 — Sistemul de monitorizare post-comercializare pentru sisteme AI high-risk"
      description="Providerii de sisteme AI high-risk trebuie să mențină un sistem documentat de monitorizare post-piață: colectare metrici, analiza performanței + risc, urmărirea schimbărilor de versiune, incidente. Modulul va automatiza periodicitatea, reminderele și emiterea de findings când plan-ul lipsește."
      bullets={[
        "Plan PMM per sistem (frecvență review, KPIs, surse de date)",
        "Înregistrare review periodic (lunar/trimestrial/anual)",
        "Tracking versiuni model + impact pe performanță",
        "Integrare cu incidente AI (Sprint 020) pentru corelație",
        "Reminder-uri automate când vine deadline-ul de review",
        "Includere obligatorie în Audit Pack",
      ]}
    />
  )
}
