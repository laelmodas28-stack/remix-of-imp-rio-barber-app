import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  barbershopName: string;
  mensagemPersonalizada: string;
  tempoLembrete: number;
  customerName: string;
  service: string;
  startTime: string;
  barberName: string;
  notes?: string;
  bookingDate: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      barbershopName,
      mensagemPersonalizada,
      tempoLembrete,
      customerName,
      service,
      startTime,
      barberName,
      notes,
      bookingDate,
    }: MessageRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Construir o prompt com as variáveis
    const systemPrompt = `Você é o assistente oficial do aplicativo Império Barber.

Este aplicativo é utilizado por várias barbearias diferentes.  
Sempre personalize as mensagens usando as informações abaixo:

Dados da Barbearia:
- Nome da barbearia: ${barbershopName}
- Mensagem personalizada da barbearia: "${mensagemPersonalizada}"
- Tempo de lembrete configurado (em minutos): ${tempoLembrete}

Dados do Agendamento:
- Nome do cliente: ${customerName}
- Serviço agendado: ${service}
- Data do atendimento: ${bookingDate}
- Horário do atendimento: ${startTime}
- Nome do barbeiro: ${barberName}
- Observações: ${notes || "Nenhuma observação"}

Sua tarefa é gerar automaticamente TRÊS tipos de mensagens:

1) **Mensagem de Confirmação para o Cliente**  
Gerar uma mensagem moderna, simpática e profissional confirmando:  
- Serviço  
- Horário  
- Nome do barbeiro  
- Mensagem personalizada da barbearia  
Texto acolhedor e claro.

2) **Mensagem de Notificação para o Barbeiro**  
Texto objetivo e profissional contendo:  
- Nome do cliente  
- Serviço marcado  
- Horário exato  
- Observações do cliente (se houver)

3) **Mensagem de Lembrete para o Cliente (${tempoLembrete} minutos antes)**  
Criar um lembrete amigável e curto, avisando o cliente sobre o horário marcado,  
usando também a mensagem personalizada da barbearia.  
O lembrete deve seguir o tempo configurado pela barbearia:  
"${tempoLembrete} minutos antes".

⚠️ RETORNO OBRIGATÓRIO:
Responda SEMPRE em JSON exatamente neste formato:

{
  "confirmacao_cliente": "mensagem de confirmação para o cliente",
  "notificacao_barbeiro": "mensagem para o barbeiro",
  "lembrete_cliente": "mensagem de lembrete para o cliente"
}

Não adicione nada antes ou depois do JSON.
Não quebre o formato JSON.`;

    console.log("Chamando Lovable AI para gerar mensagens...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Gere as três mensagens agora." }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit excedido. Tente novamente em alguns instantes." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos ao seu workspace Lovable." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices?.[0]?.message?.content;

    if (!generatedText) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("Resposta da IA:", generatedText);

    // Parsear JSON da resposta
    let messages;
    try {
      // Remover possíveis markdown code blocks
      const cleanedText = generatedText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      messages = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Erro ao parsear JSON:", parseError, "Texto:", generatedText);
      throw new Error("Formato de resposta inválido da IA");
    }

    // Validar formato
    if (!messages.confirmacao_cliente || !messages.notificacao_barbeiro || !messages.lembrete_cliente) {
      throw new Error("Mensagens incompletas geradas pela IA");
    }

    return new Response(
      JSON.stringify({
        success: true,
        messages: {
          clientConfirmation: messages.confirmacao_cliente,
          barberNotification: messages.notificacao_barbeiro,
          clientReminder: messages.lembrete_cliente,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Erro ao gerar mensagens:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao gerar mensagens",
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
