import { Crown } from "lucide-react";

interface BarbershopLoaderProps {
  logoUrl?: string | null;
  name?: string;
  message?: string;
}

const BarbershopLoader = ({ logoUrl, name, message }: BarbershopLoaderProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {/* Logo com animação de pulse e glow */}
      <div className="relative animate-fade-in">
        {/* Glow effect */}
        <div className="absolute inset-0 blur-2xl opacity-30 bg-primary rounded-full scale-150 animate-pulse" />
        
        {/* Logo container com animação */}
        <div className="relative animate-[pulse_2s_ease-in-out_infinite]">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={name || "Barbearia"} 
              className="w-28 h-28 object-contain drop-shadow-[0_0_25px_hsl(var(--primary)/0.5)]"
            />
          ) : (
            <div className="w-28 h-28 bg-primary/20 rounded-full flex items-center justify-center border border-primary/30">
              <Crown className="w-14 h-14 text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Nome com fade in */}
      {name && (
        <h2 className="mt-6 text-xl font-semibold text-foreground animate-fade-in" style={{ animationDelay: "0.1s" }}>
          {name}
        </h2>
      )}

      {/* Loading dots */}
      <div className="flex gap-1.5 mt-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>

      {/* Mensagem opcional */}
      {message && (
        <p className="mt-4 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "0.3s" }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default BarbershopLoader;
