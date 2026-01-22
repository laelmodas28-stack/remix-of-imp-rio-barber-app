import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import imperioLogo from "@/assets/imperio-logo.webp";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="animate-in fade-in zoom-in duration-700">
        <img 
          src={imperioLogo} 
          alt="IMPÉRIO BARBER" 
          className="w-48 h-48 md:w-64 md:h-64 mb-8 drop-shadow-[0_0_30px_rgba(212,175,55,0.5)]"
        />
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        IMPÉRIO BARBER
      </h1>
      <p className="text-muted-foreground text-lg animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
        Bem-vindo à excelência
      </p>
    </div>
  );
};

export default Splash;
