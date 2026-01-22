import React, { createContext, useContext, ReactNode, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

// Use the database type directly
type Barbershop = Tables<"barbershops">;

interface BarbershopContextType {
  barbershop: Barbershop | null;
  isLoading: boolean;
  error: Error | null;
  slug: string | null;
  baseUrl: string;
}

const BarbershopContext = createContext<BarbershopContextType | undefined>(undefined);

interface BarbershopProviderProps {
  children: ReactNode;
  slug?: string;
}

export const BarbershopProvider: React.FC<BarbershopProviderProps> = ({ children, slug: propSlug }) => {
  const params = useParams<{ slug?: string }>();
  const queryClient = useQueryClient();
  
  // Slug da URL tem prioridade absoluta
  const currentSlug = propSlug || params.slug;
  
  // Ref para rastrear o último slug processado
  const lastSlugRef = useRef<string | null>(null);

  // RESET completo do cache quando o slug muda
  useEffect(() => {
    if (currentSlug && currentSlug !== lastSlugRef.current) {
      queryClient.resetQueries({ queryKey: ["barbershop-by-slug"] });
      queryClient.removeQueries({ queryKey: ["barbershop-by-slug", lastSlugRef.current] });
      lastSlugRef.current = currentSlug;
    }
  }, [currentSlug, queryClient]);

  // Query para buscar barbearia por slug
  const { data: barbershop, isLoading, error } = useQuery({
    queryKey: ["barbershop-by-slug", currentSlug],
    queryFn: async () => {
      if (!currentSlug) {
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from("barbershops")
        .select("*")
        .eq("slug", currentSlug)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      return data;
    },
    enabled: !!currentSlug,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  const baseUrl = currentSlug ? `/b/${currentSlug}` : "";

  return (
    <BarbershopContext.Provider 
      value={{ 
        barbershop, 
        isLoading, 
        error: error as Error | null,
        slug: currentSlug || null,
        baseUrl
      }}
    >
      {children}
    </BarbershopContext.Provider>
  );
};

export const useBarbershop = () => {
  const context = useContext(BarbershopContext);
  if (context === undefined) {
    throw new Error("useBarbershop must be used within a BarbershopProvider");
  }
  return context;
};

export { BarbershopContext };
