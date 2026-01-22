import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const useChat = (barbershopId?: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // SECURITY: Don't send userId in body - it's extracted from JWT token on the server
      const { data, error } = await supabase.functions.invoke("barbershop-chat", {
        body: {
          message: content,
          history: messages,
          barbershopId: barbershopId,
        },
      });

      if (error) throw error;

      // Add assistant response
      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Show success toast if booking was created
      if (data.bookingCreated) {
        toast.success("Agendamento confirmado! ✅", {
          description: "Você receberá uma notificação de lembrete.",
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Erro ao processar mensagem", {
        description: "Tente novamente em alguns instantes.",
      });
      
      // Add error message
      const errorMessage: Message = {
        role: "assistant",
        content: "Desculpe, tive um problema ao processar sua mensagem. Pode tentar novamente?",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    messages,
    isLoading,
    sendMessage,
  };
};