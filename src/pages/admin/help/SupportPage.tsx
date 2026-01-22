import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, MessageCircle, Mail, Phone, ExternalLink, FileQuestion } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: "Agendamentos",
    question: "Como cancelar um agendamento?",
    answer: "Acesse a página de Agendamentos, encontre o agendamento desejado e clique no botão de cancelar. Você também pode alterar o status diretamente na visualização de calendário.",
  },
  {
    category: "Agendamentos",
    question: "Como configurar os horários de atendimento?",
    answer: "Vá em Configurações > Perfil da Barbearia e configure os horários de funcionamento para cada dia da semana. Você pode definir horários diferentes para cada dia.",
  },
  {
    category: "Profissionais",
    question: "Como adicionar um novo barbeiro?",
    answer: "Acesse Profissionais > Lista de Profissionais e clique em 'Novo Profissional'. Preencha os dados e configure as especialidades e horários de atendimento.",
  },
  {
    category: "Profissionais",
    question: "Como definir comissões para os profissionais?",
    answer: "Na página do profissional, você pode definir a porcentagem de comissão. O sistema calculará automaticamente os valores nas páginas de Finanças.",
  },
  {
    category: "Finanças",
    question: "Como gerar relatórios financeiros?",
    answer: "Acesse Relatórios > Receita para visualizar gráficos e métricas. Você pode exportar os dados em CSV ou JSON através da Central de Exportação.",
  },
  {
    category: "Clientes",
    question: "Como segmentar meus clientes?",
    answer: "Acesse Clientes > Segmentos para criar tags e grupos. Você pode usar essas segmentações para campanhas de marketing e análises de retenção.",
  },
  {
    category: "Configurações",
    question: "Como personalizar o tema da minha página?",
    answer: "Em Configurações > Perfil da Barbearia, você pode alterar o logo, cores e informações que aparecem na página pública da sua barbearia.",
  },
];

const WHATSAPP_NUMBER = "5511969332465";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Preciso de ajuda com o Império App.")}`;

const CONTACT_OPTIONS = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    description: "(11) 96933-2465",
    action: "Falar no WhatsApp",
    available: true,
    href: WHATSAPP_URL,
  },
  {
    icon: Mail,
    title: "E-mail",
    description: "Imperiobarber92@gmail.com",
    action: "Enviar E-mail",
    available: true,
    href: "mailto:Imperiobarber92@gmail.com",
  },
  {
    icon: Phone,
    title: "Telefone",
    description: "(11) 96933-2465",
    action: "Ligar Agora",
    available: true,
    href: "tel:+5511969332465",
  },
];

export function SupportPage() {
  const { barbershop } = useBarbershopContext();

  const groupedFAQ = FAQ_ITEMS.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  if (!barbershop?.id) {
    return <AdminPageScaffold title="Suporte" subtitle="Entre em contato com nossa equipe" icon={HelpCircle} />;
  }

  return (
    <AdminPageScaffold
      title="Suporte"
      subtitle="Entre em contato com nossa equipe de suporte"
      icon={HelpCircle}
    >
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CONTACT_OPTIONS.map((option, index) => (
            <Card key={index} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <option.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{option.description}</p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <a href={option.href} target="_blank" rel="noopener noreferrer">
                        {option.action}
                        <ExternalLink className="w-3 h-3 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="w-5 h-5" />
              Perguntas Frequentes
            </CardTitle>
            <CardDescription>Encontre respostas para as dúvidas mais comuns</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(groupedFAQ).map(([category, items]) => (
                <div key={category} className="mb-4">
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
                  {items.map((item, index) => (
                    <AccordionItem key={index} value={`${category}-${index}`}>
                      <AccordionTrigger className="text-left text-sm">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </div>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AdminPageScaffold>
  );
}

export default SupportPage;
