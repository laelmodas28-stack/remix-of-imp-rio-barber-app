import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Header from "@/components/Header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Users, Scissors, Settings, Image as ImageIcon, User, Trash2, Upload, BarChart3, Plus, Crown, Bell, Send, UserCog, Key, Wallet, Video, Percent } from "lucide-react";
import { toast } from "sonner";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useUserRole } from "@/hooks/useUserRole";
import { useBarbershopClients } from "@/hooks/useBarbershopClients";
import ImageUpload from "@/components/ImageUpload";
import { resizeImage } from "@/lib/imageUtils";
import DashboardMetrics from "@/components/admin/DashboardMetrics";
import FinancialDashboard from "@/components/admin/FinancialDashboard";
import ThemeSelector from "@/components/admin/ThemeSelector";
import ProfessionalForm from "@/components/admin/ProfessionalForm";
import ServiceForm from "@/components/admin/ServiceForm";
import { ProfessionalCard } from "@/components/admin/ProfessionalCard";
import { ServiceCard } from "@/components/admin/ServiceCard";
import { SubscriptionPlanForm } from "@/components/admin/SubscriptionPlanForm";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { BarberInviteForm } from "@/components/admin/BarberInviteForm";
import { UserManagement } from "@/components/admin/UserManagement";
import { RegistrationCodeManager } from "@/components/admin/RegistrationCodeManager";
import { ShareableLink } from "@/components/admin/ShareableLink";
import { WhatsAppButton } from "@/components/admin/WhatsAppButton";
import { VideoTutorialManager } from "@/components/admin/VideoTutorialManager";
import { AdminBookingForm } from "@/components/admin/AdminBookingForm";
import { CommissionDashboard } from "@/components/admin/CommissionDashboard";

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [barbershopName, setBarbershopName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [address, setAddress] = useState("");
  const [openingTime, setOpeningTime] = useState("09:00");
  const [closingTime, setClosingTime] = useState("19:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([
    "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"
  ]);
  
  // Notification settings
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [customMessage, setCustomMessage] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [sendToClient, setSendToClient] = useState(true);
  const [sendWhatsapp, setSendWhatsapp] = useState(false);
  
  // SMS settings (simplified - managed by platform)
  const [sendSms, setSendSms] = useState(false);
  
  // Push settings
  const [pushEnabled, setPushEnabled] = useState(false);
  
  // Reminder settings
  const [reminderMinutes, setReminderMinutes] = useState(30);
  
  // AI settings
  const [aiEnabled, setAiEnabled] = useState(true);
  const [mensagemPersonalizada, setMensagemPersonalizada] = useState("Profissional e acolhedor");

  const weekDays = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

  // Get barbershop data
  const { barbershop } = useBarbershop();
  
  // Check if user is admin
  const { isAdmin, isSuperAdmin, isBarbershopOwner, isLoading: roleLoading } = useUserRole(barbershop?.id);
  
  // Get barbershop clients
  const { clients, getInactiveClients } = useBarbershopClients(barbershop?.id);

  // Get subscription data
  const { plans, refetchPlans, allSubscriptions } = useSubscriptions(barbershop?.id);

  // Set barbershop data when it loads
  useEffect(() => {
    if (barbershop) {
      setBarbershopName(barbershop.name || "");
      setInstagram(barbershop.instagram || "");
      setWhatsapp(barbershop.whatsapp || "");
      setAddress(barbershop.address || "");
      // Use opening_time and closing_time directly from barbershops table
      setOpeningTime(barbershop.opening_time?.substring(0, 5) || "09:00");
      setClosingTime(barbershop.closing_time?.substring(0, 5) || "19:00");
      setMensagemPersonalizada(barbershop.mensagem_personalizada || "Profissional e acolhedor");
      if (barbershop.opening_days && barbershop.opening_days.length > 0) {
        setSelectedDays(barbershop.opening_days);
      }
    }
  }, [barbershop]);

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  const { data: bookings, refetch: refetchBookings } = useQuery({
    queryKey: ["admin-bookings", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          client:profiles!bookings_client_id_fkey(full_name, phone),
          service:services(name),
          professional:professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .order("booking_date", { ascending: true })
        .order("booking_time", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!barbershop,
  });

  const { data: professionals } = useQuery({
    queryKey: ["admin-professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!barbershop,
  });

  const { data: services } = useQuery({
    queryKey: ["admin-services", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!barbershop,
  });

  // Gallery query - using 'gallery' table (not gallery_images)
  const { data: gallery, refetch: refetchGallery } = useQuery({
    queryKey: ["admin-gallery", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      
      const { data, error } = await supabase
        .from("gallery")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("display_order");
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin && !!barbershop,
  });

  // Note: notification_settings table doesn't exist in the schema
  // Using local state only for now - this would need a migration to add the table
  
  // Don't render if not loaded yet or not admin
  if (!user || roleLoading || !isAdmin) {
    return null;
  }

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);

      if (error) throw error;

      toast.success("Status atualizado com sucesso");
      refetchBookings();
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500";
      case "cancelled":
        return "bg-red-500/20 text-red-500";
      case "completed":
        return "bg-blue-500/20 text-blue-500";
      default:
        return "";
    }
  };

  const handleProfessionalPhotoUpload = async (professionalId: string, file: File) => {
    try {
      toast.info("Enviando foto...");

      // Redimensionar imagem
      const resizedFile = await resizeImage(file, 800, 800);

      const fileExt = resizedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `${professionalId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('professional-photos')
        .upload(filePath, resizedFile, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        toast.error(`Erro no upload: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('professional-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('professionals')
        .update({ photo_url: publicUrl })
        .eq('id', professionalId);

      if (updateError) {
        console.error("Erro ao atualizar banco:", updateError);
        toast.error(`Erro ao atualizar: ${updateError.message}`);
        return;
      }

      toast.success("Foto atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-professionals"] });
    } catch (error: any) {
      console.error("Erro geral:", error);
      toast.error(`Erro: ${error?.message || "Erro desconhecido ao fazer upload"}`);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!barbershop) return;
    
    try {
      toast.info("Enviando logo...");

      // Redimensionar logo
      const resizedFile = await resizeImage(file, 512, 512);

      const fileExt = resizedFile.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('barbershop-branding')
        .upload(filePath, resizedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('barbershop-branding')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('barbershops')
        .update({ logo_url: publicUrl })
        .eq('id', barbershop.id);

      if (updateError) throw updateError;

      toast.success("Logo atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-context"] });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da logo");
    }
  };

  const handleNameUpdate = async () => {
    if (!barbershop) return;
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ name: barbershopName })
        .eq('id', barbershop.id);

      if (error) throw error;

      toast.success("Nome atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      queryClient.invalidateQueries({ queryKey: ["barbershop-context"] });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar nome");
    }
  };

  // Note: services table doesn't have image_url column, removing this function
  const handleServiceImageUpload = async (serviceId: string, file: File) => {
    toast.info("Upload de imagem de serviço não disponível no momento");
  };

  const handleGalleryImageUpload = async (file: File) => {
    if (!barbershop) return;
    
    try {
      toast.info("Enviando foto para galeria...");

      // Redimensionar imagem
      const resizedFile = await resizeImage(file, 1200, 1200);

      const fileExt = resizedFile.name.split('.').pop()?.toLowerCase();
      const fileName = `gallery-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, resizedFile, { 
          cacheControl: '3600',
          upsert: true 
        });

      if (uploadError) {
        console.error("Erro no upload:", uploadError);
        toast.error(`Erro no upload: ${uploadError.message}`);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      const nextOrder = (gallery?.length || 0);

      const { error: insertError } = await supabase
        .from('gallery')
        .insert({
          barbershop_id: barbershop.id,
          image_url: publicUrl,
          display_order: nextOrder
        });

      if (insertError) {
        console.error("Erro ao inserir:", insertError);
        toast.error(`Erro ao adicionar à galeria: ${insertError.message}`);
        return;
      }

      toast.success("Foto adicionada à galeria!");
      refetchGallery();
    } catch (error: any) {
      console.error("Erro geral:", error);
      toast.error(`Erro: ${error?.message || "Erro desconhecido"}`);
    }
  };

  const handleDeleteGalleryImage = async (galleryId: string, imageUrl: string) => {
    try {
      // Extrair o caminho do arquivo da URL
      const urlParts = imageUrl.split('/gallery/');
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        
        // Deletar do storage
        await supabase.storage
          .from('gallery')
          .remove([filePath]);
      }

      // Deletar do banco
      const { error } = await supabase
        .from('gallery')
        .delete()
        .eq('id', galleryId);

      if (error) throw error;

      toast.success("Foto removida da galeria");
      refetchGallery();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast.error("Erro ao remover foto");
    }
  };

  const handleThemeChange = async (themeColor: string) => {
    if (!barbershop) return;
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({ primary_color: themeColor })
        .eq('id', barbershop.id);

      if (error) throw error;

      toast.success("Tema atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
      
      // Recarregar página para aplicar novo tema
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Erro ao atualizar tema:", error);
      toast.error("Erro ao atualizar tema");
    }
  };

  const handleBusinessInfoUpdate = async () => {
    if (!barbershop) return;
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          instagram,
          whatsapp,
          address,
          opening_time: openingTime,
          closing_time: closingTime,
          opening_days: selectedDays,
          mensagem_personalizada: mensagemPersonalizada
        })
        .eq('id', barbershop.id);

      if (error) throw error;

      if (error) throw error;

      toast.success("Informações atualizadas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["barbershop"] });
    } catch (error) {
      console.error("Erro ao atualizar informações:", error);
      toast.error("Erro ao atualizar informações");
    }
  };

  // Note: notification_settings table doesn't exist - this function is a placeholder
  const handleNotificationSettingsUpdate = async () => {
    toast.info("Configurações de notificação serão implementadas em breve");
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const todayBookings = bookings?.filter(
    b => b.booking_date === format(new Date(), "yyyy-MM-dd")
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerencie sua barbearia</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 h-auto p-2 md:grid md:grid-cols-6 lg:grid-cols-12">
            <TabsTrigger value="dashboard" className="flex-shrink-0 px-3 py-2" title="Dashboard">
              <BarChart3 className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex-shrink-0 px-3 py-2" title="Financeiro">
              <Wallet className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="bookings" className="flex-shrink-0 px-3 py-2" title="Agendamentos">
              <Calendar className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Agendamentos</span>
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex-shrink-0 px-3 py-2" title="Clientes">
              <User className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex-shrink-0 px-3 py-2" title="Usuários">
              <UserCog className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="professionals" className="flex-shrink-0 px-3 py-2" title="Profissionais">
              <Users className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Profissionais</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex-shrink-0 px-3 py-2" title="Serviços">
              <Scissors className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Serviços</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex-shrink-0 px-3 py-2" title="Galeria">
              <ImageIcon className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Galeria</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex-shrink-0 px-3 py-2" title="Assinaturas">
              <Crown className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Assinaturas</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-shrink-0 px-3 py-2" title="Notificações">
              <Bell className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Notificações</span>
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="codes" className="flex-shrink-0 px-3 py-2" title="Códigos">
                <Key className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Códigos</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="tutorials" className="flex-shrink-0 px-3 py-2" title="Tutoriais">
              <Video className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Tutoriais</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-shrink-0 px-3 py-2" title="Configurações">
              <Settings className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">Configurações</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
              <p className="text-muted-foreground">Visão geral do desempenho da barbearia</p>
            </div>
            
            {bookings && <DashboardMetrics bookings={bookings} />}
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financial" className="space-y-6">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="commissions" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Comissões
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                {bookings && professionals && services && (
                  <FinancialDashboard 
                    bookings={bookings} 
                    professionals={professionals} 
                    services={services} 
                  />
                )}
              </TabsContent>
              
              <TabsContent value="commissions">
                {barbershop && bookings && professionals && (
                  <CommissionDashboard 
                    barbershopId={barbershop.id}
                    bookings={bookings} 
                    professionals={professionals} 
                  />
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Agendamentos */}
          <TabsContent value="bookings" className="space-y-6">
            {/* Formulário de novo agendamento */}
            {barbershop && (
              <AdminBookingForm 
                barbershopId={barbershop.id} 
                onSuccess={() => refetchBookings()} 
              />
            )}
            
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Agendamentos de Hoje</CardTitle>
                <CardDescription>
                  {todayBookings?.length || 0} agendamentos para hoje
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayBookings && todayBookings.length > 0 ? (
                  <div className="space-y-4">
                    {todayBookings.map((booking) => (
                      <Card key={booking.id} className="border-border bg-card/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-lg">{(booking as any).client?.name || "Cliente"}</p>
                              <div className="flex items-center gap-1">
                                <p className="text-sm text-muted-foreground">{(booking as any).client?.phone}</p>
                                <WhatsAppButton phone={(booking as any).client?.phone} clientName={(booking as any).client?.name} />
                              </div>
                            </div>
                            <Badge className={getStatusColor(booking.status)}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <p><span className="text-muted-foreground">Serviço:</span> {booking.service?.name}</p>
                            <p><span className="text-muted-foreground">Profissional:</span> {booking.professional?.name}</p>
                            <p><span className="text-muted-foreground">Horário:</span> {booking.booking_time}</p>
                            <p><span className="text-muted-foreground">Valor:</span> R$ {booking.total_price}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, "confirmed")}
                              disabled={booking.status === "confirmed"}
                            >
                              Confirmar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateBookingStatus(booking.id, "completed")}
                              disabled={booking.status === "completed"}
                            >
                              Concluir
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => updateBookingStatus(booking.id, "cancelled")}
                              disabled={booking.status === "cancelled"}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum agendamento para hoje
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Todos os Agendamentos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bookings?.map((booking) => (
                    <div key={booking.id} className="flex justify-between items-center p-3 bg-card/30 rounded-lg border border-border">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <p className="font-semibold">{(booking as any).client?.name || "Cliente"}</p>
                          <WhatsAppButton phone={(booking as any).client?.phone} clientName={(booking as any).client?.name} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(booking.booking_date), "dd/MM/yyyy", { locale: ptBR })} às {booking.booking_time}
                        </p>
                      </div>
                      <Badge className={getStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clientes */}
          <TabsContent value="clients" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Gestão de Clientes</CardTitle>
                <CardDescription>
                  Total: {clients?.length || 0} clientes | Inativos (30+ dias): {getInactiveClients(30).length}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clients && clients.length > 0 ? (
                    clients.map((client) => (
                      <Card key={client.id} className="border-border bg-card/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div>
                                  <p className="font-semibold text-lg">{(client as any).profile?.name || "Cliente"}</p>
                                  <div className="flex items-center gap-1">
                                    <p className="text-sm text-muted-foreground">{(client as any).profile?.phone}</p>
                                    <WhatsAppButton phone={(client as any).profile?.phone} clientName={(client as any).profile?.name} />
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                                <p><span className="text-muted-foreground">Cadastrado em:</span> {client.created_at ? format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR }) : "N/A"}</p>
                              </div>
                              {client.notes && (
                                <p className="text-sm mt-2 text-muted-foreground italic">{client.notes}</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum cliente registrado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="users" className="space-y-6">
            {barbershop && <UserManagement barbershopId={barbershop.id} />}
          </TabsContent>

          {/* Códigos de Acesso - Apenas Super Admin */}
          {isSuperAdmin && (
            <TabsContent value="codes" className="space-y-6">
              <RegistrationCodeManager />
            </TabsContent>
          )}

          {/* Profissionais */}
          <TabsContent value="professionals" className="space-y-6">
            {/* Formulário de Convite para Barbeiros */}
            {barbershop && (
              <BarberInviteForm 
                barbershopId={barbershop.id} 
                onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-professionals"] })} 
              />
            )}
            
            {/* Formulário de Cadastro */}
            <ProfessionalForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-professionals"] })} />

            {/* Lista de Profissionais */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Profissionais Cadastrados</CardTitle>
                <CardDescription>
                  Total: {professionals?.length || 0} profissionais
                </CardDescription>
              </CardHeader>
              <CardContent>
               <div className="grid gap-4">
                   {professionals?.map((professional) => (
                     <ProfessionalCard
                       key={professional.id}
                       professional={professional}
                       onUpdate={() => queryClient.invalidateQueries({ queryKey: ["admin-professionals"] })}
                     />
                   ))}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Serviços */}
          <TabsContent value="services" className="space-y-6">
            {/* Formulário de Cadastro */}
            <ServiceForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-services"] })} />

            {/* Lista de Serviços */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Serviços Disponíveis</CardTitle>
                <CardDescription>
                  Total: {services?.length || 0} serviços
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="grid gap-4">
                   {services?.map((service) => (
                     <ServiceCard
                       key={service.id}
                       service={service}
                       onUpdate={() => queryClient.invalidateQueries({ queryKey: ["admin-services"] })}
                     />
                   ))}
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configurações */}
          <TabsContent value="settings" className="space-y-6">
            {/* Link Compartilhável */}
            <ShareableLink
              barbershopId={barbershop.id}
              currentSlug={barbershop.slug || ""}
              barbershopName={barbershop.name}
            />

            {/* Tema */}
            <ThemeSelector 
              currentTheme={barbershop?.primary_color || "#D4AF37"}
              onThemeChange={handleThemeChange}
            />

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Logo da Barbearia</CardTitle>
                <CardDescription>
                  Personalize a logo que aparece no cabeçalho do app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageUpload
                  label=""
                  currentImageUrl={barbershop?.logo_url}
                  onImageSelect={handleLogoUpload}
                  maxSizeMB={5}
                  maxWidth={512}
                  maxHeight={512}
                  aspectRatio="square"
                />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Nome da Barbearia</CardTitle>
                <CardDescription>
                  Altere o nome que aparece no app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barbershop-name">Nome</Label>
                  <Input
                    id="barbershop-name"
                    value={barbershopName}
                    onChange={(e) => setBarbershopName(e.target.value)}
                    placeholder="Nome da Barbearia"
                  />
                </div>
                <Button onClick={handleNameUpdate} variant="imperial">
                  Salvar Nome
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
                <CardDescription>
                  Configure redes sociais e horários de funcionamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* WhatsApp */}
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp (com código do país)</Label>
                  <Input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+5511999999999"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: +5511999999999 (incluir + e código do país)
                  </p>
                </div>

                {/* Instagram */}
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@suabarbearia"
                  />
                </div>

                {/* TikTok */}
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok (opcional)</Label>
                  <Input
                    id="tiktok"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@suabarbearia"
                  />
                </div>

                {/* Endereço */}
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua Exemplo, 123 - Bairro, Cidade - UF"
                  />
                  <p className="text-xs text-muted-foreground">
                    Endereço completo da barbearia para facilitar a localização dos clientes
                  </p>
                </div>

                {/* Horários */}
                <div className="space-y-4">
                  <Label>Horário de Funcionamento</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="opening-time">Abertura</Label>
                      <Input
                        id="opening-time"
                        type="time"
                        value={openingTime}
                        onChange={(e) => setOpeningTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="closing-time">Fechamento</Label>
                      <Input
                        id="closing-time"
                        type="time"
                        value={closingTime}
                        onChange={(e) => setClosingTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Dias de Funcionamento */}
                <div className="space-y-3">
                  <Label>Dias de Funcionamento</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {weekDays.map((day) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={day}
                          checked={selectedDays.includes(day)}
                          onCheckedChange={() => toggleDay(day)}
                        />
                        <label
                          htmlFor={day}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {day}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button onClick={handleBusinessInfoUpdate} variant="imperial">
                  Salvar Informações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Galeria */}
          <TabsContent value="gallery" className="space-y-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Galeria / Portfólio</CardTitle>
                <CardDescription>
                  Adicione até 10 fotos dos seus trabalhos (estilo Instagram)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Nova Foto */}
                {(!gallery || gallery.length < 10) && (
                  <div className="border-2 border-dashed border-border rounded-lg p-6">
                    <ImageUpload
                      label="Adicionar Nova Foto"
                      onImageSelect={handleGalleryImageUpload}
                      maxSizeMB={5}
                      maxWidth={1200}
                      maxHeight={1200}
                      aspectRatio="square"
                    />
                  </div>
                )}

                {/* Grid de Fotos */}
                {gallery && gallery.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {gallery.map((item) => (
                      <div key={item.id} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-border bg-card">
                          <img
                            src={item.image_url}
                            alt={item.title || item.description || "Foto da galeria"}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteGalleryImage(item.id, item.image_url)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {(!gallery || gallery.length === 0) && (
                  <div className="text-center py-12 text-muted-foreground">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma foto na galeria ainda</p>
                    <p className="text-sm">Adicione fotos dos seus trabalhos para mostrar aos clientes</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assinaturas */}
          <TabsContent value="subscriptions" className="space-y-6">
            <SubscriptionPlanForm onSuccess={refetchPlans} />

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Planos Cadastrados</CardTitle>
                <CardDescription>
                  Total: {plans?.length || 0} planos | Assinaturas Ativas: {allSubscriptions?.filter(s => s.status === 'active').length || 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {plans && plans.length > 0 ? (
                    plans.map((plan) => (
                      <Card key={plan.id} className="border-border bg-card/30">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <Crown className="w-5 h-5 text-primary" />
                                <p className="font-semibold text-lg">{plan.name}</p>
                                <Badge variant={plan.is_active ? "default" : "secondary"}>
                                  {plan.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <p><span className="text-muted-foreground">Preço:</span> R$ {plan.price}</p>
                                <p><span className="text-muted-foreground">Duração:</span> {plan.duration_days} dias</p>
                                <p><span className="text-muted-foreground">Serviços:</span> {plan.services_included?.length || 0}</p>
                                <p><span className="text-muted-foreground">Status:</span> {plan.is_active ? "Ativo" : "Inativo"}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum plano cadastrado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Assinaturas dos Clientes</CardTitle>
                <CardDescription>
                  Gerencie todas as assinaturas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allSubscriptions && allSubscriptions.length > 0 ? (
                    allSubscriptions.map((subscription) => (
                      <div 
                        key={subscription.id}
                        className="flex justify-between items-center p-4 bg-card/30 rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{subscription.client?.full_name || "Cliente"}</p>
                          <p className="text-sm text-muted-foreground">
                            {subscription.plan?.name} - {format(new Date(subscription.start_date), "dd/MM/yyyy")} até {format(new Date(subscription.end_date), "dd/MM/yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            subscription.status === 'active' ? 'default' :
                            subscription.status === 'expired' ? 'secondary' : 'destructive'
                          }>
                            {subscription.status === 'active' ? 'Ativo' :
                             subscription.status === 'expired' ? 'Expirado' : 'Cancelado'}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            R$ {subscription.plan?.price}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma assinatura ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notificações */}
          <TabsContent value="notifications" className="space-y-6">
            {/* Status de Assinaturas Expirando */}
            <Card className="border-border bg-amber-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Notificações de Assinatura
                </CardTitle>
                <CardDescription>
                  Enviar alertas para clientes com assinaturas próximas do vencimento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                  <div>
                    <p className="font-semibold">Verificar Assinaturas Expirando</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar notificações para clientes com assinaturas expirando nos próximos 7 dias
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        toast.info("Verificando assinaturas...");
                        const { data, error } = await supabase.functions.invoke("check-expiring-subscriptions");
                        
                        if (error) throw error;
                        
                        toast.success(
                          `${data.notifications?.length || 0} notificação(ões) enviada(s)!`,
                          { duration: 5000 }
                        );
                      } catch (error: any) {
                        console.error("Erro ao verificar assinaturas:", error);
                        toast.error("Erro ao verificar assinaturas");
                      }
                    }}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Verificar Agora
                  </Button>
                </div>
                
                {allSubscriptions && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-green-500/50 bg-green-500/10">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                        <p className="text-2xl font-bold text-green-500">
                          {allSubscriptions.filter(s => s.status === 'active').length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-500/50 bg-amber-500/10">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Expirando em 7 dias</p>
                        <p className="text-2xl font-bold text-amber-500">
                          {allSubscriptions.filter(s => {
                          const endDate = new Date(s.end_date);
                            const today = new Date();
                            const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            return s.status === 'active' && daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
                          }).length}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-red-500/50 bg-red-500/10">
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Expiradas</p>
                        <p className="text-2xl font-bold text-red-500">
                          {allSubscriptions.filter(s => s.status === 'expired').length}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Configurações de Notificações de Agendamento</CardTitle>
                <CardDescription>
                  Configure mensagens automáticas para clientes após agendamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle de Notificações */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notifications-enabled">Ativar Notificações</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviar emails automaticamente aos clientes
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    id="notifications-enabled"
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>

                {/* Toggle de IA */}
                <div className="p-4 border border-purple-500/30 rounded-lg bg-purple-500/5">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label htmlFor="ai-enabled" className="flex items-center gap-2">
                        <span className="text-lg">🤖</span>
                        Usar IA para Gerar Mensagens
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Mensagens únicas e personalizadas geradas automaticamente para cada agendamento
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="ai-enabled"
                      checked={aiEnabled}
                      onChange={(e) => setAiEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  
                  {aiEnabled && (
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="mensagem-personalizada">Estilo de Comunicação da Barbearia</Label>
                      <Input
                        id="mensagem-personalizada"
                        value={mensagemPersonalizada}
                        onChange={(e) => setMensagemPersonalizada(e.target.value)}
                        placeholder="Ex: Profissional e elegante, Descontraído e jovem, Moderno e tecnológico"
                      />
                      <p className="text-xs text-muted-foreground">
                        Descreva o tom/estilo que você deseja para as mensagens (ex: "Profissional e acolhedor", "Descontraído e moderno")
                      </p>
                    </div>
                  )}
                </div>

                {/* Email do Admin */}
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Seu Email (para receber cópias)</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@barbearia.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você receberá um email sempre que houver um novo agendamento
                  </p>
                </div>

                {/* WhatsApp do Admin */}
                <div className="space-y-2">
                  <Label htmlFor="admin-whatsapp">Seu WhatsApp (DDD + número)</Label>
                  <Input
                    id="admin-whatsapp"
                    value={adminWhatsapp}
                    onChange={(e) => setAdminWhatsapp(e.target.value)}
                    placeholder="11980757862"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemplo: 11980757862 (o +55 será adicionado automaticamente)
                  </p>
                </div>

                {/* Tempo de Antecedência para Lembretes */}
                <div className="space-y-2">
                  <Label htmlFor="reminder-minutes">⏰ Enviar Lembrete com Antecedência</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="reminder-minutes"
                      type="number"
                      min="5"
                      max="1440"
                      value={reminderMinutes}
                      onChange={(e) => setReminderMinutes(parseInt(e.target.value) || 30)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos antes do agendamento</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O cliente receberá um lembrete {reminderMinutes} minutos antes do horário agendado.
                    Recomendado: 30 minutos (padrão) ou 10 minutos para lembretes mais próximos.
                  </p>
                </div>

                {/* Mensagem Personalizada */}
                <div className="space-y-2">
                  <Label htmlFor="custom-message">Mensagem Personalizada</Label>
                  <textarea
                    id="custom-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Olá {nome}! Seu agendamento foi confirmado para {data} às {hora}..."
                    rows={5}
                    className="w-full p-3 border border-border rounded-md bg-background"
                  />
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>Variáveis disponíveis:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><code>{"{nome}"}</code> - Nome do cliente</li>
                      <li><code>{"{data}"}</code> - Data do agendamento</li>
                      <li><code>{"{hora}"}</code> - Horário do agendamento</li>
                      <li><code>{"{servico}"}</code> - Nome do serviço</li>
                      <li><code>{"{profissional}"}</code> - Nome do profissional</li>
                    </ul>
                  </div>
                </div>

                {/* Opções de Envio */}
                <div className="space-y-3">
                  <Label>Opções de Envio</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="send-to-client"
                      checked={sendToClient}
                      onChange={(e) => setSendToClient(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="send-to-client" className="text-sm">
                      Enviar email para o cliente
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="send-sms"
                      checked={sendSms}
                      onChange={(e) => setSendSms(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="send-sms" className="text-sm">
                      📱 Enviar SMS para o cliente
                    </label>
                  </div>
                  
                  {sendSms && (
                    <div className="ml-6 p-4 border border-green-500/20 rounded-md bg-green-500/5">
                      <p className="text-sm text-muted-foreground">
                        ✅ SMS está configurado centralmente pela plataforma. As mensagens serão enviadas automaticamente via MessageBird quando você marcar esta opção.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="send-whatsapp"
                      checked={sendWhatsapp}
                      onChange={(e) => setSendWhatsapp(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="send-whatsapp" className="text-sm">
                      💬 Gerar link de WhatsApp para confirmação
                    </label>
                  </div>
                  
                  {sendWhatsapp && (
                    <div className="ml-6 p-4 border border-green-500/20 rounded-md bg-green-500/5">
                      <p className="text-sm text-muted-foreground">
                        ✅ Os clientes receberão um link direto para confirmar via WhatsApp com a barbearia. Configure seu WhatsApp nas Configurações da Barbearia.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="push-enabled"
                      checked={pushEnabled}
                      onChange={(e) => setPushEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <label htmlFor="push-enabled" className="text-sm">
                      Habilitar Push Notifications no navegador
                    </label>
                  </div>
                  
                  {pushEnabled && (
                    <div className="ml-6 p-4 border border-border rounded-md bg-blue-500/10">
                      <p className="text-sm text-muted-foreground">
                        ℹ️ Push Notifications funcionam apenas em navegadores modernos. 
                        Os clientes precisarão permitir notificações quando solicitado.
                      </p>
                    </div>
                  )}
                </div>

                <Button onClick={handleNotificationSettingsUpdate} variant="imperial">
                  Salvar Configurações
                </Button>

                {/* Preview */}
                {customMessage && (
                  <div className="mt-6 p-4 border border-border rounded-md bg-muted/30">
                    <h4 className="font-semibold mb-2">Preview da mensagem:</h4>
                    <p className="text-sm whitespace-pre-wrap">
                      {customMessage
                        .replace("{nome}", "João Silva")
                        .replace("{data}", "25/11/2024")
                        .replace("{hora}", "14:00")
                        .replace("{servico}", "Corte + Barba")
                        .replace("{profissional}", "Carlos")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tutoriais em Vídeo */}
          <TabsContent value="tutorials" className="space-y-6">
            {barbershop && <VideoTutorialManager barbershopId={barbershop.id} />}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
