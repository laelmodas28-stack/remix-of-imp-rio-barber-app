import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NewAppointmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barbershopId: string;
  onSuccess?: () => void;
}

export function NewAppointmentModal({
  open,
  onOpenChange,
  barbershopId,
  onSuccess,
}: NewAppointmentModalProps) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Fetch services
  const { data: services = [] } = useQuery({
    queryKey: ["services", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: open && !!barbershopId,
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ["professionals", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: open && !!barbershopId,
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["barbershop-clients", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("barbershop_clients")
        .select("id, client_id, phone, email")
        .eq("barbershop_id", barbershopId)
        .eq("is_active", true);
      
      if (error) throw error;
      
      // Get profile names
      const clientsWithNames = await Promise.all(
        (data || []).map(async (client) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", client.client_id)
            .maybeSingle();
          return {
            ...client,
            name: profile?.full_name || "Cliente",
          };
        })
      );
      
      return clientsWithNames;
    },
    enabled: open && !!barbershopId,
  });

  // Generate time slots
  const timeSlots = [];
  for (let hour = 8; hour <= 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  const createBookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDate || !selectedTime || !selectedService || !selectedProfessional || !selectedClient) {
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const service = services.find((s) => s.id === selectedService);
      const client = clients.find((c) => c.id === selectedClient);
      
      if (!service || !client) {
        throw new Error("Serviço ou cliente inválido");
      }

      const { error } = await supabase.from("bookings").insert({
        barbershop_id: barbershopId,
        client_id: client.client_id,
        professional_id: selectedProfessional,
        service_id: selectedService,
        booking_date: format(selectedDate, "yyyy-MM-dd"),
        booking_time: selectedTime,
        total_price: service.price,
        status: "confirmed",
        notes: notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-bookings"] });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar agendamento");
    },
  });

  const resetForm = () => {
    setSelectedDate(new Date());
    setSelectedTime("");
    setSelectedService("");
    setSelectedProfessional("");
    setSelectedClient("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client */}
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-2">
            <Label>Serviço *</Label>
            <Select value={selectedService} onValueChange={setSelectedService}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o serviço" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name} - R$ {service.price}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Professional */}
          <div className="space-y-2">
            <Label>Profissional *</Label>
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
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
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time */}
          <div className="space-y-2">
            <Label>Horário *</Label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o horário" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o agendamento..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={() => createBookingMutation.mutate()}
            disabled={createBookingMutation.isPending}
          >
            {createBookingMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              "Criar Agendamento"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewAppointmentModal;
