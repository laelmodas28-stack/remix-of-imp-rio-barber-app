import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format as formatDate, subDays, subMonths } from "date-fns";
import { Download, FileSpreadsheet, FileText, Calendar, Users, Scissors, DollarSign, ClipboardList, Loader2 } from "lucide-react";

type ExportType = "bookings" | "clients" | "services" | "professionals" | "transactions" | "subscriptions";
type FileFormat = "csv" | "json";

interface ExportConfig {
  type: ExportType;
  label: string;
  description: string;
  icon: React.ElementType;
  fields: { key: string; label: string; default: boolean }[];
}

const exportConfigs: ExportConfig[] = [
  {
    type: "bookings",
    label: "Agendamentos",
    description: "Exportar histórico de agendamentos",
    icon: Calendar,
    fields: [
      { key: "booking_date", label: "Data", default: true },
      { key: "booking_time", label: "Horário", default: true },
      { key: "client_name", label: "Cliente", default: true },
      { key: "service_name", label: "Serviço", default: true },
      { key: "professional_name", label: "Profissional", default: true },
      { key: "price", label: "Valor", default: true },
      { key: "status", label: "Status", default: true },
      { key: "notes", label: "Observações", default: false },
    ],
  },
  {
    type: "clients",
    label: "Clientes",
    description: "Exportar lista de clientes",
    icon: Users,
    fields: [
      { key: "name", label: "Nome", default: true },
      { key: "email", label: "Email", default: true },
      { key: "phone", label: "Telefone", default: true },
      { key: "created_at", label: "Cadastrado em", default: true },
    ],
  },
  {
    type: "services",
    label: "Serviços",
    description: "Exportar catálogo de serviços",
    icon: Scissors,
    fields: [
      { key: "name", label: "Nome", default: true },
      { key: "description", label: "Descrição", default: true },
      { key: "price", label: "Preço", default: true },
      { key: "duration_minutes", label: "Duração (min)", default: true },
      { key: "is_active", label: "Ativo", default: true },
    ],
  },
  {
    type: "professionals",
    label: "Profissionais",
    description: "Exportar equipe de profissionais",
    icon: Users,
    fields: [
      { key: "name", label: "Nome", default: true },
      { key: "bio", label: "Bio", default: true },
      { key: "specialties", label: "Especialidades", default: true },
      { key: "commission_percentage", label: "Comissão (%)", default: true },
      { key: "is_active", label: "Ativo", default: true },
    ],
  },
  {
    type: "transactions",
    label: "Transações",
    description: "Exportar transações financeiras",
    icon: DollarSign,
    fields: [
      { key: "created_at", label: "Data", default: true },
      { key: "amount", label: "Valor", default: true },
      { key: "status", label: "Status", default: true },
      { key: "payment_method", label: "Método", default: true },
    ],
  },
  {
    type: "subscriptions",
    label: "Assinaturas",
    description: "Exportar assinaturas de clientes",
    icon: ClipboardList,
    fields: [
      { key: "client_name", label: "Cliente", default: true },
      { key: "plan_name", label: "Plano", default: true },
      { key: "started_at", label: "Início", default: true },
      { key: "expires_at", label: "Vencimento", default: true },
      { key: "status", label: "Status", default: true },
    ],
  },
];

export function ExportCenterPage() {
  const { barbershop } = useBarbershopContext();
  const [selectedType, setSelectedType] = useState<ExportType>("bookings");
  const [format, setFormat] = useState<FileFormat>("csv");
  const [dateRange, setDateRange] = useState("30d");
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);

  const config = exportConfigs.find(c => c.type === selectedType)!;

  const handleTypeChange = (type: ExportType) => {
    setSelectedType(type);
    const newConfig = exportConfigs.find(c => c.type === type)!;
    const fields: Record<string, boolean> = {};
    newConfig.fields.forEach(f => { fields[f.key] = f.default; });
    setSelectedFields(fields);
  };

  const handleFieldToggle = (key: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getDateFilter = () => {
    const end = new Date();
    let start: Date;
    switch (dateRange) {
      case "7d": start = subDays(end, 7); break;
      case "30d": start = subDays(end, 30); break;
      case "90d": start = subDays(end, 90); break;
      case "12m": start = subMonths(end, 12); break;
      case "all": return null;
      default: start = subDays(end, 30);
    }
    return { start: formatDate(start, "yyyy-MM-dd"), end: formatDate(end, "yyyy-MM-dd") };
  };

  const handleExport = async () => {
    if (!barbershop?.id) return;
    
    setIsExporting(true);
    try {
      let data: any[] = [];
      const dateFilter = getDateFilter();

      switch (selectedType) {
        case "bookings": {
          let query = supabase
            .from("bookings")
            .select(`
              *,
              services(name),
              professionals(name),
              profiles:client_id(name)
            `)
            .eq("barbershop_id", barbershop.id);
          
          if (dateFilter) {
            query = query.gte("booking_date", dateFilter.start).lte("booking_date", dateFilter.end);
          }
          
          const { data: bookings, error } = await query;
          if (error) throw error;
          
          data = (bookings || []).map(b => ({
            booking_date: b.booking_date,
            booking_time: b.booking_time,
            client_name: (b.profiles as any)?.name || "",
            service_name: (b.services as any)?.name || "",
            professional_name: (b.professionals as any)?.name || "",
            price: b.price,
            status: b.status,
            notes: b.notes,
          }));
          break;
        }
        case "clients": {
          const { data: clients, error } = await supabase
            .from("barbershop_clients")
            .select("*, profiles:user_id(name, email, phone, created_at)")
            .eq("barbershop_id", barbershop.id);
          
          if (error) throw error;
          
          data = (clients || []).map(c => ({
            name: (c.profiles as any)?.name || "",
            email: (c.profiles as any)?.email || "",
            phone: (c.profiles as any)?.phone || "",
            created_at: (c.profiles as any)?.created_at || "",
          }));
          break;
        }
        case "services": {
          const { data: services, error } = await supabase
            .from("services")
            .select("*")
            .eq("barbershop_id", barbershop.id);
          
          if (error) throw error;
          data = services || [];
          break;
        }
        case "professionals": {
          const { data: professionals, error } = await supabase
            .from("professionals")
            .select("*")
            .eq("barbershop_id", barbershop.id);
          
          if (error) throw error;
          data = (professionals || []).map(p => ({
            ...p,
            specialties: p.specialties?.join(", ") || "",
          }));
          break;
        }
        case "transactions": {
          let query = supabase
            .from("payment_transactions")
            .select("*")
            .eq("barbershop_id", barbershop.id);
          
          if (dateFilter) {
            query = query.gte("created_at", dateFilter.start).lte("created_at", dateFilter.end);
          }
          
          const { data: transactions, error } = await query;
          if (error) throw error;
          data = transactions || [];
          break;
        }
        case "subscriptions": {
          const { data: subs, error } = await supabase
            .from("client_subscriptions")
            .select(`
              *,
              subscription_plans(name),
              profiles:user_id(name)
            `)
            .eq("barbershop_id", barbershop.id);
          
          if (error) throw error;
          
          data = (subs || []).map(s => ({
            client_name: (s.profiles as any)?.name || "",
            plan_name: (s.subscription_plans as any)?.name || "",
            started_at: s.started_at,
            expires_at: s.expires_at,
            status: s.status,
          }));
          break;
        }
      }

      // Filter fields
      const activeFields = Object.entries(selectedFields)
        .filter(([_, active]) => active)
        .map(([key]) => key);
      
      if (activeFields.length === 0) {
        toast.error("Selecione pelo menos um campo para exportar");
        return;
      }

      const filteredData = data.map(item => {
        const filtered: Record<string, any> = {};
        activeFields.forEach(key => {
          filtered[key] = item[key];
        });
        return filtered;
      });

      // Generate file
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "csv") {
        const headers = activeFields.join(",");
        const rows = filteredData.map(item => 
          activeFields.map(key => {
            const value = item[key];
            if (value === null || value === undefined) return "";
            if (typeof value === "string" && value.includes(",")) return `"${value}"`;
            return value;
          }).join(",")
        );
        content = [headers, ...rows].join("\n");
        mimeType = "text/csv";
        extension = "csv";
      } else {
        content = JSON.stringify(filteredData, null, 2);
        mimeType = "application/json";
        extension = "json";
      }

      // Download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedType}-${formatDate(new Date(), "yyyy-MM-dd")}.${extension}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exportação concluída! ${filteredData.length} registros exportados.`);
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error(error.message || "Erro ao exportar dados");
    } finally {
      setIsExporting(false);
    }
  };

  // Initialize selected fields
  useState(() => {
    const fields: Record<string, boolean> = {};
    config.fields.forEach(f => { fields[f.key] = f.default; });
    setSelectedFields(fields);
  });

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Central de Exportação" subtitle="Exporte dados da barbearia" icon={Download} />;
  }

  return (
    <AdminPageScaffold
      title="Central de Exportação"
      subtitle="Exporte dados da barbearia em diversos formatos"
      icon={Download}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Type Selection */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tipo de Dados</CardTitle>
              <CardDescription>Selecione o que deseja exportar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {exportConfigs.map((exportConfig) => (
                <button
                  key={exportConfig.type}
                  onClick={() => handleTypeChange(exportConfig.type)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                    selectedType === exportConfig.type
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    selectedType === exportConfig.type ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <exportConfig.icon className={`w-4 h-4 ${
                      selectedType === exportConfig.type ? "text-primary" : "text-muted-foreground"
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{exportConfig.label}</p>
                    <p className="text-xs text-muted-foreground">{exportConfig.description}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Configuration */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Exportação</CardTitle>
              <CardDescription>Personalize os dados exportados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Format and Date Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Formato do Arquivo</Label>
                  <Select value={format} onValueChange={(v) => setFormat(v as FileFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4" />
                          CSV (Excel)
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          JSON
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                      <SelectItem value="12m">Últimos 12 meses</SelectItem>
                      <SelectItem value="all">Todo o período</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Field Selection */}
              <div className="space-y-3">
                <Label>Campos a Exportar</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {config.fields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-center space-x-2 p-2 rounded-lg border border-border"
                    >
                      <Checkbox
                        id={field.key}
                        checked={selectedFields[field.key] ?? field.default}
                        onCheckedChange={() => handleFieldToggle(field.key)}
                      />
                      <label
                        htmlFor={field.key}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {field.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Pronto para Exportar</h3>
                  <p className="text-sm text-muted-foreground">
                    Tipo: {config.label} • Formato: {format.toUpperCase()} • 
                    Campos: {Object.values(selectedFields).filter(Boolean).length} selecionados
                  </p>
                </div>
                <Button onClick={handleExport} disabled={isExporting} size="lg">
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {isExporting ? "Exportando..." : "Exportar Dados"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Dicas de Exportação</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Arquivos CSV podem ser abertos diretamente no Excel ou Google Sheets</li>
                <li>• Arquivos JSON são ideais para integração com outros sistemas</li>
                <li>• Selecione apenas os campos necessários para arquivos menores</li>
                <li>• Use "Todo o período" com cautela em bases grandes</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageScaffold>
  );
}

export default ExportCenterPage;
