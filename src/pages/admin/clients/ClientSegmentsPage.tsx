import { useState } from "react";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tags, Plus, Users, AlertCircle } from "lucide-react";

export function ClientSegmentsPage() {
  const { barbershop } = useBarbershopContext();

  if (!barbershop?.id) {
    return (
      <div className="space-y-6">
        <PageHeader title="Segmentos" subtitle="Tags e segmentação de clientes" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segmentos"
        subtitle="Tags e segmentação de clientes para campanhas e análises"
        actions={
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Segmento
          </Button>
        }
      />

      <Card className="card-elevated">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Funcionalidade em Desenvolvimento</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-md">
            A segmentação de clientes estará disponível em breve. Esta funcionalidade
            permitirá criar tags personalizadas para organizar seus clientes por categoria,
            frequência ou preferências.
          </p>
          <div className="flex gap-4 flex-wrap justify-center">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Tags className="h-5 w-5 text-primary" />
              <span className="text-sm">Segmentos Personalizados</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm">Agrupamento Automático</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ClientSegmentsPage;
