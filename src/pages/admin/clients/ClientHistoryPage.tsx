import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  DollarSign,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export function ClientHistoryPage() {
  const { clientId } = useParams();
  const { barbershop } = useBarbershopContext();

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["admin-client-detail", clientId],
    queryFn: async () => {
      if (!clientId) return null;
      const { data, error } = await supabase
        .from("barbershop_clients")
        .select("id, client_id, created_at, phone, email, notes")
        .eq("id", clientId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) return null;
      
      // Get profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("id", data.client_id)
        .maybeSingle();
      
      return {
        ...data,
        profile: profileData,
      };
    },
    enabled: !!clientId,
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico do Cliente"
        subtitle="Detalhes e histórico de atendimentos"
      />

      {/* Client Info Card */}
      <Card className="card-elevated">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={client.profile?.avatar_url || undefined} />
              <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                {client.profile?.full_name?.charAt(0)?.toUpperCase() || "C"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-bold">
                {client.profile?.full_name || "Cliente sem nome"}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {client.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {client.email}
                  </div>
                )}
                {(client.phone || client.profile?.phone) && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {client.phone || client.profile?.phone}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Cliente desde {format(parseISO(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-primary">{completedBookings.length}</p>
                <p className="text-xs text-muted-foreground">Atendimentos</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-green-500">
                  R$ {totalSpent.toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground">Total gasto</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-destructive">{cancelledBookings.length}</p>
                <p className="text-xs text-muted-foreground">Cancelamentos</p>
              </div>
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

export default ClientHistoryPage;
