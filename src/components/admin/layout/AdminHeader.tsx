import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { NotificationDropdown } from "../NotificationDropdown";
import { AdminTour } from "../AdminTour";
import { useAuth } from "@/contexts/AuthContext";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { useNavigate, Link } from "react-router-dom";
import { Plus, User, Settings, LogOut, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
export function AdminHeader() {
  const {
    user,
    signOut
  } = useAuth();
  const {
    barbershop,
    baseUrl
  } = useBarbershopContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };
  const userInitials = user?.user_metadata?.full_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || user?.email?.slice(0, 2).toUpperCase() || "U";
  return <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-header px-6" data-tour="header">
      <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground" />
      <Separator orientation="vertical" className="h-6" />
      
      <AdminBreadcrumb />

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden md:block">
        
      </div>

      {/* Quick Action */}
      <Button asChild size="sm" className="hidden sm:flex gap-2" data-tour="quick-action">
        
      </Button>

      {/* Notifications */}
      <div data-tour="notifications">
        <NotificationDropdown />
      </div>

      {/* Tour Help Button */}
      <AdminTour barbershopId={barbershop?.id} />

      {/* Share Barbershop Link */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary"
            onClick={() => {
              const publicUrl = `${window.location.origin}${baseUrl}`;
              navigator.clipboard.writeText(publicUrl);
              toast.success("Link copiado!", {
                description: "Compartilhe este link com seus clientes para agendarem online."
              });
            }}
            data-tour="share-link"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden lg:inline">Divulgar Barbearia</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium">Link de Divulgação</p>
          <p className="text-xs text-muted-foreground">
            Clique para copiar o link público da sua barbearia e compartilhar com clientes
          </p>
        </TooltipContent>
      </Tooltip>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full" data-tour="user-menu">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.full_name || "Usuario"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/account" className="flex items-center cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Minha Conta
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to={`${baseUrl}/admin/settings/barbershop`} className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Configuracoes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>;
}
export default AdminHeader;