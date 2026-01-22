import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  getDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarDays, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Clock
} from "lucide-react";

import { PageHeader } from "@/components/admin/shared/PageHeader";
import { NewAppointmentModal } from "@/components/admin/appointments/NewAppointmentModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { supabase } from "@/integrations/supabase/client";

interface Booking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  client: {
    name: string | null;
  } | null;
  service: {
    name: string;
  } | null;
  professional: {
    name: string;
  } | null;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-green-500",
  pending: "bg-yellow-500",
  cancelled: "bg-destructive",
  completed: "bg-muted-foreground",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

export function CalendarPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch bookings for the month
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["calendar-bookings", barbershop?.id, format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      
      // Get bookings without the profile join
      const { data: bookingsData, error } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          status,
          client_id,
          service:services (name),
          professional:professionals (name)
        `)
        .eq("barbershop_id", barbershop.id)
        .gte("booking_date", monthStart)
        .lte("booking_date", monthEnd)
        .order("booking_time", { ascending: true });
      
      if (error) throw error;
      
      // Get client names for each booking
      const bookingsWithClients = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          let clientName = null;
          if (booking.client_id) {
            const { data: profileData } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", booking.client_id)
              .maybeSingle();
            clientName = profileData?.full_name || null;
          }
          return {
            ...booking,
            client: { name: clientName },
          };
        })
      );
      
      return bookingsWithClients as unknown as Booking[];
    },
    enabled: !!barbershop?.id,
  });

  // Group bookings by date
  const bookingsByDate = useMemo(() => {
    const grouped: Record<string, Booking[]> = {};
    bookings?.forEach((booking) => {
      if (!grouped[booking.booking_date]) {
        grouped[booking.booking_date] = [];
      }
      grouped[booking.booking_date].push(booking);
    });
    return grouped;
  }, [bookings]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get bookings for selected date
  const selectedDateBookings = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    return bookingsByDate[dateStr] || [];
  }, [selectedDate, bookingsByDate]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendario"
        subtitle="Visualizacao em calendario de todos os agendamentos"
        actions={
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Agendamento
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold capitalize">
                  {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                </h2>
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Hoje
                </Button>
              </div>
              <Button variant="outline" size="icon" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {isLoading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const dayBookings = bookingsByDate[dateStr] || [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  
                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "aspect-square p-1 rounded-lg border transition-colors relative",
                        isCurrentMonth 
                          ? "bg-background hover:bg-accent" 
                          : "bg-muted/30 text-muted-foreground",
                        isSelected && "ring-2 ring-primary",
                        isTodayDate && "border-primary"
                      )}
                    >
                      <span className={cn(
                        "text-sm font-medium",
                        isTodayDate && "text-primary"
                      )}>
                        {format(day, "d")}
                      </span>
                      {dayBookings.length > 0 && (
                        <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                          {dayBookings.slice(0, 3).map((booking) => (
                            <div
                              key={booking.id}
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                STATUS_COLORS[booking.status] || "bg-muted"
                              )}
                            />
                          ))}
                          {dayBookings.length > 3 && (
                            <span className="text-[8px] text-muted-foreground">
                              +{dayBookings.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-4">
              {selectedDate 
                ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
                : "Selecione uma data"
              }
            </h3>
            
            {selectedDate ? (
              <ScrollArea className="h-[400px]">
                {selectedDateBookings.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.booking_time.substring(0, 5)}
                          </span>
                          <div className={cn(
                            "w-2 h-2 rounded-full ml-auto",
                            STATUS_COLORS[booking.status]
                          )} />
                        </div>
                        <p className="text-sm font-medium">
                          {booking.client?.name || "Cliente"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {booking.service?.name || "Serviço"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          com {booking.professional?.name || "Profissional"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum agendamento</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setIsModalOpen(true)}
                    >
                      Criar agendamento
                    </Button>
                  </div>
                )}
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Clique em uma data para ver os agendamentos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Appointment Modal */}
      {barbershop?.id && (
        <NewAppointmentModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          barbershopId={barbershop.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] });
          }}
        />
      )}
    </div>
  );
}

export default CalendarPage;
