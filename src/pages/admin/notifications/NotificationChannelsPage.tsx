import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  MessageSquare, 
  Save, 
  Loader2, 
  Mail, 
  Bell,
  CheckCircle,
  TestTube
} from "lucide-react";
import { WhatsAppSimpleCard } from "@/components/admin/notifications/WhatsAppSimpleCard";
import { sendTestEmailNotification } from "@/lib/notifications/n8nWebhook";

interface NotificationSettings {
  send_booking_confirmation: boolean;
  send_booking_reminder: boolean;
  // WhatsApp settings
  whatsapp_enabled: boolean;
  whatsapp_send_booking_confirmation: boolean;
  whatsapp_send_booking_reminder: boolean;
}

export function NotificationChannelsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  
  const [settings, setSettings] = useState<NotificationSettings>({
    send_booking_confirmation: true,
    send_booking_reminder: true,
    whatsapp_enabled: false,
    whatsapp_send_booking_confirmation: true,
    whatsapp_send_booking_reminder: true,
  });

  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["barbershop-notification-settings", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const { data, error } = await supabase
        .from("barbershop_settings")
        .select(`
          send_booking_confirmation, 
          send_booking_reminder,
          whatsapp_enabled,
          whatsapp_send_booking_confirmation,
          whatsapp_send_booking_reminder
        `)
        .eq("barbershop_id", barbershop.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  useEffect(() => {
    if (settingsData) {
      setSettings({
        send_booking_confirmation: settingsData.send_booking_confirmation ?? true,
        send_booking_reminder: settingsData.send_booking_reminder ?? true,
        whatsapp_enabled: settingsData.whatsapp_enabled ?? false,
        whatsapp_send_booking_confirmation: settingsData.whatsapp_send_booking_confirmation ?? true,
        whatsapp_send_booking_reminder: settingsData.whatsapp_send_booking_reminder ?? true,
      });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      
      // Check if settings exist
      const { data: existing } = await supabase
        .from("barbershop_settings")
        .select("id")
        .eq("barbershop_id", barbershop.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("barbershop_settings")
          .update({
            send_booking_confirmation: data.send_booking_confirmation,
            send_booking_reminder: data.send_booking_reminder,
            whatsapp_enabled: data.whatsapp_enabled,
            whatsapp_send_booking_confirmation: data.whatsapp_send_booking_confirmation,
            whatsapp_send_booking_reminder: data.whatsapp_send_booking_reminder,
            updated_at: new Date().toISOString(),
          })
          .eq("barbershop_id", barbershop.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("barbershop_settings")
          .insert({
            barbershop_id: barbershop.id,
            send_booking_confirmation: data.send_booking_confirmation,
            send_booking_reminder: data.send_booking_reminder,
            whatsapp_enabled: data.whatsapp_enabled,
            whatsapp_send_booking_confirmation: data.whatsapp_send_booking_confirmation,
            whatsapp_send_booking_reminder: data.whatsapp_send_booking_reminder,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop-notification-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(settings);
  };

  const handleTestEmail = async () => {
    if (!barbershop?.id || !barbershop?.name) return;
    
    setIsTestingEmail(true);
    try {
      const result = await sendTestEmailNotification(barbershop.id, barbershop.name);
      if (result) {
        toast.success("Notificação de teste enviada para o webhook!");
      } else {
        toast.error("Webhook de email não configurado");
      }
    } catch (error) {
      console.error("Error testing email:", error);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!barbershop?.id) {
    return (
      <AdminPageScaffold
        title="Canais de Notificação"
        subtitle="Configure como enviar notificações para seus clientes"
        icon={MessageSquare}
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Canais de Notificação"
      subtitle="Configure como enviar notificações para seus clientes"
      icon={MessageSquare}
      actions={
        <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* WhatsApp - Simplified */}
          <WhatsAppSimpleCard
            barbershopId={barbershop.id}
            barbershopSlug={barbershop.slug}
            settings={{
              whatsapp_enabled: settings.whatsapp_enabled,
              whatsapp_send_booking_confirmation: settings.whatsapp_send_booking_confirmation,
              whatsapp_send_booking_reminder: settings.whatsapp_send_booking_reminder,
            }}
            onSettingsChange={(whatsappSettings) => 
              setSettings(prev => ({ ...prev, ...whatsappSettings }))
            }
          />

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Notificações por Email</CardTitle>
                    <CardDescription>
                      Configure o envio automático de emails para clientes
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Tipos de Notificação</h4>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Confirmação de Agendamento</p>
                      <p className="text-xs text-muted-foreground">
                        Enviar email quando um agendamento é criado
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.send_booking_confirmation}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, send_booking_confirmation: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-sm font-medium">Lembrete de Agendamento</p>
                      <p className="text-xs text-muted-foreground">
                        Enviar lembrete antes do horário marcado
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.send_booking_reminder}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ ...prev, send_booking_reminder: checked }))
                    }
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestEmail}
                  disabled={isTestingEmail}
                  className="w-full mt-4"
                >
                  {isTestingEmail ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <TestTube className="w-4 h-4 mr-2" />
                  )}
                  Testar Notificação por Email
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </AdminPageScaffold>
  );
}

export default NotificationChannelsPage;
