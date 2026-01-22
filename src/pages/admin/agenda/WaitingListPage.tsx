import { useState } from "react";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Phone, User, CheckCircle, AlertCircle } from "lucide-react";

export function WaitingListPage() {
  const { barbershop } = useBarbershopContext();

  if (!barbershop?.id) {
    return (
      <AdminPageScaffold 
        title="Lista de Espera" 
        subtitle="Clientes aguardando disponibilidade" 
        icon={Clock} 
      />
    );
  }

  return (
    <AdminPageScaffold
      title="Lista de Espera"
      subtitle="Clientes aguardando disponibilidade de horário"
      icon={Clock}
      actions={
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar à Lista
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Aguardando</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Phone className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Contatados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Agendados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Clientes na Lista</CardTitle>
            <CardDescription>Gerencie os clientes aguardando disponibilidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-1">Funcionalidade em Desenvolvimento</h3>
              <p className="text-sm text-muted-foreground mb-4">
                A lista de espera estará disponível em breve. Esta funcionalidade permitirá 
                gerenciar clientes que aguardam disponibilidade de horário.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageScaffold>
  );
}

export default WaitingListPage;
