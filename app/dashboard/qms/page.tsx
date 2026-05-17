import { Cog } from "lucide-react"
import { ComingSoonPage } from "@/components/shell/coming-soon-page"

export default function QMSPage() {
  return (
    <ComingSoonPage
      title="QMS — Quality Management System"
      icon={Cog}
      sprintNumber={21}
      targetCopy="noiembrie 2026"
      legalReference="Art. 17 Regulament (UE) 2024/1689 — Sistemul de management al calității pentru providerii de sisteme AI high-risk"
      description="Workspace dedicat sistemului de management al calității cerut providerilor de AI high-risk: politici, roluri, control documentație, controale supplier, testing + validare, change management. Va integra cu PMM (Sprint 019) pentru loop-ul de îmbunătățire continuă."
      bullets={[
        "Bibliotecă politici (versiune + signer + revizie periodică)",
        "Matrice roluri + responsabilități (DRI, escalation)",
        "Control documentație cu versionare + hash chain",
        "Controale supplier (link cu Vendor AI)",
        "Plan testing + validare per release",
        "Change management cu approval queue",
        "Loop continuu cu PMM (incidente → corective action)",
      ]}
    />
  )
}
