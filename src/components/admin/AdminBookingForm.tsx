import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfDay, isToday, getHours, getMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, UserPlus, Calendar as CalendarIconLucide } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AdminBookingFormProps {
  barbershopId: string;
  onSuccess?: () => void;
}

interface Client {
  id: string;
  client_id: string;
  profile?: {
    id: string;
    full_name: string;
    phone: string | null;
  } | null;
}

export const AdminBookingForm = ({ barbershopId, onSuccess }: AdminBookingFormProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("booking");
  
  // Booking form state
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [selectedProfessional, setSelectedProfessional] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New client form state
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  // Fetch services
  const { data: services } = useQuery({
    queryKey: ["admin-booking-services", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  // Fetch professionals
  const { data: professionals } = useQuery({
    queryKey: ["admin-booking-professionals", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  // Fetch clients with their profiles
  const { data: clients } = useQuery({
    queryKey: ["admin-booking-clients", barbershopId],
    queryFn: async () => {
      // Get barbershop clients
      const { data: clientsData, error: clientsError } = await supabase
        .from("barbershop_clients")
        .select("id, client_id, created_at, notes")
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false });
      
      if (clientsError) throw clientsError;
      
      // Get profiles for each client
      const clientsWithProfiles = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, full_name, phone")
            .eq("id", client.client_id)
            .maybeSingle();
          
          return {
            ...client,
            profile: profileData,
          };
        })
      );
      
      return clientsWithProfiles as Client[];
    },
    enabled: !!barbershopId,
  });

  // Fetch barbershop for opening hours
  const { data: barbershop } = useQuery({
    queryKey: ["admin-booking-barbershop", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershops")
        .select("*")
        .eq("id", barbershopId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!barbershopId,
  });

  // Fetch existing bookings for the selected professional and date
  const { data: existingBookings } = useQuery({
    queryKey: ["admin-existing-bookings", selectedProfessional, selectedDate],
    queryFn: async () => {
      if (!selectedProfessional || !selectedDate) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("booking_time")
        .eq("professional_id", selectedProfessional)
        .eq("booking_date", format(selectedDate, "yyyy-MM-dd"))
        .in("status", ["pending", "confirmed"]);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfessional && !!selectedDate,
  });

  // Generate time slots from opening/closing times
  const timeSlots = useMemo(() => {
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
  }, [barbershop]);

  // Reset time when professional or date changes
  useEffect(() => {
    setSelectedTime("");
  }, [selectedProfessional, selectedDate]);

  // Get available time slots
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return timeSlots;
    
    let available = [...timeSlots];
    
    // Filter past times if today
    if (isToday(selectedDate)) {
      const now = new Date();
      const currentHour = getHours(now);
      const currentMinute = getMinutes(now);
      
      available = available.filter(slot => {
        const [slotHour, slotMinute] = slot.split(':').map(Number);
        if (slotHour > currentHour) return true;
        if (slotHour === currentHour && slotMinute > currentMinute) return true;
        return false;
      });
    }
    
    // Filter booked times
    if (existingBookings?.length) {
      const bookedTimes = existingBookings.map(b => b.booking_time.substring(0, 5));
      available = available.filter(slot => !bookedTimes.includes(slot));
    }
    
    return available;
  }, [selectedDate, timeSlots, existingBookings]);

  const handleCreateBooking = async () => {
    if (!selectedClient || !selectedService || !selectedProfessional || !selectedDate || !selectedTime) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);
    try {
      const service = services?.find(s => s.id === selectedService);
      
      const { error } = await supabase.from("bookings").insert({
        client_id: selectedClient,
        service_id: selectedService,
        professional_id: selectedProfessional,
        barbershop_id: barbershopId,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        booking_time: selectedTime,
        total_price: service?.price || 0,
        notes: notes,
        status: "confirmed"
      });

      if (error) throw error;

      toast.success("Agendamento criado com sucesso!");
      
      // Reset form
      setSelectedClient("");
      setSelectedService("");
      setSelectedProfessional("");
      setSelectedDate(undefined);
      setSelectedTime("");
      setNotes("");
      
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      onSuccess?.();
    } catch (error: any) {
      console.error("Erro ao criar agendamento:", error);
      toast.error(error.message || "Erro ao criar agendamento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast.error("Por favor, informe o nome do cliente");
      return;
    }

    setIsCreatingClient(true);
    try {
      // For walk-in clients, we need to create a profile first
      // Generate a UUID for the new profile
      const newId = crypto.randomUUID();
      
      // Note: profiles table might require auth user - this is a simplified approach
      // In production, you'd want a proper walk-in client handling
      toast.info("Funcionalidade de cadastro de cliente em desenvolvimento");
      
      // Reset form
      setNewClientName("");
      setNewClientPhone("");
      setNewClientEmail("");
      setActiveTab("booking");
      
    } catch (error: any) {
      console.error("Erro ao cadastrar cliente:", error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setIsCreatingClient(false);
    }
  };

  const selectedServiceData = services?.find(s => s.id === selectedService);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Novo Agendamento / Cliente
        </CardTitle>
        <CardDescription>
          Crie agendamentos ou cadastre novos clientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="booking" className="flex items-center gap-2">
              <CalendarIconLucide className="h-4 w-4" />
              Novo Agendamento
            </TabsTrigger>
            <TabsTrigger value="client" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Cadastrar Cliente
            </TabsTrigger>
          </TabsList>

          <TabsContent value="booking" className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.client_id} value={c.client_id}>
                      {c.profile?.full_name || "Cliente"} {c.profile?.phone ? `- ${c.profile.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serviço */}
            <div className="space-y-2">
              <Label>Serviço *</Label>
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
            </div>

            {/* Profissional */}
            <div className="space-y-2">
              <Label>Profissional *</Label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals?.map((professional) => (
                    <SelectItem key={professional.id} value={professional.id}>
                      {professional.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data e Horário */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < startOfDay(new Date())}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Horário *</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate || !selectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedDate ? "Selecione uma data primeiro" : !selectedProfessional ? "Selecione um profissional" : "Selecionar horário"} />
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
            </div>

            {/* Observações */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Alguma observação..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Resumo */}
            {selectedServiceData && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium">Resumo:</p>
                <p className="text-lg font-bold text-primary">
                  {selectedServiceData.name} - R$ {selectedServiceData.price.toFixed(2)}
                </p>
              </div>
            )}

            <Button 
              onClick={handleCreateBooking} 
              disabled={isSubmitting || !selectedClient || !selectedService || !selectedProfessional || !selectedDate || !selectedTime}
              className="w-full"
            >
              {isSubmitting ? "Criando..." : "Criar Agendamento"}
            </Button>
          </TabsContent>

          <TabsContent value="client" className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Nome do cliente"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>

            <Button 
              onClick={handleCreateClient} 
              disabled={isCreatingClient || !newClientName.trim()}
              className="w-full"
            >
              {isCreatingClient ? "Cadastrando..." : "Cadastrar Cliente"}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};