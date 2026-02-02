import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageCircle, 
  CheckCircle, 
  Loader2, 
  QrCode,
  Bell,
  Send,
  RefreshCw,
  Wifi,
  WifiOff,
  Smartphone,
  AlertCircle,
  LogOut,
  TestTube
} from "lucide-react";
import { sendTestWhatsAppNotification } from "@/lib/notifications/n8nWebhook";
import { 
  getWhatsAppStatus,
  connectWhatsApp,
  disconnectWhatsApp,
  type WhatsAppConnectionStatus 
} from "@/lib/notifications/whatsappService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WhatsAppSimpleSettings {
  whatsapp_enabled: boolean;
  whatsapp_send_booking_confirmation: boolean;
  whatsapp_send_booking_reminder: boolean;
}

interface WhatsAppSimpleCardProps {
  barbershopId: string;
  barbershopSlug: string;
  settings: WhatsAppSimpleSettings;
  onSettingsChange: (settings: Partial<WhatsAppSimpleSettings>) => void;
}

export function WhatsAppSimpleCard({ barbershopId, barbershopSlug, settings, onSettingsChange }: WhatsAppSimpleCardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WhatsAppConnectionStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!barbershopId || !barbershopSlug) return;
    
    setIsLoadingStatus(true);
    try {
      const status = await getWhatsAppStatus(barbershopId, barbershopSlug);
      setConnectionStatus(status);

      // If not connected, try to get QR code
      if (status.state !== "open" && status.state !== "connected" && status.state !== "not_found") {
        const connectResult = await connectWhatsApp(barbershopId, barbershopSlug);
        if (connectResult.qrCode) {
          setQrCode(connectResult.qrCode);
        }
      } else if (status.state === "open" || status.state === "connected") {
        setQrCode(null);
      }
    } catch (error) {
      console.error("Error checking status:", error);
      setConnectionStatus({ state: "error", message: "Erro ao verificar status" });
    } finally {
      setIsLoadingStatus(false);
    }
  }, [barbershopId, barbershopSlug]);

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Auto-refresh when showing QR code (15 seconds to give user time to scan)
  useEffect(() => {
    if (qrCode) {
      const interval = setInterval(checkStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [qrCode, checkStatus]);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await connectWhatsApp(barbershopId, barbershopSlug);
      
      if (result.qrCode) {
        setQrCode(result.qrCode);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else if (result.success) {
        toast.success("WhatsApp conectado!");
        checkStatus();
      } else {
        toast.error(result.message || "Erro ao conectar");
      }
    } catch (error) {
      toast.error("Erro ao conectar WhatsApp");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const result = await disconnectWhatsApp(barbershopId, barbershopSlug);
      
      if (result.success) {
        toast.success("WhatsApp desconectado");
        setConnectionStatus({ state: "close" });
        setQrCode(null);
      } else {
        toast.error(result.message || "Erro ao desconectar");
      }
    } catch (error) {
      toast.error("Erro ao desconectar");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      // Fetch barbershop name for the test
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("name")
        .eq("id", barbershopId)
        .single();

      const barbershopName = barbershop?.name || "Barbearia";
      
      const result = await sendTestWhatsAppNotification(barbershopId, barbershopName);
      
      if (result) {
        toast.success("Notificação de teste enviada para o webhook!");
      } else {
        toast.error("Erro ao enviar notificação de teste. Verifique se o webhook está configurado.");
      }
    } catch (error) {
      console.error("Erro ao testar notificação:", error);
      toast.error("Erro ao enviar notificação de teste");
    } finally {
      setIsTesting(false);
    }
  };

  const updateSetting = <K extends keyof WhatsAppSimpleSettings>(key: K, value: WhatsAppSimpleSettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const isConnected = connectionStatus?.state === "open" || connectionStatus?.state === "connected";

  const getStatusBadge = () => {
    if (isLoadingStatus && !connectionStatus) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          Verificando...
        </Badge>
      );
    }

    if (!connectionStatus || connectionStatus.state === "not_found") {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <AlertCircle className="w-3 h-3 mr-1" />
          Não conectado
        </Badge>
      );
    }

    switch (connectionStatus.state) {
      case "open":
      case "connected":
        return (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
            <Wifi className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case "connecting":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Conectando...
          </Badge>
        );
      case "close":
      case "disconnected":
        return (
          <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
            <WifiOff className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <AlertCircle className="w-3 h-3 mr-1" />
            {connectionStatus.state}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${isConnected ? "bg-green-500/10" : "bg-muted"}`}>
              <MessageCircle className={`w-5 h-5 ${isConnected ? "text-green-500" : "text-muted-foreground"}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base">WhatsApp</CardTitle>
              <CardDescription className="text-xs sm:text-sm line-clamp-2">
                Envie mensagens automáticas para seus clientes
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 mt-2 sm:mt-0 flex-shrink-0">
            {getStatusBadge()}
            <Switch
              checked={settings.whatsapp_enabled}
              onCheckedChange={(checked) => updateSetting("whatsapp_enabled", checked)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        {/* Connection Status & QR Code */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="w-4 h-4 flex-shrink-0" />
              <span>Conexão WhatsApp</span>
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {isConnected && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="text-orange-600 hover:text-orange-700 text-xs sm:text-sm h-8"
                >
                  {isDisconnecting ? (
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  )}
                  Desconectar
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={checkStatus}
                disabled={isLoadingStatus}
                className="text-xs sm:text-sm h-8"
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${isLoadingStatus ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {isConnected ? (
            <div className="space-y-3">
              <Alert className="border-green-500/30 bg-green-500/10">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  WhatsApp conectado e pronto para enviar mensagens!
                  {connectionStatus?.phoneNumber && (
                    <span className="block text-sm mt-1">
                      Número: +{connectionStatus.phoneNumber}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={isTesting}
                className="w-full"
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Testar Notificação
              </Button>
            </div>
          ) : qrCode ? (
            <div className="flex flex-col items-center gap-4 p-4 rounded-lg bg-muted/30 border">
              <div className="text-center">
                <QrCode className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Escaneie o QR Code</p>
                <p className="text-xs text-muted-foreground">
                  Abra o WhatsApp no seu celular e escaneie o código abaixo
                </p>
              </div>
              <div className="relative">
                <img 
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} 
                  alt="QR Code WhatsApp" 
                  className="w-56 h-56 rounded-lg border bg-white p-2"
                />
                {isLoadingStatus && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O QR Code atualiza automaticamente. Após escanear, aguarde a conexão.
              </p>
            </div>
          ) : (
            <div className="text-center py-6">
              <Button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Conectar WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Clique para gerar o QR Code de conexão
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Message Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Tipos de Mensagem</h4>
          
          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium">Confirmação de Agendamento</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                  Enviar mensagem quando um agendamento é criado
                </p>
              </div>
            </div>
            <Switch
              className="flex-shrink-0"
              checked={settings.whatsapp_send_booking_confirmation}
              onCheckedChange={(checked) => 
                updateSetting("whatsapp_send_booking_confirmation", checked)
              }
              disabled={!settings.whatsapp_enabled || !isConnected}
            />
          </div>

          <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium">Lembrete de Agendamento</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
                  Enviar lembrete antes do horário marcado
                </p>
              </div>
            </div>
            <Switch
              className="flex-shrink-0"
              checked={settings.whatsapp_send_booking_reminder}
              onCheckedChange={(checked) => 
                updateSetting("whatsapp_send_booking_reminder", checked)
              }
              disabled={!settings.whatsapp_enabled || !isConnected}
            />
          </div>

          {!isConnected && settings.whatsapp_enabled && (
            <p className="text-xs text-muted-foreground text-center">
              Conecte o WhatsApp para habilitar os tipos de mensagem
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
