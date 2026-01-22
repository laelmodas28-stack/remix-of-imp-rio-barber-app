import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";

interface SubscriptionPlanFormProps {
  onSuccess: () => void;
}

export const SubscriptionPlanForm = ({ onSuccess }: SubscriptionPlanFormProps) => {
  const { barbershop } = useBarbershop();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [maxServicesPerMonth, setMaxServicesPerMonth] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const { data: services } = useQuery({
    queryKey: ["services-for-plans", barbershop?.id],
    queryFn: async () => {
      if (!barbershop) return [];
      
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
    enabled: !!barbershop,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!barbershop) {
      toast.error("Barbearia não encontrada");
      return;
    }

    if (!name || !price || !durationDays) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    try {
      const { error } = await supabase
        .from("subscription_plans")
        .insert({
          barbershop_id: barbershop.id,
          name,
          description,
          price: parseFloat(price),
          duration_days: parseInt(durationDays),
          services_included: selectedServices,
          max_services_per_month: maxServicesPerMonth ? parseInt(maxServicesPerMonth) : null,
          discount_percentage: discountPercentage ? parseFloat(discountPercentage) : null,
        });

      if (error) throw error;

      toast.success("Plano criado com sucesso!");
      
      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setDurationDays("30");
      setMaxServicesPerMonth("");
      setDiscountPercentage("");
      setSelectedServices([]);
      
      onSuccess();
    } catch (error) {
      console.error("Erro ao criar plano:", error);
      toast.error("Erro ao criar plano");
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Criar Novo Plano de Assinatura
        </CardTitle>
        <CardDescription>
          Configure um plano mensal para seus clientes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan-name">Nome do Plano *</Label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Plano Premium"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-price">Preço Mensal (R$) *</Label>
              <Input
                id="plan-price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="150.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea
              id="plan-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva os benefícios do plano"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (dias)</Label>
              <Input
                id="duration"
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                placeholder="30"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-services">Serviços por Mês</Label>
              <Input
                id="max-services"
                type="number"
                value={maxServicesPerMonth}
                onChange={(e) => setMaxServicesPerMonth(e.target.value)}
                placeholder="Ilimitado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Desconto (%)</Label>
              <Input
                id="discount"
                type="number"
                step="0.01"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label>Serviços Incluídos</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-card/30 rounded-lg">
              {services?.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <label
                    htmlFor={`service-${service.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {service.name} - R$ {service.price}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" variant="premium" className="w-full">
            Criar Plano
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
