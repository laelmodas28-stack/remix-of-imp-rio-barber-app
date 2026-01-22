import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { DataTable, Column } from "@/components/admin/shared/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, Upload, Phone, Mail, Calendar, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Client {
  id: string;
  client_id: string;
  created_at: string;
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  bookings_count: number;
  last_booking: string | null;
}

export function ClientsPage() {
  const { barbershop, baseUrl } = useBarbershopContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const createClientMutation = useMutation({
    mutationFn: async () => {
      if (!barbershop?.id) throw new Error("Barbearia não encontrada");
      if (!formData.name.trim()) throw new Error("Nome é obrigatório");
      
      // Create client directly in barbershop_clients with info stored there
      const { error: clientError } = await supabase
        .from("barbershop_clients")
        .insert({
          barbershop_id: barbershop.id,
          client_id: crypto.randomUUID(), // Generate a placeholder ID
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          notes: `Cliente cadastrado manualmente: ${formData.name.trim()}`,
        });
      
      if (clientError) throw clientError;
      
      return true;
    },
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      setIsDialogOpen(false);
      setFormData({ name: "", email: "", phone: "" });
    },
    onError: (error: any) => {
      console.error("Error creating client:", error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    },
  });

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["admin-clients", barbershop?.id],
    queryFn: async () => {
      if (!barbershop?.id) return [];
      
      // Get clients with their profile info
      const { data: clientsData, error: clientsError } = await supabase
        .from("barbershop_clients")
        .select("id, client_id, created_at, email, phone, notes")
        .eq("barbershop_id", barbershop.id);
      
      if (clientsError) throw clientsError;

      // Get profiles and bookings for each client
      const clientsWithStats = await Promise.all(
        (clientsData || []).map(async (client) => {
          // Get profile if client_id exists
          let profileData = null;
          if (client.client_id) {
            const { data } = await supabase
              .from("profiles")
              .select("full_name, phone, avatar_url")
              .eq("id", client.client_id)
              .single();
            profileData = data;
          }
          
          // Get bookings
          const { data: bookings } = await supabase
            .from("bookings")
            .select("id, booking_date")
            .eq("barbershop_id", barbershop.id)
            .eq("client_id", client.client_id)
            .order("booking_date", { ascending: false });
          
          return {
            ...client,
            profile: profileData ? {
              full_name: profileData.full_name,
              email: client.email,
              phone: profileData.phone || client.phone,
              avatar_url: profileData.avatar_url,
            } : {
              full_name: client.notes?.replace("Cliente cadastrado manualmente: ", "") || null,
              email: client.email,
              phone: client.phone,
              avatar_url: null,
            },
            bookings_count: bookings?.length || 0,
            last_booking: bookings?.[0]?.booking_date || null,
          };
        })
      );

      return clientsWithStats as Client[];
    },
    enabled: !!barbershop?.id,
  });

  const columns: Column<Client>[] = [
    {
      key: "profile",
      header: "Cliente",
      cell: (item) => (
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`${baseUrl}/admin/clients/${item.id}`);
          }}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={item.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {item.profile?.full_name?.charAt(0)?.toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-foreground hover:text-primary hover:underline">
              {item.profile?.full_name || "Cliente sem nome"}
            </p>
            {item.profile?.email && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {item.profile.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Telefone",
      cell: (item) => (
        <div className="flex items-center gap-2 text-sm">
          {item.profile?.phone ? (
            <>
              <Phone className="h-4 w-4 text-muted-foreground" />
              {item.profile.phone}
            </>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "bookings_count",
      header: "Agendamentos",
      sortable: true,
      cell: (item) => (
        <Badge variant="secondary" className="font-medium">
          {item.bookings_count}
        </Badge>
      ),
    },
    {
      key: "last_booking",
      header: "Ultimo Agendamento",
      sortable: true,
      cell: (item) => (
        <div className="flex items-center gap-2 text-sm">
          {item.last_booking ? (
            <>
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {format(parseISO(item.last_booking), "dd/MM/yyyy", { locale: ptBR })}
            </>
          ) : (
            <span className="text-muted-foreground">Nunca agendou</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Cliente desde",
      sortable: true,
      cell: (item) => (
        <span className="text-sm text-muted-foreground">
          {format(parseISO(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="gap-2">
              <a href={`${baseUrl}/admin/imports/clients`}>
                <Upload className="h-4 w-4" />
                Importar
              </a>
            </Button>
            <Button className="gap-2" onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </div>
        }
      />

      <DataTable
        data={clients}
        columns={columns}
        isLoading={isLoading}
        searchable
        searchPlaceholder="Buscar por nome, email ou telefone..."
        searchKeys={["profile.full_name", "profile.email", "profile.phone"]}
        pageSize={10}
        onRowClick={(client) => navigate(`${baseUrl}/admin/clients/${client.id}`)}
        emptyState={{
          icon: Users,
          title: "Nenhum cliente cadastrado",
          description: "Comece importando seus clientes ou eles serao adicionados automaticamente ao agendar.",
          action: {
            label: "Importar Clientes",
            onClick: () => navigate(`${baseUrl}/admin/imports/clients`),
            icon: Upload,
          },
        }}
      />

      {/* Add Client Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente na barbearia
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); createClientMutation.mutate(); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createClientMutation.isPending}>
                {createClientMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ClientsPage;
