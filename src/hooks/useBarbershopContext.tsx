import { useContext } from "react";
import { BarbershopContext } from "@/contexts/BarbershopContext";

/**
 * Hook para acessar o contexto da barbearia.
 * 
 * LÓGICA SIMPLIFICADA:
 * - Se está em rota /b/:slug → usa o BarbershopProvider (dados do slug da URL)
 * - Se está em rota global → retorna null (cada página global gerencia seu próprio contexto)
 */
export const useBarbershopContext = () => {
  // Verificar se estamos dentro de um BarbershopProvider
  const contextValue = useContext(BarbershopContext);
  
  // SEMPRE usar o contexto quando disponível
  if (contextValue) {
    return {
      barbershop: contextValue.barbershop,
      isLoading: contextValue.isLoading,
      error: contextValue.error,
      baseUrl: contextValue.baseUrl
    };
  }
  
  // Só retorna null se não houver contexto (rotas sem BarbershopProvider)
  return {
    barbershop: null,
    isLoading: false,
    error: null,
    baseUrl: ""
  };
};
