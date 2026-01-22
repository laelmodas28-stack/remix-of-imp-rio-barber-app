import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  BarChart3, 
  Bell, 
  Building2,
  CreditCard,
  ChevronLeft, 
  ChevronRight,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

import demoScheduling from "@/assets/demo-scheduling.jpg";
import demoTeam from "@/assets/demo-team.jpg";
import demoFinancial from "@/assets/demo-financial.jpg";
import demoSubscriptions from "@/assets/demo-subscriptions.jpg";
import demoNotifications from "@/assets/demo-notifications.jpg";
import demoMultiunit from "@/assets/demo-multiunit.jpg";

interface DemoTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tourSteps = [
  {
    icon: Calendar,
    image: demoScheduling,
    title: "Agendamento Online 24/7",
    description: "Sistema de agendamentos que funciona a qualquer hora, com confirmação automática integrada.",
    features: [
      "Calendário inteligente com disponibilidade em tempo real",
      "Bloqueio automático de horários ocupados",
      "Reagendamento simplificado para o cliente"
    ]
  },
  {
    icon: Users,
    image: demoTeam,
    title: "Gestão de Equipe",
    description: "Controle completo de profissionais, escalas de trabalho e comissões em um único lugar.",
    features: [
      "Perfil individual para cada profissional",
      "Cálculo automático de comissões",
      "Relatório de desempenho detalhado"
    ]
  },
  {
    icon: BarChart3,
    image: demoFinancial,
    title: "Dashboard Financeiro",
    description: "Visão completa do faturamento, serviços mais vendidos e tendências do negócio.",
    features: [
      "Gráficos de receita por período",
      "Análise de serviços mais populares",
      "Exportação de relatórios em PDF"
    ]
  },
  {
    icon: Bell,
    image: demoNotifications,
    title: "Notificações Automatizadas",
    description: "Reduza faltas com lembretes automáticos via WhatsApp e notificações push.",
    features: [
      "Lembrete 24h e 1h antes do horário",
      "Notificação instantânea de novos agendamentos",
      "Alertas de cancelamento para a equipe"
    ]
  },
  {
    icon: Building2,
    image: demoMultiunit,
    title: "Multi-Unidades",
    description: "Gerencie múltiplas filiais com controle centralizado e relatórios consolidados.",
    features: [
      "Painel único para todas as unidades",
      "Comparativo de desempenho entre filiais",
      "Gestão de equipe por localidade"
    ]
  },
  {
    icon: CreditCard,
    image: demoSubscriptions,
    title: "Planos de Assinatura",
    description: "Crie planos mensais para fidelizar clientes e garantir receita recorrente.",
    features: [
      "Criação de planos com benefícios exclusivos",
      "Pagamento integrado com Mercado Pago",
      "Gestão automática de renovações"
    ]
  }
];

export function DemoTour({ open, onOpenChange }: DemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const step = tourSteps[currentStep];
  const Icon = step.icon;
  
  const goNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden gap-0">
        {/* Header with progress */}
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tour do Produto
            </span>
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>
          </div>
          <div className="flex gap-1.5">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-300",
                  index === currentStep 
                    ? "bg-primary" 
                    : index < currentStep 
                      ? "bg-primary/40" 
                      : "bg-border"
                )}
              />
            ))}
          </div>
        </div>

        <DialogHeader className="sr-only">
          <DialogTitle>Tour do ImperioApp</DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="p-6">
          {/* Screenshot image */}
          <div className="rounded-lg overflow-hidden border border-border mb-6 shadow-lg">
            <img 
              src={step.image} 
              alt={step.title}
              className="w-full h-auto object-cover"
            />
          </div>

          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              {/* Title and description */}
              <h3 className="text-lg font-semibold mb-1 text-foreground">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">{step.description}</p>

              {/* Features list */}
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {step.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-primary" />
                    </div>
                    <span className="text-xs text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer navigation */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={currentStep === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>

          {currentStep === tourSteps.length - 1 ? (
            <Button onClick={handleClose} size="sm" className="gap-1.5">
              Começar Agora
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={goNext} size="sm" className="gap-1.5">
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
