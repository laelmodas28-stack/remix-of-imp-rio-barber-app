import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { FileWarning } from "lucide-react";

export function ImportLogsPage() {
  return (
    <AdminPageScaffold
      title="Logs de Importacao"
      subtitle="Historico e status de todas as importacoes"
      icon={FileWarning}
    />
  );
}

export default ImportLogsPage;
