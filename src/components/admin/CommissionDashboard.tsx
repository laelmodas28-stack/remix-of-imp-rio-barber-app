import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  CalendarIcon, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Percent,
  CheckCircle,
  XCircle,
  Settings,
  BarChart3,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";

interface Booking {
  id: string;
  price?: number | null;
  total_price?: number | null;
  booking_date: string;
  status: string | null;
  professional_id: string | null;
  professional?: { name: string } | null;
}

interface Professional {
  id: string;
  name: string;
  photo_url?: string | null;
}

interface CommissionDashboardProps {
  barbershopId: string;
  bookings: Booking[];
  professionals: Professional[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const CommissionDashboard = ({ barbershopId, bookings, professionals }: CommissionDashboardProps) => {
  const queryClient = useQueryClient();
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [dateStart, setDateStart] = useState<Date>(startOfMonth(new Date()));
  const [dateEnd, setDateEnd] = useState<Date>(endOfMonth(new Date()));
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [editingCommission, setEditingCommission] = useState<string | null>(null);
  const [newCommissionRate, setNewCommissionRate] = useState<string>("");

  // Fetch commission rates from professional_commissions table
  const { data: professionalRates, refetch: refetchCommissions } = useQuery({
    queryKey: ["professional-rates", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_commissions")
        .select("professional_id, commission_rate")
        .eq("barbershop_id", barbershopId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!barbershopId,
  });

  // Fetch commission payments
  const { data: commissionPayments, refetch: refetchPayments } = useQuery({
    queryKey: ["commission-payments", barbershopId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commission_payments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Filter by professionals from this barbershop
      const profIds = professionals.map(p => p.id);
      return (data || []).filter(p => profIds.includes(p.professional_id));
    },
    enabled: !!barbershopId && professionals.length > 0,
  });

  // Get commission rate for a professional
  const getCommissionRate = (professionalId: string): number => {
    const rate = professionalRates?.find(r => r.professional_id === professionalId);
    return rate?.commission_rate ? Number(rate.commission_rate) : 50; // Default 50%
  };

  // Filter bookings by date range and professional
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.booking_date);
      const isInDateRange = bookingDate >= dateStart && bookingDate <= dateEnd;
      const isCompleted = booking.status === "completed";
      const matchesProfessional = selectedProfessional === "all" || booking.professional_id === selectedProfessional;
      
      return isInDateRange && isCompleted && matchesProfessional;
    });
  }, [bookings, dateStart, dateEnd, selectedProfessional]);

  // Calculate commission data for each professional
  const professionalCommissions = useMemo(() => {
    const commissionMap = new Map<string, {
      professional: Professional;
      grossAmount: number;
      commissionRate: number;
      commissionAmount: number;
      netAmount: number;
      bookingsCount: number;
    }>();

    filteredBookings.forEach(booking => {
      const professional = professionals.find(p => p.id === booking.professional_id);
      if (!professional) return;

      const existing = commissionMap.get(booking.professional_id) || {
        professional,
        grossAmount: 0,
        commissionRate: getCommissionRate(booking.professional_id),
        commissionAmount: 0,
        netAmount: 0,
        bookingsCount: 0
      };

      const amount = Number(booking.total_price || booking.price || 0);
      const rate = getCommissionRate(booking.professional_id || "");
      const commission = amount * (rate / 100);

      existing.grossAmount += amount;
      existing.commissionAmount += commission;
      existing.netAmount += (amount - commission);
      existing.bookingsCount += 1;

      commissionMap.set(booking.professional_id, existing);
    });

    return Array.from(commissionMap.values()).sort((a, b) => b.grossAmount - a.grossAmount);
  }, [filteredBookings, professionals, professionalRates]);

  // Calculate totals
  const totals = useMemo(() => {
    return professionalCommissions.reduce((acc, pc) => ({
      grossAmount: acc.grossAmount + pc.grossAmount,
      commissionAmount: acc.commissionAmount + pc.commissionAmount,
      netAmount: acc.netAmount + pc.netAmount,
      bookingsCount: acc.bookingsCount + pc.bookingsCount
    }), { grossAmount: 0, commissionAmount: 0, netAmount: 0, bookingsCount: 0 });
  }, [professionalCommissions]);

  // Chart data
  const pieChartData = useMemo(() => {
    return professionalCommissions.map((pc, index) => ({
      name: pc.professional.name,
      value: pc.grossAmount,
      color: COLORS[index % COLORS.length]
    }));
  }, [professionalCommissions]);

  const barChartData = useMemo(() => {
    return professionalCommissions.map(pc => ({
      name: pc.professional.name.split(' ')[0],
      bruto: pc.grossAmount,
      comissao: pc.commissionAmount,
      liquido: pc.netAmount
    }));
  }, [professionalCommissions]);

  // Handle quick date filters
  const handleQuickFilter = (filter: string) => {
    const now = new Date();
    switch (filter) {
      case "7d":
        setDateStart(subDays(now, 7));
        setDateEnd(now);
        break;
      case "30d":
        setDateStart(subDays(now, 30));
        setDateEnd(now);
        break;
      case "month":
        setDateStart(startOfMonth(now));
        setDateEnd(endOfMonth(now));
        break;
      case "last-month":
        const lastMonth = subMonths(now, 1);
        setDateStart(startOfMonth(lastMonth));
        setDateEnd(endOfMonth(lastMonth));
        break;
      case "year":
        setDateStart(startOfYear(now));
        setDateEnd(endOfYear(now));
        break;
    }
  };

  // Handle commission rate update
  const handleUpdateCommissionRate = async (professionalId: string) => {
    const rate = parseFloat(newCommissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error("Taxa deve ser entre 0 e 100");
      return;
    }

    try {
      // Upsert commission rate in professional_commissions table
      const { error } = await supabase
        .from("professional_commissions")
        .upsert({ 
          professional_id: professionalId, 
          barbershop_id: barbershopId,
          commission_rate: rate 
        }, { onConflict: 'professional_id,barbershop_id' });

      if (error) throw error;

      toast.success("Taxa de comissão atualizada!");
      setEditingCommission(null);
      setNewCommissionRate("");
      refetchCommissions();
    } catch (error: any) {
      console.error("Erro ao atualizar taxa:", error);
      toast.error(error.message || "Erro ao atualizar taxa");
    }
  };

  // Mark payment as paid/unpaid
  const handleTogglePaymentStatus = async (paymentId: string, currentStatus: string) => {
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    
    try {
      const { error } = await supabase
        .from("commission_payments")
        .update({ 
          status: newStatus,
          paid_at: newStatus === "paid" ? new Date().toISOString() : null
        })
        .eq("id", paymentId);

      if (error) throw error;

      toast.success(newStatus === "paid" ? "Marcado como pago!" : "Marcado como pendente!");
      refetchPayments();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    if (!commissionPayments) return [];
    
    return commissionPayments.filter(payment => {
      const matchesProfessional = selectedProfessional === "all" || payment.professional_id === selectedProfessional;
      const matchesStatus = paymentFilter === "all" || payment.status === paymentFilter;
      return matchesProfessional && matchesStatus;
    });
  }, [commissionPayments, selectedProfessional, paymentFilter]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].payload.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: R$ {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Percent className="h-6 w-6 text-primary" />
              Gestão de Comissões
            </h2>
            <p className="text-muted-foreground">
              {format(dateStart, "dd/MM/yyyy", { locale: ptBR })} - {format(dateEnd, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleQuickFilter("7d")}>7 dias</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickFilter("30d")}>30 dias</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickFilter("month")}>Mês atual</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickFilter("last-month")}>Mês anterior</Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickFilter("year")}>Ano</Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              {/* Professional Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Profissional</Label>
                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {professionals.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Start */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[140px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateStart, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateStart}
                      onSelect={(date) => date && setDateStart(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date End */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-[140px]">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(dateEnd, "dd/MM/yyyy")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateEnd}
                      onSelect={(date) => date && setDateEnd(date)}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Payment Status Filter */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Status Pagamento</Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Bruto</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              R$ {totals.grossAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">{totals.bookingsCount} atendimentos</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comissões</CardTitle>
            <Percent className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-chart-2">
              R$ {totals.commissionAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">A pagar aos profissionais</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Líquido</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              R$ {totals.netAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Após comissões</p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profissionais</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {professionalCommissions.length}
            </div>
            <p className="text-xs text-muted-foreground">Com atendimentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">
            <Users className="w-4 h-4 mr-2" />
            Por Profissional
          </TabsTrigger>
          <TabsTrigger value="charts">
            <BarChart3 className="w-4 h-4 mr-2" />
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Configurar Taxas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Detalhamento por Profissional</CardTitle>
              <CardDescription>Comissões calculadas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionalCommissions.length > 0 ? (
                  professionalCommissions.map((pc, index) => (
                    <div key={pc.professional.id} className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                          {index + 1}
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={pc.professional.photo_url || ''} alt={pc.professional.name} />
                          <AvatarFallback>{pc.professional.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{pc.professional.name}</p>
                          <p className="text-sm text-muted-foreground">{pc.bookingsCount} atendimentos | Taxa: {pc.commissionRate}%</p>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm"><span className="text-muted-foreground">Bruto:</span> R$ {pc.grossAmount.toFixed(2)}</p>
                        <p className="text-sm text-chart-2"><span className="text-muted-foreground">Comissão:</span> R$ {pc.commissionAmount.toFixed(2)}</p>
                        <p className="text-sm text-green-500 font-medium"><span className="text-muted-foreground">Líquido:</span> R$ {pc.netAmount.toFixed(2)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum atendimento no período selecionado
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Pie Chart - Distribution */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição do Faturamento</CardTitle>
              </CardHeader>
              <CardContent>
                {pieChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Comparison */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-lg">Comparativo de Valores</CardTitle>
              </CardHeader>
              <CardContent>
                {barChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="bruto" name="Bruto" fill="hsl(var(--primary))" />
                      <Bar dataKey="comissao" name="Comissão" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="liquido" name="Líquido" fill="hsl(142 76% 36%)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card className="border-border">
            <CardHeader>
              <CardTitle>Configurar Taxas de Comissão</CardTitle>
              <CardDescription>Defina a porcentagem de comissão para cada profissional</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {professionals.map(professional => {
                  const currentRate = getCommissionRate(professional.id);
                  const isEditing = editingCommission === professional.id;
                  
                  return (
                    <div key={professional.id} className="flex items-center justify-between p-4 bg-card/30 rounded-lg border border-border">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={professional.photo_url || ''} alt={professional.name} />
                          <AvatarFallback>{professional.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{professional.name}</p>
                          <p className="text-sm text-muted-foreground">Taxa atual: {currentRate}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="w-24"
                              value={newCommissionRate}
                              onChange={(e) => setNewCommissionRate(e.target.value)}
                              placeholder="0-100"
                            />
                            <Button size="sm" onClick={() => handleUpdateCommissionRate(professional.id)}>
                              Salvar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              setEditingCommission(null);
                              setNewCommissionRate("");
                            }}>
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setEditingCommission(professional.id);
                              setNewCommissionRate(currentRate.toString());
                            }}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Editar Taxa
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
