import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Settings, Calendar, Bell, CreditCard, Clock, Save, Loader2 } from "lucide-react";
interface BarbershopSettings {
  booking_advance_days: number;
  booking_cancellation_hours: number;
  auto_confirm_bookings: boolean;
  send_booking_reminders: boolean;
  reminder_hours_before: number;
  allow_online_payments: boolean;
  require_deposit: boolean;
  deposit_percentage: number;
  timezone: string;
}
const defaultSettings: BarbershopSettings = {
  booking_advance_days: 30,
  booking_cancellation_hours: 2,
  auto_confirm_bookings: false,
  send_booking_reminders: true,
  reminder_hours_before: 24,
  allow_online_payments: false,
  require_deposit: false,
  deposit_percentage: 0,
  timezone: "America/Sao_Paulo"
};
const timezones = [{
  value: "America/Sao_Paulo",
  label: "São Paulo (GMT-3)"
}, {
  value: "America/Manaus",
  label: "Manaus (GMT-4)"
}, {
  value: "America/Bahia",
  label: "Bahia (GMT-3)"
}, {
  value: "America/Fortaleza",
  label: "Fortaleza (GMT-3)"
}, {
  value: "America/Recife",
  label: "Recife (GMT-3)"
}, {
  value: "America/Cuiaba",
  label: "Cuiabá (GMT-4)"
}, {
  value: "America/Porto_Velho",
  label: "Porto Velho (GMT-4)"
}, {
  value: "America/Rio_Branco",
  label: "Rio Branco (GMT-5)"
}];
export function PreferencesPage() {
  const {
    barbershop
  } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<BarbershopSettings>(defaultSettings);
  const {
    data: existingSettings,
    isLoading
  } = useQuery({
    queryKey: ["barbershop-preferences", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const {
        data,
        error
      } = await supabase.from("barbershop_settings").select("*").eq("barbershop_id", barbershop.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id
  });
  useEffect(() => {
    if (existingSettings) {
      setSettings({
        booking_advance_days: existingSettings.booking_advance_days ?? defaultSettings.booking_advance_days,
        booking_cancellation_hours: existingSettings.booking_cancellation_hours ?? defaultSettings.booking_cancellation_hours,
        auto_confirm_bookings: existingSettings.auto_confirm_bookings ?? defaultSettings.auto_confirm_bookings,
        send_booking_reminders: existingSettings.send_booking_reminders ?? defaultSettings.send_booking_reminders,
        reminder_hours_before: existingSettings.reminder_hours_before ?? defaultSettings.reminder_hours_before,
        allow_online_payments: existingSettings.allow_online_payments ?? defaultSettings.allow_online_payments,
        require_deposit: existingSettings.require_deposit ?? defaultSettings.require_deposit,
        deposit_percentage: existingSettings.deposit_percentage ? Number(existingSettings.deposit_percentage) : defaultSettings.deposit_percentage,
        timezone: existingSettings.timezone ?? defaultSettings.timezone
      });
    }
  }, [existingSettings]);
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      const payload = {
        barbershop_id: barbershop.id,
        ...settings,
        updated_at: new Date().toISOString()
      };
      if (existingSettings) {
        const {
          error
        } = await supabase.from("barbershop_settings").update(payload).eq("id", existingSettings.id);
        if (error) throw error;
      } else {
        const {
          error
        } = await supabase.from("barbershop_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Preferências salvas com sucesso!");
      queryClient.invalidateQueries({
        queryKey: ["barbershop-preferences"]
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar preferências");
    }
  });
  const handleSave = () => {
    saveMutation.mutate();
  };
  if (!barbershop?.id) {
    return <AdminPageScaffold title="Preferências" subtitle="Configurações gerais do sistema" icon={Settings} />;
  }
  return <AdminPageScaffold title="Preferências" subtitle="Configurações gerais do sistema" icon={Settings} actions={<Button onClick={handleSave} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Preferências
        </Button>}>
      {isLoading ? <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div> : <div className="space-y-6">
          {/* Booking Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Configurações de Agendamento
              </CardTitle>
              <CardDescription>
                Defina como os agendamentos funcionam na sua barbearia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="advanceDays">Antecedência máxima (dias)</Label>
                  <Input id="advanceDays" type="number" min={1} max={365} value={settings.booking_advance_days} onChange={e => setSettings(prev => ({
                ...prev,
                booking_advance_days: parseInt(e.target.value) || 30
              }))} />
                  <p className="text-xs text-muted-foreground">
                    Quantos dias no futuro os clientes podem agendar
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellationHours">Limite de cancelamento (horas)</Label>
                  <Input id="cancellationHours" type="number" min={0} max={72} value={settings.booking_cancellation_hours} onChange={e => setSettings(prev => ({
                ...prev,
                booking_cancellation_hours: parseInt(e.target.value) || 2
              }))} />
                  <p className="text-xs text-muted-foreground">
                    Até quantas horas antes o cliente pode cancelar
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Confirmação automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Confirmar agendamentos automaticamente ao serem criados
                  </p>
                </div>
                <Switch checked={settings.auto_confirm_bookings} onCheckedChange={checked => setSettings(prev => ({
              ...prev,
              auto_confirm_bookings: checked
            }))} />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notificações e Lembretes
              </CardTitle>
              <CardDescription>
                Configure os lembretes automáticos para clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enviar lembretes de agendamento</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar clientes antes do horário agendado
                  </p>
                </div>
                <Switch checked={settings.send_booking_reminders} onCheckedChange={checked => setSettings(prev => ({
              ...prev,
              send_booking_reminders: checked
            }))} />
              </div>

              {settings.send_booking_reminders && <div className="space-y-2 pl-4 border-l-2 border-primary/20">
                  <Label htmlFor="reminderHours">Horas antes do agendamento</Label>
                  <Select value={settings.reminder_hours_before.toString()} onValueChange={v => setSettings(prev => ({
              ...prev,
              reminder_hours_before: parseInt(v)
            }))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora antes</SelectItem>
                      <SelectItem value="2">2 horas antes</SelectItem>
                      <SelectItem value="4">4 horas antes</SelectItem>
                      <SelectItem value="12">12 horas antes</SelectItem>
                      <SelectItem value="24">24 horas antes</SelectItem>
                      <SelectItem value="48">48 horas antes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}
            </CardContent>
          </Card>

          {/* Payment Settings */}
          

          {/* Timezone Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Fuso Horário
              </CardTitle>
              <CardDescription>
                Configure o fuso horário para agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="timezone">Fuso horário</Label>
                <Select value={settings.timezone} onValueChange={v => setSettings(prev => ({
              ...prev,
              timezone: v
            }))}>
                  <SelectTrigger className="w-72">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map(tz => <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>}
    </AdminPageScaffold>;
}
export default PreferencesPage;