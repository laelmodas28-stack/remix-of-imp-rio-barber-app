import { ReactNode } from "react";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, Plus } from "lucide-react";

interface AdminPageScaffoldProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actions?: ReactNode;
  children?: ReactNode;
}

export function AdminPageScaffold({
  title,
  subtitle,
  icon: Icon,
  actionLabel,
  onAction,
  actions,
  children,
}: AdminPageScaffoldProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          actions || (actionLabel && onAction ? (
            <Button onClick={onAction} className="gap-2">
              <Plus className="h-4 w-4" />
              {actionLabel}
            </Button>
          ) : undefined)
        }
      />

      {children || (
        <Card className="card-elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>{subtitle}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Esta pagina esta em desenvolvimento
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AdminPageScaffold;
