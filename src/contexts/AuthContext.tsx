import { createContext, useContext, useEffect, useState } from "react";
import { AuthUser as User, AuthSession as Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      // Usar slug de origem se disponível para redirect correto (localStorage para persistência)
      const originSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");
      const redirectUrl = originSlug 
        ? `${window.location.origin}/b/${originSlug}`
        : `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      toast.success("Cadastro realizado com sucesso!");
      return { error: null };
    } catch (error: any) {
      toast.error("Erro ao criar conta");
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Email ou senha incorretos");
        return { error };
      }

      toast.success("Login realizado com sucesso!");
      // Não navegar automaticamente - deixar o componente decidir
      return { error: null };
    } catch (error: any) {
      toast.error("Erro ao fazer login");
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Preservar slug de origem antes do logout (localStorage para persistência)
      const originSlug = localStorage.getItem("origin_barbershop_slug") || sessionStorage.getItem("origin_barbershop_slug");
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso");
      // Redirecionar para auth da barbearia se houver contexto
      if (originSlug) {
        navigate(`/b/${originSlug}/auth`);
      } else {
        navigate("/auth");
      }
    } catch (error) {
      toast.error("Erro ao sair");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
