import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building, Save, Loader2, Upload, Instagram, Phone, MapPin, Clock, Globe } from "lucide-react";
import ImageUpload from "@/components/ImageUpload";

interface BusinessHours {
  [key: string]: { open: string; close: string; enabled: boolean };
}

const defaultBusinessHours: BusinessHours = {
  monday: { open: "09:00", close: "18:00", enabled: true },
  tuesday: { open: "09:00", close: "18:00", enabled: true },
  wednesday: { open: "09:00", close: "18:00", enabled: true },
  thursday: { open: "09:00", close: "18:00", enabled: true },
  friday: { open: "09:00", close: "18:00", enabled: true },
  saturday: { open: "09:00", close: "14:00", enabled: true },
  sunday: { open: "09:00", close: "14:00", enabled: false },
};

const dayLabels: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function BarbershopSettingsPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    logo_url: "",
    cover_url: "",
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);

  const { data: barbershopData, isLoading } = useQuery({
    queryKey: ["barbershop-settings", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return null;
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .eq("id", barbershop.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  useEffect(() => {
    if (barbershopData) {
      setFormData({
        name: barbershopData.name || "",
        description: barbershopData.description || "",
        address: barbershopData.address || "",
        phone: barbershopData.phone || "",
        whatsapp: barbershopData.whatsapp || "",
        instagram: barbershopData.instagram || "",
        logo_url: barbershopData.logo_url || "",
        cover_url: barbershopData.cover_url || "",
      });
      if (barbershopData.business_hours && typeof barbershopData.business_hours === 'object') {
        setBusinessHours({ ...defaultBusinessHours, ...(barbershopData.business_hours as BusinessHours) });
      }
    }
  }, [barbershopData]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { business_hours: BusinessHours }) => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      const { error } = await supabase
        .from("barbershops")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", barbershop.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configurações salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop-settings"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ ...formData, business_hours: businessHours });
  };

  const handleLogoUpload = async (file: File) => {
    if (!barbershop?.id) return;
    
    // Validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershop.id}/logo-${Date.now()}.${fileExt}`;
      
      // Upload to storage (using correct bucket)
      const { error: uploadError } = await supabase.storage
        .from('barbershop-branding')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('barbershop-branding')
        .getPublicUrl(fileName);
      
      // Immediately persist to database
      const { error: updateError } = await supabase
        .from("barbershops")
        .update({ 
          logo_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", barbershop.id);
      
      if (updateError) throw updateError;
      
      setFormData(prev => ({ ...prev, logo_url: publicUrl }));
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-settings"] });
      toast.success("Logo salvo com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar logo:", error);
      toast.error(error.message || "Erro ao enviar logo");
    }
  };

  const handleCoverUpload = async (file: File) => {
    if (!barbershop?.id) return;
    
    // Validation
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPEG ou WebP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 2MB.");
      return;
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${barbershop.id}/cover-${Date.now()}.${fileExt}`;
      
      // Upload to storage (using correct bucket)
      const { error: uploadError } = await supabase.storage
        .from('barbershop-branding')
        .upload(fileName, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('barbershop-branding')
        .getPublicUrl(fileName);
      
      // Immediately persist to database
      const { error: updateError } = await supabase
        .from("barbershops")
        .update({ 
          cover_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", barbershop.id);
      
      if (updateError) throw updateError;
      
      setFormData(prev => ({ ...prev, cover_url: publicUrl }));
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-settings"] });
      toast.success("Imagem de capa salva com sucesso!");
    } catch (error: any) {
      console.error("Erro ao enviar capa:", error);
      toast.error(error.message || "Erro ao enviar capa");
    }
  };

  const handleHoursChange = (day: string, field: "open" | "close" | "enabled", value: string | boolean) => {
    setBusinessHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  if (!barbershop?.id) {
    return (
      <AdminPageScaffold
        title="Perfil da Barbearia"
        subtitle="Dados e configurações do estabelecimento"
        icon={Building}
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Perfil da Barbearia"
      subtitle="Dados e configurações do estabelecimento"
      icon={Building}
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
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>Nome, descrição e identidade visual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Barbearia</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do estabelecimento"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Rua, número, bairro, cidade"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descrição sobre a barbearia..."
                  rows={3}
                />
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <ImageUpload
                    label="Logo"
                    currentImageUrl={formData.logo_url}
                    onImageSelect={handleLogoUpload}
                    aspectRatio="square"
                  />
                </div>
                <div className="space-y-2">
                  <ImageUpload
                    label="Capa"
                    currentImageUrl={formData.cover_url}
                    onImageSelect={handleCoverUpload}
                    aspectRatio="landscape"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contato e Redes Sociais
              </CardTitle>
              <CardDescription>Informações de contato para os clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="5511999999999"
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      value={formData.instagram}
                      onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                      placeholder="@suabarbearia"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Horário de Funcionamento
              </CardTitle>
              <CardDescription>Configure os dias e horários de atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(businessHours).map(([day, hours]) => (
                  <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 sm:w-40 shrink-0">
                      <Switch
                        checked={hours.enabled}
                        onCheckedChange={(checked) => handleHoursChange(day, "enabled", checked)}
                      />
                      <span className={`text-sm font-medium ${!hours.enabled && "text-muted-foreground"}`}>
                        {dayLabels[day]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 pl-8 sm:pl-0">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => handleHoursChange(day, "open", e.target.value)}
                        disabled={!hours.enabled}
                        className="w-full sm:w-28"
                      />
                      <span className="text-muted-foreground text-sm shrink-0">às</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => handleHoursChange(day, "close", e.target.value)}
                        disabled={!hours.enabled}
                        className="w-full sm:w-28"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </AdminPageScaffold>
  );
}

export default BarbershopSettingsPage;
