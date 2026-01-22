import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";

interface BarberInviteFormProps {
  barbershopId: string;
  onSuccess: () => void;
}

export const BarberInviteForm = ({ barbershopId, onSuccess }: BarberInviteFormProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast.error("Preencha email e nome do barbeiro");
      return;
    }

    setIsSubmitting(true);

    try {
      // Adicionar barbeiro diretamente como profissional ativo
      const { error: profError } = await supabase
        .from("professionals")
        .insert({
          barbershop_id: barbershopId,
          name: name,
          is_active: true,
        });

      if (profError) throw profError;

      toast.success("Barbeiro adicionado com sucesso!");
      
      setEmail("");
      setName("");
      setPhone("");
      onSuccess();
    } catch (error: any) {
      console.error("Erro ao adicionar barbeiro:", error);
      toast.error("Erro ao adicionar barbeiro: " + (error.message || "Erro desconhecido"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Adicionar Barbeiro
        </CardTitle>
        <CardDescription>
          Convide um barbeiro para trabalhar na sua barbearia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barber-email">Email do Barbeiro *</Label>
            <Input
              id="barber-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barbeiro@email.com"
              required
            />
            <p className="text-xs text-muted-foreground">
              O barbeiro deve criar uma conta usando este email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barber-name">Nome Completo *</Label>
            <Input
              id="barber-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do Barbeiro"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barber-phone">Telefone (opcional)</Label>
            <Input
              id="barber-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+5511999999999"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Processando..." : "Convidar Barbeiro"}
          </Button>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Informação:</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              O barbeiro será adicionado imediatamente como profissional ativo e poderá receber agendamentos.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
