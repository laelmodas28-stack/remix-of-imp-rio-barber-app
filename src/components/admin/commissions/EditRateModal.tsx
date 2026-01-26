import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfessionalWithRate, useUpdateCommissionRate } from "@/hooks/useCommissionRates";

interface EditRateModalProps {
  professional: ProfessionalWithRate | null;
  onClose: () => void;
}

export function EditRateModal({ professional, onClose }: EditRateModalProps) {
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const updateRate = useUpdateCommissionRate();

  useEffect(() => {
    if (professional) {
      setRate(String(professional.commission_rate));
      setError("");
    }
  }, [professional]);

  const validateRate = (value: string): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) {
      setError("Digite um número válido");
      return false;
    }
    if (num < 0 || num > 100) {
      setError("A taxa deve estar entre 0 e 100");
      return false;
    }
    // Check max 2 decimal places
    if (!/^\d+(\.\d{0,2})?$/.test(value)) {
      setError("Máximo de 2 casas decimais");
      return false;
    }
    setError("");
    return true;
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRate(value);
    if (value) {
      validateRate(value);
    } else {
      setError("");
    }
  };

  const handleSubmit = async () => {
    if (!professional || !validateRate(rate)) return;

    const newRate = parseFloat(rate);
    await updateRate.mutateAsync({
      professionalId: professional.id,
      newRate,
      oldRate: professional.commission_rate,
    });
    onClose();
  };

  const handleClose = () => {
    setRate("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={!!professional} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Taxa de Comissão</DialogTitle>
          <DialogDescription>
            Altere a taxa de comissão deste profissional. A nova taxa será aplicada
            apenas para serviços futuros.
          </DialogDescription>
        </DialogHeader>

        {professional && (
          <div className="space-y-6 py-4">
            {/* Professional Info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={professional.photo_url || undefined} />
                <AvatarFallback>{professional.name?.charAt(0) || 'P'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{professional.name}</p>
                <p className="text-sm text-muted-foreground">
                  Taxa atual: {professional.commission_rate}%
                </p>
              </div>
            </div>

            {/* Rate Input */}
            <div className="space-y-2">
              <Label htmlFor="rate">Nova taxa de comissão (%)</Label>
              <div className="relative">
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rate}
                  onChange={handleRateChange}
                  className={error ? "border-destructive" : ""}
                  placeholder="Ex: 15.00"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={updateRate.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateRate.isPending || !!error || !rate}
          >
            {updateRate.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
