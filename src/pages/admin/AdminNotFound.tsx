import { useNavigate } from "react-router-dom";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, ArrowLeft, Home } from "lucide-react";

export function AdminNotFound() {
  const navigate = useNavigate();
  const { baseUrl } = useBarbershopContext();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="card-elevated max-w-md w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Pagina nao encontrada</h2>
              <p className="text-sm text-muted-foreground mt-2">
                A pagina que voce esta procurando nao existe ou foi removida.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <Button onClick={() => navigate(`${baseUrl}/admin`)} className="gap-2">
                <Home className="h-4 w-4" />
                Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminNotFound;
