import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { CalendarClock, Save, Loader2, Plus, Trash2, Clock, Coffee, Calendar, Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { useBarbershop } from "@/hooks/useBarbershop";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
];

const BLOCK_TYPES = [
  { value: "lunch", label: "Almoço", icon: Coffee, color: "bg-orange-500" },
  { value: "break", label: "Intervalo", icon: Clock, color: "bg-blue-500" },
  { value: "appointment", label: "Compromisso", icon: Calendar, color: "bg-purple-500" },
  { value: "other", label: "Outro", icon: Ban, color: "bg-gray-500" },
];

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

interface Professional {
  id: string;
  name: string;
  photo_url: string | null;
  is_active: boolean | null;
}

interface DayAvailability {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface TimeBlock {
  id?: string;
  professional_id: string;
  title: string;
  block_type: string;
  is_recurring: boolean;
  day_of_week: number | null;
  block_date: string | null;
  start_time: string;
  end_time: string;
  notes: string | null;
}

const DEFAULT_SCHEDULE: DayAvailability[] = DAYS_OF_WEEK.map((day) => ({
  day_of_week: day.value,
  start_time: day.value === 0 ? "09:00" : "08:00",
  end_time: day.value === 0 ? "14:00" : "18:00",
  is_available: day.value !== 0,
}));

export function AvailabilityPage() {
  const { barbershop } = useBarbershop();
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<DayAvailability[]>(DEFAULT_SCHEDULE);
  const [hasChanges, setHasChanges] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [mainTab, setMainTab] = useState<"config" | "calendar">("config");
  const [newBlock, setNewBlock] = useState<Partial<TimeBlock>>({
    title: "Almoço",
    block_type: "lunch",
    is_recurring: true,
    day_of_week: 1,
    start_time: "12:00",
    end_time: "13:00",
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Multiple days for recurring blocks

  const { data: professionals, isLoading: loadingProfessionals } = useQuery({
    queryKey: ["professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("id, name, photo_url, is_active")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!barbershop?.id,
  });

  const { data: availability, isLoading: loadingAvailability } = useQuery({
    queryKey: ["professional-availability", selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return null;
      const { data, error } = await supabase
        .from("professional_availability")
        .select("*")
        .eq("professional_id", selectedProfessional);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProfessional,
  });

  const { data: timeBlocks, isLoading: loadingBlocks } = useQuery({
    queryKey: ["professional-time-blocks", selectedProfessional],
    queryFn: async () => {
      if (!selectedProfessional) return [];
      const { data, error } = await supabase
        .from("professional_time_blocks")
        .select("*")
        .eq("professional_id", selectedProfessional)
        .order("start_time");
      if (error) throw error;
      return data as TimeBlock[];
    },
    enabled: !!selectedProfessional,
  });

  // Fetch all availability and blocks for calendar view
  const { data: allAvailability } = useQuery({
    queryKey: ["all-professional-availability", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professional_availability")
        .select("*, professional:professionals(id, name, photo_url)")
        .in("professional_id", professionals?.map(p => p.id) || []);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && !!professionals && professionals.length > 0,
  });

  const { data: allTimeBlocks } = useQuery({
    queryKey: ["all-professional-time-blocks", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professional_time_blocks")
        .select("*, professional:professionals(id, name)")
        .in("professional_id", professionals?.map(p => p.id) || []);
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop?.id && !!professionals && professionals.length > 0,
  });

  useEffect(() => {
    if (availability && availability.length > 0) {
      const merged = DEFAULT_SCHEDULE.map((defaultDay) => {
        const existing = availability.find((a) => a.day_of_week === defaultDay.day_of_week);
        if (existing) {
          return {
            day_of_week: existing.day_of_week,
            start_time: existing.start_time.slice(0, 5),
            end_time: existing.end_time.slice(0, 5),
            is_available: existing.is_available,
          };
        }
        return defaultDay;
      });
      setSchedule(merged);
      setHasChanges(false);
    } else if (selectedProfessional) {
      setSchedule(DEFAULT_SCHEDULE);
      setHasChanges(false);
    }
  }, [availability, selectedProfessional]);

  const handleSelectProfessional = (profId: string) => {
    setSelectedProfessional(profId);
    setHasChanges(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfessional) throw new Error("Nenhum profissional selecionado");

      await supabase
        .from("professional_availability")
        .delete()
        .eq("professional_id", selectedProfessional);

      const { error } = await supabase
        .from("professional_availability")
        .insert(
          schedule.map((day) => ({
            professional_id: selectedProfessional,
            day_of_week: day.day_of_week,
            start_time: day.start_time,
            end_time: day.end_time,
            is_available: day.is_available,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disponibilidade salva!");
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["professional-availability"] });
      queryClient.invalidateQueries({ queryKey: ["all-professional-availability"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao salvar disponibilidade");
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProfessional) throw new Error("Nenhum profissional selecionado");

      // For recurring blocks with multiple days, insert one record per day
      if (newBlock.is_recurring && selectedDays.length > 0) {
        const blocks = selectedDays.map((dayOfWeek) => ({
          professional_id: selectedProfessional,
          title: newBlock.title || "Bloqueio",
          block_type: newBlock.block_type || "break",
          is_recurring: true,
          day_of_week: dayOfWeek,
          block_date: null,
          start_time: newBlock.start_time,
          end_time: newBlock.end_time,
          notes: newBlock.notes || null,
        }));

        const { error } = await supabase.from("professional_time_blocks").insert(blocks);
        if (error) throw error;
      } else {
        // Single specific date block
        const { error } = await supabase.from("professional_time_blocks").insert({
          professional_id: selectedProfessional,
          title: newBlock.title || "Bloqueio",
          block_type: newBlock.block_type || "break",
          is_recurring: false,
          day_of_week: null,
          block_date: newBlock.block_date,
          start_time: newBlock.start_time,
          end_time: newBlock.end_time,
          notes: newBlock.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Bloqueio adicionado!");
      setIsBlockModalOpen(false);
      setNewBlock({
        title: "Almoço",
        block_type: "lunch",
        is_recurring: true,
        day_of_week: 1,
        start_time: "12:00",
        end_time: "13:00",
      });
      setSelectedDays([1]);
      queryClient.invalidateQueries({ queryKey: ["professional-time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["all-professional-time-blocks"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao adicionar bloqueio");
    },
  });

  const deleteBlockMutation = useMutation({
    mutationFn: async (blockId: string) => {
      const { error } = await supabase.from("professional_time_blocks").delete().eq("id", blockId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bloqueio removido!");
      queryClient.invalidateQueries({ queryKey: ["professional-time-blocks"] });
      queryClient.invalidateQueries({ queryKey: ["all-professional-time-blocks"] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao remover bloqueio");
    },
  });

  const updateDay = (dayIndex: number, field: keyof DayAvailability, value: any) => {
    setSchedule((prev) =>
      prev.map((day) =>
        day.day_of_week === dayIndex ? { ...day, [field]: value } : day
      )
    );
    setHasChanges(true);
  };

  const selectedProfessionalData = professionals?.find((p) => p.id === selectedProfessional);

  const getBlockTypeInfo = (type: string) => {
    return BLOCK_TYPES.find((t) => t.value === type) || BLOCK_TYPES[3];
  };

  const recurringBlocks = timeBlocks?.filter((b) => b.is_recurring) || [];
  const specificBlocks = timeBlocks?.filter((b) => !b.is_recurring) || [];

  // Calendar week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeek, i));
  }, [currentWeek]);

  // Get availability and blocks for a professional on a specific day
  const getProfessionalDayData = (profId: string, dayOfWeek: number, date: Date) => {
    const avail = allAvailability?.find(
      (a) => a.professional_id === profId && a.day_of_week === dayOfWeek
    );
    
    const dateStr = format(date, "yyyy-MM-dd");
    const blocks = allTimeBlocks?.filter((b) => {
      if (b.professional_id !== profId) return false;
      if (b.is_recurring) {
        return b.day_of_week === dayOfWeek;
      }
      return b.block_date === dateStr;
    }) || [];

    return { availability: avail, blocks };
  };

  // Check if a specific hour is within working hours
  const isWithinWorkingHours = (hour: number, avail: any) => {
    if (!avail?.is_available) return false;
    const startHour = parseInt(avail.start_time.split(":")[0]);
    const endHour = parseInt(avail.end_time.split(":")[0]);
    return hour >= startHour && hour < endHour;
  };

  // Check if a specific hour is blocked
  const getBlockAtHour = (hour: number, blocks: any[]) => {
    return blocks.find((block) => {
      const startHour = parseInt(block.start_time.split(":")[0]);
      const endHour = parseInt(block.end_time.split(":")[0]);
      return hour >= startHour && hour < endHour;
    });
  };

  return (
    <AdminPageScaffold
      title="Disponibilidade"
      subtitle="Configure horários, escalas e bloqueios dos profissionais"
      icon={CalendarClock}
    >
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "config" | "calendar")} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="config">Configurar Horários</TabsTrigger>
          <TabsTrigger value="calendar">Calendário Semanal</TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Professional List */}
            <Card className="card-elevated lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profissionais</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loadingProfessionals ? (
                  <div className="space-y-2 p-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : professionals && professionals.length > 0 ? (
                  <div className="divide-y divide-border">
                    {professionals.map((prof) => (
                      <button
                        key={prof.id}
                        onClick={() => handleSelectProfessional(prof.id)}
                        className={`w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${
                          selectedProfessional === prof.id ? "bg-muted" : ""
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={prof.photo_url || undefined} />
                          <AvatarFallback>{prof.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{prof.name}</p>
                          <Badge variant={prof.is_active ? "default" : "secondary"} className="text-xs">
                            {prof.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    Nenhum profissional cadastrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Configuration */}
            <Card className="card-elevated lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedProfessionalData && (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={selectedProfessionalData.photo_url || undefined} />
                        <AvatarFallback>
                          {selectedProfessionalData.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <CardTitle className="text-base">
                      {selectedProfessionalData
                        ? `Agenda de ${selectedProfessionalData.name}`
                        : "Selecione um profissional"}
                    </CardTitle>
                  </div>
                  {selectedProfessional && hasChanges && (
                    <Button
                      size="sm"
                      onClick={() => saveMutation.mutate()}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Salvar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedProfessional ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Selecione um profissional para configurar sua disponibilidade
                    </p>
                  </div>
                ) : loadingAvailability || loadingBlocks ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : (
                  <Tabs defaultValue="schedule" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="schedule">Horário de Trabalho</TabsTrigger>
                      <TabsTrigger value="blocks">
                        Bloqueios
                        {timeBlocks && timeBlocks.length > 0 && (
                          <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                            {timeBlocks.length}
                          </Badge>
                        )}
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="schedule" className="mt-4 space-y-3">
                      {DAYS_OF_WEEK.map((day) => {
                        const daySchedule = schedule.find((s) => s.day_of_week === day.value);
                        if (!daySchedule) return null;

                        return (
                          <div
                            key={day.value}
                            className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                              daySchedule.is_available
                                ? "bg-card border-border"
                                : "bg-muted/30 border-transparent"
                            }`}
                          >
                            <div className="w-20">
                              <span className="font-medium text-sm">{day.label}</span>
                            </div>

                            <Switch
                              checked={daySchedule.is_available}
                              onCheckedChange={(checked) =>
                                updateDay(day.value, "is_available", checked)
                              }
                            />

                            {daySchedule.is_available && (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  type="time"
                                  value={daySchedule.start_time}
                                  onChange={(e) =>
                                    updateDay(day.value, "start_time", e.target.value)
                                  }
                                  className="w-28 h-9 text-sm"
                                />
                                <span className="text-muted-foreground text-sm">às</span>
                                <Input
                                  type="time"
                                  value={daySchedule.end_time}
                                  onChange={(e) =>
                                    updateDay(day.value, "end_time", e.target.value)
                                  }
                                  className="w-28 h-9 text-sm"
                                />
                              </div>
                            )}

                            {!daySchedule.is_available && (
                              <span className="text-sm text-muted-foreground">Folga</span>
                            )}
                          </div>
                        );
                      })}

                      {/* Save button always visible */}
                      <div className="flex justify-end pt-4 border-t mt-4">
                        <Button
                          onClick={() => saveMutation.mutate()}
                          disabled={saveMutation.isPending || !hasChanges}
                        >
                          {saveMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Salvar Horários
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="blocks" className="mt-4 space-y-4">
                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setIsBlockModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Bloqueio
                        </Button>
                      </div>

                      {recurringBlocks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Bloqueios Recorrentes</h4>
                          {recurringBlocks.map((block) => {
                            const typeInfo = getBlockTypeInfo(block.block_type);
                            const Icon = typeInfo.icon;
                            const dayLabel = DAYS_OF_WEEK.find((d) => d.value === block.day_of_week)?.label;

                            return (
                              <div
                                key={block.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", typeInfo.color)}>
                                    <Icon className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{block.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {dayLabel} • {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => block.id && deleteBlockMutation.mutate(block.id)}
                                  disabled={deleteBlockMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {specificBlocks.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Bloqueios Específicos</h4>
                          {specificBlocks.map((block) => {
                            const typeInfo = getBlockTypeInfo(block.block_type);
                            const Icon = typeInfo.icon;

                            return (
                              <div
                                key={block.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-card"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", typeInfo.color)}>
                                    <Icon className="h-4 w-4 text-white" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{block.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {block.block_date} • {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => block.id && deleteBlockMutation.mutate(block.id)}
                                  disabled={deleteBlockMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {timeBlocks?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                          <p className="text-sm text-muted-foreground">Nenhum bloqueio configurado</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Adicione intervalos de almoço, pausas ou compromissos
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="card-elevated">
            <CardHeader className="pb-3 px-3 sm:px-6">
              {/* Mobile-first responsive layout */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Navigation controls */}
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs sm:text-sm" onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 0 }))}>
                    Hoje
                  </Button>
                  {/* Date range - inline on mobile, separate on desktop */}
                  <span className="text-xs sm:text-sm font-medium text-muted-foreground sm:hidden ml-1">
                    {format(weekDays[0], "d/MM", { locale: ptBR })} - {format(weekDays[6], "d/MM", { locale: ptBR })}
                  </span>
                </div>
                
                {/* Date range - desktop only */}
                <CardTitle className="text-sm sm:text-base hidden sm:block">
                  {format(weekDays[0], "d MMM", { locale: ptBR })} - {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
                </CardTitle>
                
                {/* Legend */}
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs flex-wrap">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-primary/20 border border-primary" />
                    <span>Disponível</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-orange-500" />
                    <span>Bloqueio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded bg-muted" />
                    <span>Folga</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <div className="min-w-[600px] sm:min-w-[800px]">
                  {/* Header with days */}
                  <div className="grid grid-cols-[80px_repeat(7,1fr)] sm:grid-cols-[120px_repeat(7,1fr)] border-b">
                    <div className="p-2 sm:p-3 font-medium text-xs sm:text-sm text-muted-foreground border-r">
                      Profissional
                    </div>
                    {weekDays.map((day, idx) => {
                      const isToday = isSameDay(day, new Date());
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "p-1.5 sm:p-3 text-center border-r last:border-r-0",
                            isToday && "bg-primary/5"
                          )}
                        >
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{DAYS_OF_WEEK[idx].short}</p>
                          <p className={cn("text-xs sm:text-sm font-medium", isToday && "text-primary")}>
                            {format(day, "d")}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Professionals rows */}
                  {loadingProfessionals ? (
                    <div className="p-4 space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : professionals && professionals.length > 0 ? (
                    professionals.map((prof) => (
                      <div key={prof.id} className="grid grid-cols-[80px_repeat(7,1fr)] sm:grid-cols-[120px_repeat(7,1fr)] border-b last:border-b-0">
                        <div className="p-1.5 sm:p-3 flex items-center gap-1.5 sm:gap-2 border-r bg-muted/30 min-w-0">
                          <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                            <AvatarImage src={prof.photo_url || undefined} />
                            <AvatarFallback className="text-[10px] sm:text-xs">{prof.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm font-medium truncate">{prof.name}</span>
                        </div>
                        {weekDays.map((day, dayIdx) => {
                          const { availability: avail, blocks } = getProfessionalDayData(prof.id, dayIdx, day);
                          const isToday = isSameDay(day, new Date());

                          if (!avail?.is_available) {
                            return (
                              <div
                                key={dayIdx}
                                className={cn(
                                  "p-1 sm:p-2 border-r last:border-r-0 bg-muted/50 flex items-center justify-center",
                                  isToday && "bg-primary/5"
                                )}
                              >
                                <span className="text-[10px] sm:text-xs text-muted-foreground">Folga</span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={dayIdx}
                              className={cn(
                                "p-0.5 sm:p-1 border-r last:border-r-0 min-h-[60px] sm:min-h-[80px]",
                                isToday && "bg-primary/5"
                              )}
                            >
                              <TooltipProvider>
                                <div className="space-y-0.5">
                                  {/* Working hours indicator */}
                                  <div className="text-[8px] sm:text-[10px] text-muted-foreground text-center mb-0.5 sm:mb-1 truncate">
                                    {avail.start_time.slice(0, 5)}-{avail.end_time.slice(0, 5)}
                                  </div>
                                  
                                  {/* Blocks */}
                                  {blocks.map((block) => {
                                    const typeInfo = getBlockTypeInfo(block.block_type);
                                    return (
                                      <Tooltip key={block.id}>
                                        <TooltipTrigger asChild>
                                          <div
                                            className={cn(
                                              "rounded px-1 py-0.5 text-[10px] text-white truncate cursor-pointer",
                                              typeInfo.color
                                            )}
                                          >
                                            {block.start_time.slice(0, 5)} {block.title}
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p className="font-medium">{block.title}</p>
                                          <p className="text-xs">{block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    );
                                  })}

                                  {blocks.length === 0 && (
                                    <div className="h-8 rounded bg-primary/10 border border-primary/20" />
                                  )}
                                </div>
                              </TooltipProvider>
                            </div>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Nenhum profissional cadastrado
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Block Modal */}
      <Dialog open={isBlockModalOpen} onOpenChange={setIsBlockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Bloqueio</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={newBlock.block_type}
                onValueChange={(value) =>
                  setNewBlock((prev) => ({
                    ...prev,
                    block_type: value,
                    title: BLOCK_TYPES.find((t) => t.value === value)?.label || "Bloqueio",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCK_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={newBlock.title || ""}
                onChange={(e) => setNewBlock((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Almoço, Consulta médica..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={newBlock.is_recurring}
                onCheckedChange={(checked) =>
                  setNewBlock((prev) => ({ ...prev, is_recurring: checked }))
                }
              />
              <Label>Repetir toda semana</Label>
            </div>

            {newBlock.is_recurring ? (
              <div className="space-y-2">
                <Label>Dias da Semana</Label>
                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`day-${day.value}`}
                        checked={selectedDays.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDays((prev) => [...prev, day.value].sort((a, b) => a - b));
                          } else {
                            setSelectedDays((prev) => prev.filter((d) => d !== day.value));
                          }
                        }}
                      />
                      <label
                        htmlFor={`day-${day.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {day.label}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedDays.length === 0 && (
                  <p className="text-xs text-destructive">Selecione pelo menos um dia</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={newBlock.block_date || ""}
                  onChange={(e) => setNewBlock((prev) => ({ ...prev, block_date: e.target.value }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="time"
                  value={newBlock.start_time || ""}
                  onChange={(e) => setNewBlock((prev) => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input
                  type="time"
                  value={newBlock.end_time || ""}
                  onChange={(e) => setNewBlock((prev) => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBlockModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => addBlockMutation.mutate()} 
              disabled={addBlockMutation.isPending || (newBlock.is_recurring && selectedDays.length === 0)}
            >
              {addBlockMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageScaffold>
  );
}

export default AvailabilityPage;
