import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Send } from "lucide-react";

export function NotificationLogsPage() {
  return (
    <AdminPageScaffold
      title="Logs de Envio"
      subtitle="Historico de notificacoes enviadas"
      icon={Send}
    />
  );
}

export default NotificationLogsPage;
