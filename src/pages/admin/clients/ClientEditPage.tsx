import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  DollarSign,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface ClientData {
  id: string;
  client_id: string;
  created_at: string;
  notes: string | null;
  phone: string | null;
  email: string | null;
}

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number | null;
  service: {
    name: string;
  } | null;
  professional: {
    name: string;
  } | null;
}

export function ClientEditPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { barbershop, baseUrl } = useBarbershopContext();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["admin-client-detail", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      
      // Get barbershop_client record
      const { data: clientData, error: clientError } = await supabase
        .from("barbershop_clients")
        .select("id, client_id, created_at, notes, phone, email")
        .eq("id", clientId)
        .maybeSingle();
      
      if (clientError) throw clientError;
      if (!clientData) return null;

      // Get profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", clientData.client_id)
        .maybeSingle();

      return {
        ...clientData,
        profile: profileData,
      };
    },
    enabled: !!clientId,
  });

  // Populate form when client loads
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.profile?.full_name || "",
        email: client.email || "",
        phone: client.phone || client.profile?.phone || "",
        notes: client.notes || "",
      });
    }
  }, [client]);

  const updateClientMutation = useMutation({
    mutationFn: async () => {
      if (!client) throw new Error("Cliente não encontrado");

      // Update barbershop_client record
      const { error: clientError } = await supabase
        .from("barbershop_clients")
        .update({
          notes: formData.notes.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
        })
        .eq("id", client.id);

      if (clientError) throw clientError;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-client-detail"] });
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
    onError: (error: any) => {
      console.error("Error updating client:", error);
      toast.error(error.message || "Erro ao atualizar cliente");
    },
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["admin-client-bookings", client?.client_id, barbershop?.id],
    queryFn: async () => {
      if (!client?.client_id || !barbershop?.id) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          total_price,
          service:services(name),
          professional:professionals(name)
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("client_id", client.client_id)
        .order("booking_date", { ascending: false });
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!client?.client_id && !!barbershop?.id,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-client-subscriptions", client?.client_id, barbershop?.id],
    queryFn: async () => {
      if (!client?.client_id || !barbershop?.id) return [];
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(`
          id,
          status,
          start_date,
          end_date,
          plan:subscription_plans(name, price)
        `)
        .eq("barbershop_id", barbershop.id)
        .eq("client_id", client.client_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!client?.client_id && !!barbershop?.id,
  });

  // Calculate stats
  const completedBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "confirmed"
  );
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");
  const totalSpent = completedBookings.reduce((acc, b) => acc + (b.total_price || 0), 0);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      confirmed: { variant: "default", label: "Confirmado" },
      completed: { variant: "outline", label: "Concluído" },
      cancelled: { variant: "destructive", label: "Cancelado" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loadingClient) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Cliente não encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(`${baseUrl}/admin/clients/list`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para lista
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Cliente"
        subtitle="Atualize os dados do cliente"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`${baseUrl}/admin/clients/list`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => updateClientMutation.mutate()} disabled={updateClientMutation.isPending}>
              {updateClientMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        }
      />

      {/* Client Info Card with Edit Form */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={client.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {formData.name?.charAt(0)?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>
            <span>{formData.name || "Cliente sem nome"}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                disabled
              />
              <p className="text-xs text-muted-foreground">O nome é gerenciado pelo perfil do usuário</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Anotações sobre o cliente..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-4 w-4" />
            Cliente desde {format(parseISO(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold text-primary">{completedBookings.length}</p>
              <p className="text-xs text-muted-foreground">Atendimentos</p>
            </div>
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold text-green-500">
                R$ {totalSpent.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Total gasto</p>
            </div>
            <div className="p-4 rounded-lg bg-muted text-center">
              <p className="text-2xl font-bold text-destructive">{cancelledBookings.length}</p>
              <p className="text-xs text-muted-foreground">Cancelamentos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="bookings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">Agendamentos</TabsTrigger>
          <TabsTrigger value="subscriptions">Assinaturas</TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum agendamento encontrado</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            {booking.status === "completed" || booking.status === "confirmed" ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : booking.status === "cancelled" ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {booking.service?.name || "Serviço"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(booking.booking_date), "dd/MM/yyyy", { locale: ptBR })} às {booking.booking_time.slice(0, 5)}
                              {booking.professional?.name && ` • ${booking.professional.name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold">
                            R$ {(booking.total_price || 0).toFixed(2)}
                          </span>
                          {getStatusBadge(booking.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="text-lg">Assinaturas</CardTitle>
            </CardHeader>
            <CardContent>
              {subscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhuma assinatura encontrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{sub.plan?.name || "Plano"}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(sub.start_date), "dd/MM/yyyy", { locale: ptBR })} - {format(parseISO(sub.end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">
                          R$ {(sub.plan?.price || 0).toFixed(2)}
                        </span>
                        <Badge variant={sub.status === "active" ? "default" : "secondary"}>
                          {sub.status === "active" ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ClientEditPage;
