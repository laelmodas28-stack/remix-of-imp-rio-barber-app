import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Crown } from "lucide-react";

export function SubscriptionPlansPage() {
  return (
    <AdminPageScaffold
      title="Planos de Assinatura"
      subtitle="Gerencie os planos de assinatura oferecidos"
      icon={Crown}
      actionLabel="Novo Plano"
      onAction={() => {}}
    />
  );
}

export default SubscriptionPlansPage;
