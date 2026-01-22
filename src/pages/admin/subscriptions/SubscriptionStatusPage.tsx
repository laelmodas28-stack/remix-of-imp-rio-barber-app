import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Activity } from "lucide-react";

export function SubscriptionStatusPage() {
  return (
    <AdminPageScaffold
      title="Status das Assinaturas"
      subtitle="Acompanhe o status de todas as assinaturas"
      icon={Activity}
    />
  );
}

export default SubscriptionStatusPage;
