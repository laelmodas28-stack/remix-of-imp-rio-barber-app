import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Plus, 
  Filter, 
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Scissors,
  Loader2,
  AlertCircle
} from "lucide-react";

import { PageHeader } from "@/components/admin/shared/PageHeader";
import { DataTable, Column } from "@/components/admin/shared/DataTable";
import { NewAppointmentModal } from "@/components/admin/appointments/NewAppointmentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { sendNotificationForBooking } from "@/lib/notifications/bookingNotifications";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  total_price: number | null;
  notes: string | null;
  created_at: string;
  professional_id: string;
  client: {
    name: string | null;
    phone: string | null;
  } | null;
  service: {
    name: string;
    duration_minutes: number;
  } | null;
  professional: {
    name: string;
    photo_url: string | null;
  } | null;
}

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmado",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600",
  },
  pending: {
    label: "Pendente",
    variant: "secondary" as const,
    icon: Clock,
    color: "text-yellow-600",
  },
  cancelled: {
    label: "Cancelado",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-destructive",
  },
  completed: {
    label: "Concluido",
    variant: "outline" as const,
    icon: CheckCircle2,
    color: "text-muted-foreground",
  },
};

export function AppointmentsPage() {
  const { barbershop } = useBarbershopContext();
  const { user } = useAuth();
  const { isAdmin, isBarber } = useUserRole(barbershop?.id);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // For barbers, get their linked professional ID
  const { data: linkedProfessional } = useQuery({
    queryKey: ["linked-professional", user?.id, barbershop?.id],
    queryFn: async () => {
      if (!user?.id || !barbershop?.id) return null;
      
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("barbershop_id", barbershop.id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !!barbershop?.id && isBarber,
  });

  // Fetch all professionals for the filter (admin only)
  const { data: professionals = [] } = useQuery({
    queryKey: ["barbershop-professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, photo_url")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershop?.id && isAdmin,
  });

  // Fetch bookings - filtered by professional for barbers
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-bookings", barbershop?.id, statusFilter, dateFilter, professionalFilter, linkedProfessional?.id, isAdmin],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      let query = supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          total_price,
          notes,
          created_at,
          client_id,
          professional_id,
          service:services (
            name,
            duration_minutes
          ),
          professional:professionals (
            name,
            photo_url
          )
        `)
        .eq("barbershop_id", barbershop.id)
        .order("booking_date", { ascending: false })
        .order("booking_time", { ascending: false });
      
      // CRITICAL: For barbers, only show their own appointments
      if (isBarber && !isAdmin && linkedProfessional?.id) {
        query = query.eq("professional_id", linkedProfessional.id);
      } else if (isAdmin && professionalFilter !== "all") {
        // Apply professional filter for admins
        query = query.eq("professional_id", professionalFilter);
      }
      
      // Apply status filter
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      
      // Apply date filter
      const today = format(new Date(), "yyyy-MM-dd");
      if (dateFilter === "today") {
        query = query.eq("booking_date", today);
      } else if (dateFilter === "upcoming") {
        query = query.gte("booking_date", today);
      } else if (dateFilter === "past") {
        query = query.lt("booking_date", today);
      }
      
      const { data: bookingsData, error } = await query.limit(100);
      if (error) throw error;
      
      // Get client names for each booking
      const bookingsWithClients = await Promise.all(
        (bookingsData || []).map(async (booking: any) => {
          let client = null;
          if (booking.client_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("id", booking.client_id)
              .maybeSingle();
            client = profileData ? { name: profileData.full_name, phone: profileData.phone } : null;
          }
          return {
            ...booking,
            client,
          };
        })
      );
      
      return bookingsWithClients as unknown as Booking[];
    },
    enabled: !!barbershop?.id && (isAdmin || (isBarber && linkedProfessional?.id !== undefined)),
  });

  // Update booking status
  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);
      
      if (error) throw error;
      
      toast.success(`Status atualizado para ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}`);
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });

      // Send cancellation notification via webhooks
      if (newStatus === "cancelled") {
        const result = await sendNotificationForBooking(bookingId, "cancellation");
        if (result.success) {
          toast.success("Notificação de cancelamento enviada");
        } else if (result.errors.length > 0) {
          console.error("Notification errors:", result.errors);
        }
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    } finally {
      setUpdatingId(null);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  // Define table columns - hide professional column for barbers
  const columns: Column<Booking>[] = useMemo(() => {
    const baseColumns: Column<Booking>[] = [
      {
        key: "booking_date",
        header: "Data/Hora",
        sortable: true,
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-medium">{formatDate(row.booking_date)}</span>
            <span className="text-sm text-muted-foreground">{row.booking_time.substring(0, 5)}</span>
          </div>
        ),
      },
      {
        key: "client",
        header: "Cliente",
        cell: (row) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(row.client?.name || "C")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-medium">{row.client?.name || "Cliente"}</span>
              {row.client?.phone && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {row.client.phone}
                </span>
              )}
            </div>
          </div>
        ),
      },
      {
        key: "service",
        header: "Serviço",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span>{row.service?.name || "—"}</span>
              {row.service?.duration_minutes && (
                <span className="text-xs text-muted-foreground">
                  {row.service.duration_minutes} min
                </span>
              )}
            </div>
          </div>
        ),
      },
    ];

    // Only show professional column for admins
    if (isAdmin) {
      baseColumns.push({
        key: "professional",
        header: "Profissional",
        cell: (row) => (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={row.professional?.photo_url || undefined} />
              <AvatarFallback className="text-xs">
                {(row.professional?.name || "P")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span>{row.professional?.name || "—"}</span>
          </div>
        ),
      });
    }

    baseColumns.push(
      {
        key: "total_price",
        header: "Valor",
        sortable: true,
        cell: (row) => (
          <span className="font-medium">
            R$ {(row.total_price || 0).toFixed(2)}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => {
          const config = STATUS_CONFIG[row.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
          const Icon = config.icon;
          return (
            <Badge variant={config.variant} className="gap-1">
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          );
        },
      },
      {
        key: "actions",
        header: "",
        cell: (row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {updatingId === row.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {row.status !== "confirmed" && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, "confirmed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                  Confirmar
                </DropdownMenuItem>
              )}
              {row.status !== "completed" && row.status !== "cancelled" && (
                <DropdownMenuItem onClick={() => handleUpdateStatus(row.id, "completed")}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Concluido
                </DropdownMenuItem>
              )}
              {row.status !== "cancelled" && (
                <DropdownMenuItem 
                  onClick={() => handleUpdateStatus(row.id, "cancelled")}
                  className="text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancelar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      }
    );

    return baseColumns;
  }, [updatingId, isAdmin]);

  // Show warning if barber has no linked professional
  if (isBarber && !isAdmin && !linkedProfessional && !isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Meus Agendamentos"
          subtitle="Visualize seus agendamentos"
        />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sua conta não está vinculada a um profissional. Entre em contato com o administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const pageTitle = isBarber && !isAdmin ? "Meus Agendamentos" : "Agendamentos";
  const pageSubtitle = isBarber && !isAdmin 
    ? `Agendamentos de ${linkedProfessional?.name || "você"}`
    : "Gerencie todos os agendamentos da barbearia";

  return (
    <div className="space-y-6">
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          isAdmin ? (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Agendamento
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Tabs value={dateFilter} onValueChange={setDateFilter} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="today">Hoje</TabsTrigger>
            <TabsTrigger value="upcoming">Futuros</TabsTrigger>
            <TabsTrigger value="past">Passados</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="completed">Concluidos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>

        {/* Professional Filter - Admin only */}
        {isAdmin && professionals.length > 0 && (
          <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <Scissors className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Profissional" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os profissionais</SelectItem>
              {professionals.map((prof) => (
                <SelectItem key={prof.id} value={prof.id}>
                  {prof.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        data={bookings || []}
        columns={columns}
        isLoading={isLoading}
        searchable
        searchKeys={["client.name", "service.name", "professional.name"]}
        pageSize={15}
        emptyState={{
          icon: Calendar,
          title: "Nenhum agendamento encontrado",
          description: statusFilter !== "all" || dateFilter !== "all"
            ? "Tente ajustar os filtros para ver mais resultados"
            : isAdmin 
              ? "Clique em 'Novo Agendamento' para criar o primeiro"
              : "Você ainda não possui agendamentos",
          action: isAdmin ? {
            label: "Novo Agendamento",
            onClick: () => setIsModalOpen(true),
          } : undefined,
        }}
      />

      {/* New Appointment Modal - Admin only */}
      {barbershop?.id && isAdmin && (
        <NewAppointmentModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          barbershopId={barbershop.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
          }}
        />
      )}
    </div>
  );
}

export default AppointmentsPage;
