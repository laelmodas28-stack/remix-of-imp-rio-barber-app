import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from "react-joyride";
import { Button } from "@/components/ui/button";
import { 
  HelpCircle, 
  Rocket, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const TOUR_COMPLETED_KEY = "imperio-admin-tour-completed";
const TOUR_VERSION = "1.0"; // Increment this to force tour to show again after updates

interface AdminTourProps {
  barbershopId?: string;
}

// Tour steps covering all major areas
const tourSteps: Step[] = [
  {
    target: "body",
    placement: "center",
    title: "Bem-vindo ao Painel Administrativo! 🎉",
    content: (
      <div className="space-y-3">
        <p>Este tour vai te guiar pelas principais funcionalidades do sistema.</p>
        <p className="text-sm text-muted-foreground">
          Você pode rever este tour a qualquer momento clicando no botão de ajuda.
        </p>
      </div>
    ),
    disableBeacon: true,
  },
  {
    target: '[data-tour="sidebar"]',
    placement: "right",
    title: "Menu de Navegação",
    content: (
      <div className="space-y-2">
        <p>Este é o menu principal do sistema. Aqui você encontra todas as seções organizadas por categoria.</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Dashboard:</strong> Visão geral do negócio</li>
          <li>• <strong>Agenda:</strong> Gerenciamento de agendamentos</li>
          <li>• <strong>Clientes:</strong> Base de clientes</li>
          <li>• <strong>E muito mais...</strong></li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="header"]',
    placement: "bottom",
    title: "Barra Superior",
    content: (
      <div className="space-y-2">
        <p>Aqui você tem acesso rápido a:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Novo Agendamento:</strong> Crie agendamentos rapidamente</li>
          <li>• <strong>Notificações:</strong> Alertas e avisos importantes</li>
          <li>• <strong>Perfil:</strong> Configurações da sua conta</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="quick-action"]',
    placement: "bottom",
    title: "Ação Rápida",
    content: "Clique aqui para criar um novo agendamento de forma rápida, sem precisar navegar pelos menus.",
  },
  {
    target: '[data-tour="notifications"]',
    placement: "bottom",
    title: "Central de Notificações",
    content: "Receba alertas sobre novos agendamentos, cancelamentos, lembretes e atualizações importantes do sistema.",
  },
  {
    target: '[data-tour="user-menu"]',
    placement: "bottom-end",
    title: "Menu do Usuário",
    content: (
      <div className="space-y-2">
        <p>Acesse suas configurações pessoais:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Minha Conta</li>
          <li>• Configurações</li>
          <li>• Sair do sistema</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-dashboard"]',
    placement: "right",
    title: "Dashboard",
    content: (
      <div className="space-y-2">
        <p>O Dashboard mostra uma visão geral do seu negócio:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Receita do mês</li>
          <li>• Total de agendamentos</li>
          <li>• Agendamentos de hoje</li>
          <li>• Estatísticas rápidas</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-agenda"]',
    placement: "right",
    title: "Módulo de Agenda",
    content: (
      <div className="space-y-2">
        <p>Gerencie todos os agendamentos da sua barbearia:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Calendário:</strong> Visão mensal dos agendamentos</li>
          <li>• <strong>Agendamentos:</strong> Lista detalhada</li>
          <li>• <strong>Lista de Espera:</strong> Clientes aguardando vaga</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-clients"]',
    placement: "right",
    title: "Gestão de Clientes",
    content: (
      <div className="space-y-2">
        <p>Mantenha sua base de clientes organizada:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Cadastro de clientes</li>
          <li>• Histórico de atendimentos</li>
          <li>• Segmentação de clientes</li>
          <li>• Notas e observações</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-professionals"]',
    placement: "right",
    title: "Equipe de Profissionais",
    content: (
      <div className="space-y-2">
        <p>Gerencie sua equipe de barbeiros:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Cadastro de profissionais</li>
          <li>• Horários e disponibilidade</li>
          <li>• Comissões e pagamentos</li>
          <li>• Bloqueios de agenda</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-services"]',
    placement: "right",
    title: "Catálogo de Serviços",
    content: (
      <div className="space-y-2">
        <p>Configure os serviços oferecidos:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Cadastro de serviços</li>
          <li>• Preços e duração</li>
          <li>• Serviços adicionais</li>
          <li>• Regras de precificação</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-finance"]',
    placement: "right",
    title: "Módulo Financeiro",
    content: (
      <div className="space-y-2">
        <p>Controle completo das finanças:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Visão Geral:</strong> KPIs e gráficos</li>
          <li>• <strong>Transações:</strong> Entrada e saída</li>
          <li>• <strong>Fluxo de Caixa:</strong> Controle diário</li>
          <li>• <strong>Pagamentos:</strong> Comissões da equipe</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-subscriptions"]',
    placement: "right",
    title: "Assinaturas de Clientes",
    content: (
      <div className="space-y-2">
        <p>Gerencie planos de assinatura:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Planos disponíveis</li>
          <li>• Clientes assinantes</li>
          <li>• Faturas e cobranças</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-reports"]',
    placement: "right",
    title: "Relatórios e Análises",
    content: (
      <div className="space-y-2">
        <p>Tome decisões baseadas em dados:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Relatório de receitas</li>
          <li>• Análise de agendamentos</li>
          <li>• Taxa de retenção</li>
          <li>• Exportação de dados</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-imports"]',
    placement: "right",
    title: "Importação de Dados",
    content: "Importe sua base de clientes existente através de planilhas Excel ou CSV. O assistente guia você em cada etapa.",
  },
  {
    target: '[data-tour="sidebar-notifications"]',
    placement: "right",
    title: "Notificações Automáticas",
    content: (
      <div className="space-y-2">
        <p>Configure comunicações automáticas:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Canais:</strong> WhatsApp, Email, SMS</li>
          <li>• <strong>Templates:</strong> Mensagens personalizadas</li>
          <li>• <strong>Logs:</strong> Histórico de envios</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-settings"]',
    placement: "right",
    title: "Configurações",
    content: (
      <div className="space-y-2">
        <p>Personalize o sistema:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Dados da barbearia</li>
          <li>• Usuários e permissões</li>
          <li>• Preferências do sistema</li>
          <li>• Regras de agendamento</li>
        </ul>
      </div>
    ),
  },
  {
    target: '[data-tour="sidebar-help"]',
    placement: "right",
    title: "Ajuda e Suporte",
    content: (
      <div className="space-y-2">
        <p>Precisa de ajuda?</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Tutoriais em vídeo</li>
          <li>• Central de suporte</li>
          <li>• FAQ e dúvidas frequentes</li>
        </ul>
      </div>
    ),
  },
  {
    target: "body",
    placement: "center",
    title: "Pronto para começar! 🚀",
    content: (
      <div className="space-y-3">
        <p>Agora você conhece as principais funcionalidades do sistema!</p>
        <div className="bg-primary/10 rounded-lg p-3">
          <p className="text-sm font-medium text-primary">💡 Dica:</p>
          <p className="text-sm text-muted-foreground">
            Clique no ícone <HelpCircle className="inline h-4 w-4" /> no cabeçalho para rever este tour a qualquer momento.
          </p>
        </div>
      </div>
    ),
    disableBeacon: true,
  },
];

// Custom tooltip component
const CustomTooltip = ({
  continuous,
  index,
  step,
  backProps,
  closeProps,
  primaryProps,
  tooltipProps,
  isLastStep,
  size,
}: any) => {
  const progress = ((index + 1) / size) * 100;

  return (
    <div
      {...tooltipProps}
      className="bg-card border border-border rounded-xl shadow-2xl max-w-md animate-in fade-in-0 zoom-in-95 duration-200"
    >
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-t-xl overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground">
                Passo {index + 1} de {size}
              </p>
            </div>
          </div>
          <button
            {...closeProps}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="text-sm text-foreground/90 mb-5">
          {step.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: size }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === index 
                    ? "w-6 bg-primary" 
                    : i < index 
                      ? "w-1.5 bg-primary/50" 
                      : "w-1.5 bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {index > 0 && (
              <Button
                {...backProps}
                variant="outline"
                size="sm"
                className="gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar
              </Button>
            )}
            <Button
              {...primaryProps}
              size="sm"
              className="gap-1"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ArrowRight className="h-3 w-3" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export function AdminTour({ barbershopId }: AdminTourProps) {
  const [runTour, setRunTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check if tour was completed
  useEffect(() => {
    const tourKey = `${TOUR_COMPLETED_KEY}-${barbershopId || "default"}-v${TOUR_VERSION}`;
    const completed = localStorage.getItem(tourKey);
    
    if (!completed) {
      // Small delay to let the page render
      const timeout = setTimeout(() => {
        setRunTour(true);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [barbershopId]);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index, action } = data;

    // Close tour when finished, skipped, or close button clicked
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status as any)) {
      setRunTour(false);
      setStepIndex(0);
      
      // Mark tour as completed
      const tourKey = `${TOUR_COMPLETED_KEY}-${barbershopId || "default"}-v${TOUR_VERSION}`;
      localStorage.setItem(tourKey, "true");
    }

    // Handle close button click (X button)
    if (action === ACTIONS.CLOSE) {
      setRunTour(false);
      setStepIndex(0);
      
      // Also mark as completed when user closes manually
      const tourKey = `${TOUR_COMPLETED_KEY}-${barbershopId || "default"}-v${TOUR_VERSION}`;
      localStorage.setItem(tourKey, "true");
    }

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }
  };

  const startTour = () => {
    setStepIndex(0);
    setRunTour(true);
  };

  return (
    <>
      <Joyride
        steps={tourSteps}
        run={runTour}
        stepIndex={stepIndex}
        continuous
        showSkipButton
        showProgress={false}
        disableOverlayClose
        disableScrolling={false}
        spotlightClicks={false}
        callback={handleJoyrideCallback}
        tooltipComponent={CustomTooltip}
        locale={{
          back: "Voltar",
          close: "Fechar",
          last: "Concluir",
          next: "Próximo",
          skip: "Pular tour",
        }}
        styles={{
          options: {
            arrowColor: "hsl(var(--card))",
            backgroundColor: "hsl(var(--card))",
            overlayColor: "rgba(0, 0, 0, 0.7)",
            primaryColor: "hsl(var(--primary))",
            textColor: "hsl(var(--foreground))",
            zIndex: 10000,
          },
          spotlight: {
            borderRadius: 12,
          },
        }}
        floaterProps={{
          styles: {
            floater: {
              filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.3))",
            },
          },
        }}
      />

      {/* Help button to restart tour */}
      <Button
        variant="ghost"
        size="icon"
        onClick={startTour}
        className="text-muted-foreground hover:text-foreground"
        title="Rever tour guiado"
        data-tour="help-button"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>
    </>
  );
}

export default AdminTour;
