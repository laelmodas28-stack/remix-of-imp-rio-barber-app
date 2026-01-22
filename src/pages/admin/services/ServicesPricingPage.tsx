import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Save, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  price: number;
  is_active: boolean | null;
}

export function ServicesPricingPage() {
  const { barbershop } = useBarbershopContext();
  const queryClient = useQueryClient();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["admin-services-pricing", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, is_active")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      if (error) throw error;
      
      // Initialize prices state
      const initialPrices: Record<string, string> = {};
      data.forEach((s) => {
        initialPrices[s.id] = s.price.toString();
      });
      setPrices(initialPrices);
      
      return data as Service[];
    },
    enabled: !!barbershop?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(prices).map(([id, price]) => ({
        id,
        price: parseFloat(price),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("services")
          .update({ price: update.price })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Preços atualizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-services-pricing"] });
      setHasChanges(false);
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar preços");
    },
  });

  const handlePriceChange = (id: string, value: string) => {
    setPrices((prev) => ({ ...prev, [id]: value }));
    setHasChanges(true);
  };

  const getPriceChange = (service: Service) => {
    const newPrice = parseFloat(prices[service.id] || "0");
    const diff = newPrice - service.price;
    if (Math.abs(diff) < 0.01) return null;
    return {
      value: diff,
      percentage: ((diff / service.price) * 100).toFixed(1),
    };
  };

  // Calculate stats
  const totalOriginal = services.reduce((acc, s) => acc + s.price, 0);
  const totalNew = services.reduce((acc, s) => acc + parseFloat(prices[s.id] || s.price.toString()), 0);
  const avgPrice = services.length > 0 ? totalNew / services.length : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Preços" subtitle="Tabela de preços e promoções" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Preços"
        subtitle="Gerencie os preços dos serviços"
        actions={
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={!hasChanges || updateMutation.isPending}
            className="gap-2"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Alterações
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">R$ {avgPrice.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Preço Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {Math.max(...services.map((s) => parseFloat(prices[s.id] || s.price.toString()))).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Maior Preço</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <TrendingDown className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R$ {Math.min(...services.map((s) => parseFloat(prices[s.id] || s.price.toString()))).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">Menor Preço</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-lg">Tabela de Preços</CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum serviço cadastrado</p>
              <p className="text-sm">Adicione serviços no Catálogo primeiro</p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const change = getPriceChange(service);
                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Preço atual: R$ {service.price.toFixed(2)}
                        </p>
                      </div>
                      {!service.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4">
                      {change && (
                        <div className={`flex items-center gap-1 text-sm ${
                          change.value > 0 ? "text-success" : "text-destructive"
                        }`}>
                          {change.value > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span>{change.value > 0 ? "+" : ""}{change.percentage}%</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={prices[service.id] || ""}
                          onChange={(e) => handlePriceChange(service.id, e.target.value)}
                          className="w-28 text-right"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-auto">
          <Card className="border-primary shadow-lg">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <p className="text-sm">
                <span className="font-medium">Alterações não salvas</span>
                <span className="text-muted-foreground ml-2">
                  Diferença: {totalNew - totalOriginal >= 0 ? "+" : ""}
                  R$ {(totalNew - totalOriginal).toFixed(2)}
                </span>
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const original: Record<string, string> = {};
                    services.forEach((s) => {
                      original[s.id] = s.price.toString();
                    });
                    setPrices(original);
                    setHasChanges(false);
                  }}
                >
                  Descartar
                </Button>
                <Button
                  size="sm"
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ServicesPricingPage;
