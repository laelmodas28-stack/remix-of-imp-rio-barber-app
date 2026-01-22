import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershop } from "@/hooks/useBarbershop";
import { Plus } from "lucide-react";

interface ServiceFormProps {
  onSuccess: () => void;
}

const ServiceForm = ({ onSuccess }: ServiceFormProps) => {
  const { barbershop } = useBarbershop();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!barbershop) {
      toast.error("Barbearia não encontrada");
      return;
    }

    if (!name.trim() || !price || !duration) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("services").insert({
        barbershop_id: barbershop.id,
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        duration_minutes: parseInt(duration),
        is_active: true,
      });

      if (error) throw error;

      toast.success("Serviço cadastrado com sucesso!");
      
      // Limpar formulário
      setName("");
      setDescription("");
      setPrice("");
      setDuration("");
      
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao cadastrar serviço:", error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Cadastrar Novo Serviço
        </CardTitle>
        <CardDescription>
          Adicione um novo serviço ao catálogo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-name">Nome do Serviço *</Label>
            <Input
              id="service-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corte Masculino"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-description">Descrição</Label>
            <Textarea
              id="service-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do serviço..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-price">Preço (R$) *</Label>
              <Input
                id="service-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-duration">Duração (min) *</Label>
              <Input
                id="service-duration"
                type="number"
                min="5"
                step="5"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="imperial"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Cadastrando..." : "Cadastrar Serviço"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ServiceForm;
