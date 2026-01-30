import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Clock, Scissors, User, Edit2, Save, X, Loader2, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionSummary } from "@/components/account/SubscriptionSummary";

const Account = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Recuperar slug de origem para navegação (localStorage para persistência, sessionStorage como fallback)
  const originSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get user role
  const { data: userRole } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, barbershop_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: bookings } = useQuery({
    queryKey: ["bookings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          service:services(name, duration_minutes),
          professional:professionals(name)
        `)
        .eq("client_id", user.id)
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Set form values when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Erro ao atualizar perfil");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setIsEditing(false);
  };

  const handleBack = () => {
    const savedSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");
    if (savedSlug) {
      navigate(`/b/${savedSlug}`);
    } else {
      // NUNCA ir para "/" - usar history.back() como fallback seguro
      navigate(-1);
    }
  };

  const handleBookingClick = () => {
    if (originSlug) {
      navigate(`/b/${originSlug}/booking`);
    } else {
      toast.info("Selecione uma barbearia para fazer um agendamento");
      navigate("/");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500/20 text-green-500 border-green-500/50";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/50";
      case "cancelled":
        return "bg-red-500/20 text-red-500 border-red-500/50";
      case "completed":
        return "bg-blue-500/20 text-blue-500 border-blue-500/50";
      default:
        return "";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "cancelled":
        return "Cancelado";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Administrador";
      case "barber":
        return "Barbeiro";
      case "client":
        return "Cliente";
      default:
        return role;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary/20 text-primary border-primary/30";
      case "barber":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "client":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Botão Voltar */}
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Minha Conta</h1>
            <p className="text-muted-foreground">Gerencie seus dados e agendamentos</p>
          </div>

          {/* Subscription Summary for barbershop admins */}
          {userRole?.role === 'admin' && userRole?.barbershop_id && (
            <SubscriptionSummary barbershopId={userRole.barbershop_id} />
          )}

          {/* Profile Card */}
          <Card className="border-border mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="text-primary" />
                  Informações Pessoais
                </CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                      <X className="w-4 h-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : isEditing ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome *</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={user.email || ""}
                      disabled
                      className="opacity-50"
                    />
                    <p className="text-xs text-muted-foreground">
                      O email não pode ser alterado
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="text-lg font-semibold">{profile?.full_name || "Não informado"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-lg">{user.email}</p>
                  </div>
                  {profile?.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground">Telefone</p>
                      <p className="text-lg">{profile.phone}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Função</p>
                    <div className="flex items-center gap-2 mt-1">
                      {userRole?.role === "admin" && <Shield className="w-4 h-4 text-primary" />}
                      <Badge className={getRoleBadgeColor(userRole?.role || "client")}>
                        {getRoleLabel(userRole?.role || "client")}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bookings */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-primary" />
                Meus Agendamentos
              </CardTitle>
              <CardDescription>
                Histórico de agendamentos e próximos horários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <Card key={booking.id} className="border-border bg-card/30">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getStatusColor(booking.status)}>
                                {getStatusText(booking.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-lg font-semibold">
                              <Scissors className="w-5 h-5 text-primary" />
                              {booking.service?.name || "Serviço"}
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="w-4 h-4" />
                              {booking.professional?.name || "Profissional"}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-primary" />
                                {format(new Date(booking.booking_date), "dd/MM/yyyy", { locale: ptBR })}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-primary" />
                                {booking.booking_time}
                              </div>
                            </div>
                            {booking.notes && (
                              <p className="text-sm text-muted-foreground italic">
                                "{booking.notes}"
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">
                              R$ {(booking.total_price || 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Você ainda não tem agendamentos
                  </p>
                  <Button variant="premium" onClick={handleBookingClick}>
                    Fazer Primeiro Agendamento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;