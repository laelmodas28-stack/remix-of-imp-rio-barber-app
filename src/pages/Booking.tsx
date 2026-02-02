import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { WeeklyCalendar } from "@/components/booking/WeeklyCalendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Header from "@/components/Header";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, isToday, getHours, getMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { Loader2 } from "lucide-react";

const Booking = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { barbershop, isLoading: isBarbershopLoading } = useBarbershopContext();
  
  const [selectedService, setSelectedService] = useState(location.state?.selectedService?.id || "");
  const [selectedProfessional, setSelectedProfessional] = useState(location.state?.selectedProfessional?.id || "");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  const { data: services } = useQuery({
    queryKey: ["booking-services", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  const { data: professionals } = useQuery({
    queryKey: ["booking-professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id,
  });

  const { data: existingBookings } = useQuery({
    queryKey: ["existing-bookings", selectedProfessional, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          booking_time,
          service:services (
            duration_minutes
          )
        `)
        .eq("professional_id", selectedProfessional)
        .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
        .in("status", ["pending", "confirmed"]);
        
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfessional && !!selectedDate,
  });

  // Time blocks - table doesn't exist yet, using empty array
  const timeBlocks: { start_time: string; end_time: string }[] = [];

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Reset time when professional or date changes
  useEffect(() => {
    setSelectedTime("");
  }, [selectedProfessional, selectedDate]);

  // Helper function to convert time to minutes
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Get selected service data for duration
  const selectedServiceData = services?.find(s => s.id === selectedService);
  const serviceDuration = selectedServiceData?.duration_minutes || 30;

  // Early returns AFTER all hooks
  if (authLoading || isBarbershopLoading || !barbershop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Gerar slots de horário dinamicamente baseado nos horários do banco
  const generateTimeSlots = () => {
    const slots: string[] = [];
    const openTime = barbershop?.opening_time || "08:00";
    const closeTime = barbershop?.closing_time || "19:00";
    
    const [openHour] = openTime.split(':').map(Number);
    const [closeHour] = closeTime.split(':').map(Number);
    
    for (let hour = openHour; hour < closeHour; hour++) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
      slots.push(`${String(hour).padStart(2, '0')}:30`);
    }
    
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Filtrar horários passados, ocupados e bloqueados
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return timeSlots;
    
    let availableSlots = [...timeSlots];
    
    // Filtrar horários passados se for hoje
    if (isToday(selectedDate)) {
      const now = new Date();
      const currentHour = getHours(now);
      const currentMinute = getMinutes(now);
      
      availableSlots = availableSlots.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        if (slotHour > currentHour) return true;
        if (slotHour === currentHour && slotMinute > currentMinute) return true;
        return false;
      });
    }
    
    // Filtrar slots que conflitam com agendamentos existentes (considerando duração)
    if (existingBookings?.length) {
      availableSlots = availableSlots.filter(slot => {
        const slotStart = timeToMinutes(slot);
        const slotEnd = slotStart + serviceDuration;
        
        for (const booking of existingBookings) {
          const bookingStart = timeToMinutes(booking.booking_time.substring(0, 5));
          const bookingDuration = (booking.service as any)?.duration_minutes || 30;
          const bookingEnd = bookingStart + bookingDuration;
          
          // Conflito existe se: slotStart < bookingEnd AND slotEnd > bookingStart
          if (slotStart < bookingEnd && slotEnd > bookingStart) {
            return false;
          }
        }
        return true;
      });
    }
    
    // Filtrar slots que conflitam com bloqueios de tempo (almoço, pausas, etc.)
    if (timeBlocks?.length) {
      availableSlots = availableSlots.filter(slot => {
        const slotStart = timeToMinutes(slot);
        const slotEnd = slotStart + serviceDuration;
        
        for (const block of timeBlocks) {
          const blockStart = timeToMinutes(block.start_time.substring(0, 5));
          const blockEnd = timeToMinutes(block.end_time.substring(0, 5));
          
          // Conflito existe se slot sobrepõe com bloqueio
          if (slotStart < blockEnd && slotEnd > blockStart) {
            return false;
          }
        }
        return true;
      });
    }
    
    return availableSlots;
  };

  const availableTimeSlots = getAvailableTimeSlots();

  const handleBooking = async () => {
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !barbershop) {
      toast.error("Por favor, preencha todos os campos");
      return;
    }

    const service = services?.find(s => s.id === selectedService);
    const professional = professionals?.find(p => p.id === selectedProfessional);
    
    if (!service || !professional) return;

    setIsSubmitting(true);

    try {
      // First, ensure the user has a profile record (required for booking foreign key)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        // Create a profile for this user
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Cliente",
            email: user.email,
            phone: user.user_metadata?.phone || null,
          });

        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
          toast.error("Erro ao preparar cadastro. Tente novamente.");
          setIsSubmitting(false);
          return;
        }
      }

      const { data: booking, error } = await supabase.from("bookings").insert({
        client_id: user.id,
        service_id: selectedService,
        professional_id: selectedProfessional,
        barbershop_id: barbershop.id,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        booking_time: selectedTime,
        total_price: service.price,
        notes: notes,
        status: "pending"
      }).select().single();

      if (error) throw error;

      // Buscar dados do perfil do cliente
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      // Enviar notificação em background (não bloquear o usuário)
      supabase.functions.invoke("send-booking-notification", {
        body: {
          bookingId: booking?.id,
          barbershopId: barbershop.id,
          clientEmail: user.email,
          clientName: profile?.full_name || "Cliente",
          clientPhone: profile?.phone,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          service: service.name,
          professional: professional.name,
          price: service.price,
        },
      }).catch((notifError) => {
        console.error("Erro ao enviar notificação:", notifError);
      });

      toast.success("Agendamento realizado com sucesso!");
      navigate("/account");
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Agende seu Horário</h1>
            <p className="text-muted-foreground">Escolha o serviço, profissional, data e horário</p>
          </div>

          <div className="grid gap-6">
            {/* Serviço */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>1. Escolha o Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - R$ {service.price.toFixed(2)} ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Profissional */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>2. Escolha o Profissional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {professionals?.map((professional) => (
                    <Card 
                      key={professional.id}
                      className={`cursor-pointer transition-all border-2 ${
                        selectedProfessional === professional.id 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedProfessional(professional.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center overflow-hidden flex-shrink-0">
                            {professional.photo_url ? (
                              <img 
                                src={professional.photo_url} 
                                alt={professional.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl text-primary-foreground">
                                {professional.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">{professional.name}</p>
                            <p className="text-sm text-primary font-medium">⭐ {professional.rating}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data e Horário */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>3. Escolha Data e Horário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-3 block">Data</Label>
                  <WeeklyCalendar
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < startOfDay(new Date())}
                  />
                </div>
                
                <div>
                  <Label className="mb-3 block">Horário</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedDate ? "Selecione um horário" : "Selecione uma data primeiro"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTimeSlots.length > 0 ? (
                        availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          Sem horários disponíveis
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>4. Observações (Opcional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Alguma preferência ou observação..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Resumo */}
            {selectedServiceData && (
              <Card className="border-2 border-primary bg-card/50">
                <CardHeader>
                  <CardTitle>Resumo do Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><span className="font-semibold">Serviço:</span> {selectedServiceData.name}</p>
                  <p><span className="font-semibold">Duração:</span> {selectedServiceData.duration_minutes} minutos</p>
                  {selectedDate && (
                    <p><span className="font-semibold">Data:</span> {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  )}
                  {selectedTime && (
                    <p><span className="font-semibold">Horário:</span> {selectedTime}</p>
                  )}
                  <p className="text-2xl font-bold text-primary pt-4">
                    Total: R$ {selectedServiceData.price.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            )}

            <Button 
              variant="premium" 
              size="xl" 
              className="w-full"
              onClick={handleBooking}
              disabled={!selectedService || !selectedProfessional || !selectedDate || !selectedTime || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
