import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AdminPageScaffold } from "@/components/admin/shared/AdminPageScaffold";
import { UserCircle, Star, MoreVertical, Pencil, Trash2, Crown, AlertTriangle } from "lucide-react";
import { useBarbershop } from "@/hooks/useBarbershop";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useProfessionalLimit, getProfessionalLimitMessage } from "@/hooks/useProfessionalLimit";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProfessionalForm from "@/components/admin/ProfessionalForm";

interface Professional {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  rating: number | null;
  specialties: string[] | null;
  is_active: boolean | null;
}

export function ProfessionalsListPage() {
  const { barbershop } = useBarbershop();
  const { baseUrl } = useBarbershopContext();
  const { currentCount, maxAllowed, canAddMore, planName, isLoading: isLoadingLimit } = useProfessionalLimit(barbershop?.id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [deletingProfessional, setDeletingProfessional] = useState<Professional | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: professionals, isLoading, refetch } = useQuery({
    queryKey: ["professionals", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      const { data, error } = await supabase
        .from("professionals")
        .select("*")
        .eq("barbershop_id", barbershop.id)
        .order("name");
      if (error) throw error;
      return data as Professional[];
    },
    enabled: !!barbershop?.id,
  });

  const handleEdit = (prof: Professional) => {
    setEditingProfessional(prof);
    setIsModalOpen(true);
  };

  const handleNew = () => {
    if (!canAddMore) {
      toast.error(`Limite de profissionais atingido. O plano ${planName} permite apenas ${maxAllowed} profissional${maxAllowed && maxAllowed > 1 ? 'is' : ''}.`);
      return;
    }
    setEditingProfessional(null);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProfessional) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from("professionals")
      .delete()
      .eq("id", deletingProfessional.id);
    
    if (error) {
      if (error.code === "23503") {
        toast.error("Não é possível excluir: profissional tem agendamentos vinculados");
      } else {
        toast.error("Erro ao excluir profissional");
      }
    } else {
      toast.success("Profissional excluído");
      refetch();
    }
    setIsDeleting(false);
    setDeletingProfessional(null);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    setEditingProfessional(null);
    refetch();
  };

  return (
    <>
      <AdminPageScaffold
        title="Equipe"
        subtitle="Profissionais cadastrados na barbearia"
        icon={UserCircle}
        actionLabel={canAddMore ? "Novo Profissional" : undefined}
        onAction={canAddMore ? handleNew : undefined}
      >
        {/* Plan limit info */}
        <Alert className={!canAddMore ? "border-destructive bg-destructive/10 mb-6" : "border-primary/30 bg-primary/5 mb-6"}>
          <div className="flex items-center gap-2">
            {!canAddMore ? (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            ) : (
              <Crown className="h-4 w-4 text-primary" />
            )}
            <AlertDescription className={!canAddMore ? "text-destructive" : "text-foreground"}>
              {getProfessionalLimitMessage(currentCount, maxAllowed, planName)}
              {!canAddMore && (
                <Button variant="link" asChild className="ml-2 p-0 h-auto text-primary">
                  <Link to={`${baseUrl}/planos`}>Fazer upgrade</Link>
                </Button>
              )}
            </AlertDescription>
          </div>
        </Alert>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : professionals && professionals.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {professionals.map((prof) => (
              <Card key={prof.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={prof.photo_url || undefined} />
                        <AvatarFallback>{prof.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{prof.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          {prof.rating?.toFixed(1) || "5.0"}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(prof)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeletingProfessional(prof)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {prof.specialties && prof.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {prof.specialties.slice(0, 3).map((spec, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Badge 
                    variant={prof.is_active ? "default" : "outline"} 
                    className="mt-3"
                  >
                    {prof.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="card-elevated">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum profissional cadastrado</p>
              <Button className="mt-4" onClick={handleNew}>
                Adicionar Primeiro Profissional
              </Button>
            </CardContent>
          </Card>
        )}
      </AdminPageScaffold>

      <Sheet open={isModalOpen} onOpenChange={setIsModalOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingProfessional ? "Editar Profissional" : "Novo Profissional"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <ProfessionalForm 
              onSuccess={handleSuccess} 
              professional={editingProfessional}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingProfessional} onOpenChange={() => setDeletingProfessional(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O profissional "{deletingProfessional?.name}" será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ProfessionalsListPage;
