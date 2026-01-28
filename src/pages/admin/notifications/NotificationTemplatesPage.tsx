import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Mail, MessageSquare, Plus, Pencil, Trash2, Eye, Copy, CheckCircle2, Clock, Calendar, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { toast } from "sonner";

interface NotificationTemplate {
  id: string;
  barbershop_id: string;
  name: string;
  type: "email" | "whatsapp";
  trigger_event: string;
  subject: string | null;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TRIGGER_EVENTS = [
  { value: "booking_confirmation", label: "Confirmação de Agendamento", icon: CheckCircle2 },
  { value: "booking_reminder", label: "Lembrete de Agendamento", icon: Clock },
  { value: "booking_cancelled", label: "Agendamento Cancelado", icon: Calendar },
];

const PLACEHOLDERS = [
  { key: "{{cliente_nome}}", description: "Nome do cliente" },
  { key: "{{cliente_telefone}}", description: "Telefone do cliente" },
  { key: "{{servico_nome}}", description: "Nome do serviço" },
  { key: "{{servico_preco}}", description: "Preço do serviço" },
  { key: "{{profissional_nome}}", description: "Nome do profissional" },
  { key: "{{data_agendamento}}", description: "Data do agendamento" },
  { key: "{{hora_agendamento}}", description: "Hora do agendamento" },
  { key: "{{barbearia_nome}}", description: "Nome da barbearia" },
  { key: "{{barbearia_endereco}}", description: "Endereço da barbearia" },
  { key: "{{barbearia_telefone}}", description: "Telefone da barbearia" },
  { key: "{{barbearia_logo_url}}", description: "Logo da barbearia" },
  { key: "{{imperio_logo_url}}", description: "Logo do ImperioApp" },
];

const DEFAULT_TEMPLATES = {
  email: {
    booking_confirmation: {
      name: "Confirmação de Agendamento - Email",
      subject: "ImperioApp - Confirmação de Agendamento",
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header com logo ImperioApp -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #ffffff;">
              <img src="{{imperio_logo_url}}" alt="ImperioApp" style="height: 60px; max-width: 200px;" />
            </td>
          </tr>
          
          <!-- Título -->
          <tr>
            <td align="center" style="padding: 0 20px 20px;">
              <h1 style="margin: 0; color: #1a1a2e; font-size: 22px; font-weight: 600;">{{barbearia_nome}} - Confirmação de Agendamento</h1>
            </td>
          </tr>
          
          <!-- Saudação com nome do cliente -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="margin: 0; color: #333; font-size: 16px;">Olá, <strong>{{cliente_nome}}</strong>!</p>
              <p style="margin: 10px 0 0; color: #666; font-size: 14px;">Seu agendamento foi confirmado com sucesso.</p>
            </td>
          </tr>
          
          <!-- Card com informações -->
          <tr>
            <td style="padding: 0 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Logo da barbearia -->
                        <td width="100" valign="top" style="padding-right: 20px;">
                          <img src="{{barbearia_logo_url}}" alt="{{barbearia_nome}}" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover; background-color: #333;" />
                          <p style="margin: 8px 0 0; color: #ffffff; font-size: 12px; text-align: center;">{{barbearia_nome}}</p>
                        </td>
                        <!-- Informações do agendamento -->
                        <td valign="top" style="color: #ffffff;">
                          <p style="margin: 0 0 10px; font-size: 14px;"><strong>Serviço:</strong> {{servico_nome}}</p>
                          <p style="margin: 0 0 10px; font-size: 14px;"><strong>Data:</strong> {{data_agendamento}} {{hora_agendamento}}</p>
                          <p style="margin: 0 0 10px; font-size: 14px;"><strong>Profissional:</strong> {{profissional_nome}}</p>
                          <p style="margin: 0; font-size: 14px;"><strong>Valor:</strong> R$ {{servico_preco}}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 13px;">Enviado por ImperioApp</p>
              <p style="margin: 0; color: #999; font-size: 11px;">{{barbearia_endereco}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    booking_reminder: {
      name: "Lembrete de Agendamento - Email",
      subject: "ImperioApp - Lembrete de Agendamento",
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header com logo ImperioApp -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #ffffff;">
              <img src="{{imperio_logo_url}}" alt="ImperioApp" style="height: 60px; max-width: 200px;" />
            </td>
          </tr>
          
          <!-- Saudação com nome do cliente -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="margin: 0; color: #333; font-size: 16px; text-align: center;">Olá, <strong>{{cliente_nome}}</strong>!</p>
            </td>
          </tr>
          
          <!-- Card com lembrete -->
          <tr>
            <td style="padding: 0 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 600;">Lembrete de Agendamento</h2>
                    <p style="margin: 0 0 15px; color: #ffffff; font-size: 15px; line-height: 1.6;">
                      Você tem <strong>{{servico_nome}}</strong> em <strong>{{data_agendamento}} {{hora_agendamento}}</strong><br/>
                      com {{profissional_nome}} no(a) <strong>{{barbearia_nome}}</strong>.
                    </p>
                    <p style="margin: 0; color: #cccccc; font-size: 13px; line-height: 1.5;">
                      Caso não puder comparecer, cancele seu horário com antecedência pelo Aplicativo ou entre em contato com o estabelecimento.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 30px 20px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 13px;">Enviado por ImperioApp</p>
              <p style="margin: 0; color: #999; font-size: 11px;">{{barbearia_endereco}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
    booking_cancelled: {
      name: "Cancelamento de Agendamento - Email",
      subject: "ImperioApp - Agendamento Cancelado",
      content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <!-- Header com logo ImperioApp -->
          <tr>
            <td align="center" style="padding: 30px 20px; background-color: #ffffff;">
              <img src="{{imperio_logo_url}}" alt="ImperioApp" style="height: 60px; max-width: 200px;" />
            </td>
          </tr>
          
          <!-- Saudação com nome do cliente -->
          <tr>
            <td style="padding: 0 20px 20px;">
              <p style="margin: 0; color: #333; font-size: 16px; text-align: center;">Olá, <strong>{{cliente_nome}}</strong>!</p>
            </td>
          </tr>
          
          <!-- Card com cancelamento -->
          <tr>
            <td style="padding: 0 20px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dc2626; border-radius: 8px; overflow: hidden;">
                <tr>
                  <td style="padding: 30px; text-align: center;">
                    <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 20px; font-weight: 600;">Agendamento Cancelado</h2>
                    <p style="margin: 0 0 10px; color: #ffffff; font-size: 15px;">
                      Seu agendamento foi cancelado.
                    </p>
                    <p style="margin: 0; color: #fecaca; font-size: 14px;">
                      {{servico_nome}} - {{data_agendamento}} às {{hora_agendamento}}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Reagendar -->
          <tr>
            <td align="center" style="padding: 25px 20px;">
              <p style="margin: 0; color: #666; font-size: 14px;">Para reagendar, acesse nosso sistema ou entre em contato.</p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="margin: 0 0 10px; color: #666; font-size: 13px;">Enviado por ImperioApp</p>
              <p style="margin: 0; color: #999; font-size: 11px;">{{barbearia_endereco}}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    },
  },
  whatsapp: {
    booking_confirmation: {
      name: "Confirmação de Agendamento - WhatsApp",
      subject: null,
      content: `*{{barbearia_nome}}*
Confirmação de Agendamento

Olá, {{cliente_nome}}.

Seu agendamento foi confirmado com sucesso.

Serviço: {{servico_nome}}
Data: {{data_agendamento}} às {{hora_agendamento}}
Profissional: {{profissional_nome}}
Valor: R$ {{servico_preco}}

Endereço: {{barbearia_endereco}}

Aguardamos você.
_ImperioApp_`,
    },
    booking_reminder: {
      name: "Lembrete de Agendamento - WhatsApp",
      subject: null,
      content: `*{{barbearia_nome}}*
Lembrete de Agendamento

Olá, {{cliente_nome}}.

Este é um lembrete do seu agendamento:

Serviço: {{servico_nome}}
Data: {{data_agendamento}} às {{hora_agendamento}}
Profissional: {{profissional_nome}}

Endereço: {{barbearia_endereco}}

Caso não possa comparecer, pedimos que cancele com antecedência.

_ImperioApp_`,
    },
    booking_cancelled: {
      name: "Cancelamento de Agendamento - WhatsApp",
      subject: null,
      content: `*{{barbearia_nome}}*
Agendamento Cancelado

Olá, {{cliente_nome}}.

Informamos que seu agendamento foi cancelado:

Serviço: {{servico_nome}}
Data: {{data_agendamento}} às {{hora_agendamento}}

Para reagendar, acesse nosso sistema ou entre em contato.

{{barbearia_telefone}}

_ImperioApp_`,
    },
  },
};

export function NotificationTemplatesPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"email" | "whatsapp">("email");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<NotificationTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "email" as "email" | "whatsapp",
    trigger_event: "booking_confirmation",
    subject: "",
    content: "",
    is_active: true,
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["notification-templates", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("notification_templates")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("trigger_event", { ascending: true });

      if (error) throw error;
      return data as NotificationTemplate[];
    },
    enabled: !!barbershop?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");

      const payload = {
        barbershop_id: barbershop.id,
        name: data.name,
        type: data.type,
        trigger_event: data.trigger_event,
        subject: data.type === "email" ? data.subject : null,
        content: data.content,
        is_active: data.is_active,
      };

      if (data.id) {
        const { error } = await supabase
          .from("notification_templates")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_templates")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      setDialogOpen(false);
      resetForm();
      toast.success(editingTemplate ? "Template atualizado!" : "Template criado!");
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      toast.error("Erro ao salvar template");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notification_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Template excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir template");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("notification_templates")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Status atualizado!");
    },
  });

  // Mutation para restaurar templates de email ao padrão
  const resetEmailTemplatesMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");

      // Para cada evento, atualizar ou criar o template padrão de email
      const events = ["booking_confirmation", "booking_reminder", "booking_cancelled"] as const;
      
      for (const event of events) {
        const defaultTemplate = DEFAULT_TEMPLATES.email[event];
        const existingTemplate = emailTemplates.find(t => t.trigger_event === event);

        const payload = {
          barbershop_id: barbershop.id,
          name: defaultTemplate.name,
          type: "email" as const,
          trigger_event: event,
          subject: defaultTemplate.subject,
          content: defaultTemplate.content,
          is_active: true,
        };

        if (existingTemplate) {
          // Atualizar template existente
          const { error } = await supabase
            .from("notification_templates")
            .update(payload)
            .eq("id", existingTemplate.id);
          if (error) throw error;
        } else {
          // Criar novo template
          const { error } = await supabase
            .from("notification_templates")
            .insert(payload);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-templates"] });
      toast.success("Templates de email restaurados ao padrão!");
    },
    onError: (error) => {
      console.error("Error resetting email templates:", error);
      toast.error("Erro ao restaurar templates");
    },
  });

  const handleResetEmailTemplates = () => {
    if (confirm("Restaurar todos os templates de email ao padrão do sistema? Esta ação não pode ser desfeita.")) {
      resetEmailTemplatesMutation.mutate();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: activeTab,
      trigger_event: "booking_confirmation",
      subject: "",
      content: "",
      is_active: true,
    });
    setEditingTemplate(null);
  };

  const handleNewTemplate = () => {
    // Só permite criar novos templates de WhatsApp
    if (activeTab === "email") {
      toast.error("Templates de email são gerenciados pelo sistema");
      return;
    }
    resetForm();
    setFormData((prev) => ({ ...prev, type: activeTab }));
    setDialogOpen(true);
  };

  const handleEditTemplate = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type as "email" | "whatsapp",
      trigger_event: template.trigger_event,
      subject: template.subject || "",
      content: template.content,
      is_active: template.is_active,
    });
    setDialogOpen(true);
  };

  const handleUseDefault = (triggerEvent: string) => {
    const defaultTemplate = DEFAULT_TEMPLATES[formData.type][triggerEvent as keyof typeof DEFAULT_TEMPLATES.email];
    if (defaultTemplate) {
      setFormData((prev) => ({
        ...prev,
        name: defaultTemplate.name,
        subject: defaultTemplate.subject || "",
        content: defaultTemplate.content,
      }));
      toast.success("Template padrão carregado!");
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.content) {
      toast.error("Preencha nome e conteúdo do template");
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingTemplate?.id,
    });
  };

  const handlePreview = (template: NotificationTemplate) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const insertPlaceholder = (placeholder: string) => {
    setFormData((prev) => ({
      ...prev,
      content: prev.content + placeholder,
    }));
  };

  const getSampleData = (): Record<string, string> => ({
    "{{cliente_nome}}": "João Silva",
    "{{cliente_telefone}}": "(11) 99999-9999",
    "{{servico_nome}}": "Corte + Barba",
    "{{servico_preco}}": "75,00",
    "{{profissional_nome}}": "Carlos",
    "{{data_agendamento}}": "25/01/2026",
    "{{hora_agendamento}}": "14:30",
    "{{barbearia_nome}}": barbershop?.name || "Barbearia",
    "{{barbearia_endereco}}": barbershop?.address || "Rua Exemplo, 123",
    "{{barbearia_telefone}}": barbershop?.phone || "(11) 1234-5678",
    "{{barbearia_logo_url}}": barbershop?.logo_url || "https://via.placeholder.com/80x80?text=Logo",
    "{{imperio_logo_url}}": "https://utxzksrbunutqhcmimew.supabase.co/storage/v1/object/public/assets/imperio-logo.webp",
  });

  const renderPreviewContent = (content: string) => {
    const sampleData = getSampleData();
    let preview = content;
    Object.entries(sampleData).forEach(([key, value]) => {
      preview = preview.split(key).join(value);
    });
    return preview;
  };

  const isHtmlContent = (content: string) => {
    return content.trim().startsWith("<!DOCTYPE") || content.trim().startsWith("<html") || content.includes("<table");
  };

  const emailTemplates = templates?.filter((t) => t.type === "email") || [];
  const whatsappTemplates = templates?.filter((t) => t.type === "whatsapp") || [];

  const getTriggerLabel = (event: string) => {
    return TRIGGER_EVENTS.find((e) => e.value === event)?.label || event;
  };

  const getTriggerIcon = (event: string) => {
    const Icon = TRIGGER_EVENTS.find((e) => e.value === event)?.icon || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <AdminPageScaffold
      title="Templates de Notificação"
      subtitle="Configure mensagens automáticas para email e WhatsApp"
      icon={FileText}
      actionLabel="Novo Template"
      onAction={handleNewTemplate}
    >
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "email" | "whatsapp")}>
        <TabsList className="mb-6">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : emailTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum template de Email</h3>
                <p className="text-muted-foreground mb-4">Crie templates para envios automáticos por email</p>
                <Button onClick={handleNewTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {emailTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEditTemplate(template)}
                  onDelete={() => deleteMutation.mutate(template.id)}
                  onToggle={(active) => toggleActiveMutation.mutate({ id: template.id, is_active: active })}
                  onPreview={() => handlePreview(template)}
                  getTriggerLabel={getTriggerLabel}
                  getTriggerIcon={getTriggerIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="whatsapp">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : whatsappTemplates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Nenhum template de WhatsApp</h3>
                <p className="text-muted-foreground mb-4">Crie templates para envios automáticos por WhatsApp</p>
                <Button onClick={handleNewTemplate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {whatsappTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => handleEditTemplate(template)}
                  onDelete={() => deleteMutation.mutate(template.id)}
                  onToggle={(active) => toggleActiveMutation.mutate({ id: template.id, is_active: active })}
                  onPreview={() => handlePreview(template)}
                  getTriggerLabel={getTriggerLabel}
                  getTriggerIcon={getTriggerIcon}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Editar Template" : "Novo Template"}</DialogTitle>
            <DialogDescription>
              Configure o template de {formData.type === "email" ? "email" : "WhatsApp"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Confirmação de Agendamento"
                />
              </div>

              <div className="space-y-2">
                <Label>Evento Disparador</Label>
                <Select
                  value={formData.trigger_event}
                  onValueChange={(v) => setFormData({ ...formData, trigger_event: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
                        <div className="flex items-center gap-2">
                          <event.icon className="h-4 w-4" />
                          {event.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === "email" && (
              <div className="space-y-2">
                <Label>Assunto do Email</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Confirmação de Agendamento - {{barbearia_nome}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Conteúdo da Mensagem</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleUseDefault(formData.trigger_event)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Usar Padrão
                </Button>
              </div>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Digite o conteúdo da mensagem..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {/* Placeholders */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Variáveis Disponíveis (clique para inserir)</Label>
              <div className="flex flex-wrap gap-2">
                {PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => insertPlaceholder(p.key)}
                    title={p.description}
                  >
                    {p.key}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Template ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className={previewTemplate?.type === "email" && isHtmlContent(previewTemplate?.content || "") ? "max-w-3xl max-h-[90vh]" : "max-w-lg"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prévia do Template
            </DialogTitle>
            <DialogDescription>{previewTemplate?.name}</DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              {previewTemplate.type === "email" && previewTemplate.subject && (
                <div>
                  <Label className="text-xs text-muted-foreground">Assunto</Label>
                  <p className="font-medium">{renderPreviewContent(previewTemplate.subject)}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                {previewTemplate.type === "email" && isHtmlContent(previewTemplate.content) ? (
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <iframe
                      srcDoc={renderPreviewContent(previewTemplate.content)}
                      className="w-full h-[500px] border-0"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                ) : (
                  <div
                    className={`p-4 rounded-lg whitespace-pre-wrap text-sm ${
                      previewTemplate.type === "whatsapp"
                        ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                        : "bg-muted"
                    }`}
                  >
                    {renderPreviewContent(previewTemplate.content)}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

interface TemplateCardProps {
  template: NotificationTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  onPreview: () => void;
  getTriggerLabel: (event: string) => string;
  getTriggerIcon: (event: string) => React.ReactNode;
}

function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggle,
  onPreview,
  getTriggerLabel,
  getTriggerIcon,
}: TemplateCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              {template.type === "email" ? (
                <Mail className="h-4 w-4 text-blue-500" />
              ) : (
                <MessageSquare className="h-4 w-4 text-green-500" />
              )}
              {template.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {getTriggerIcon(template.trigger_event)}
              {getTriggerLabel(template.trigger_event)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={template.is_active ? "default" : "secondary"}>
              {template.is_active ? "Ativo" : "Inativo"}
            </Badge>
            <Switch checked={template.is_active} onCheckedChange={onToggle} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{template.content}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-1" />
            Prévia
          </Button>
          {/* Apenas WhatsApp pode ser editado - Email é protegido para evitar quebra do HTML */}
          {template.type === "whatsapp" && (
            <>
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </>
          )}
        </div>
        {template.type === "email" && (
          <p className="text-xs text-muted-foreground mt-2">
            Templates de email são gerenciados pelo sistema para garantir a formatação correta.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default NotificationTemplatesPage;
