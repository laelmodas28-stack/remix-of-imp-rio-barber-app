import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Percent } from "lucide-react";

export function CommissionsPage() {
  return (
    <AdminPageScaffold
      title="Comissoes"
      subtitle="Regras de comissao para cada profissional"
      icon={Percent}
    />
  );
}

export default CommissionsPage;
