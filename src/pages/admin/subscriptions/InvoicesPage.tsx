import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { FileText } from "lucide-react";

export function InvoicesPage() {
  return (
    <AdminPageScaffold
      title="Faturas"
      subtitle="Faturas emitidas para clientes assinantes"
      icon={FileText}
    />
  );
}

export default InvoicesPage;
