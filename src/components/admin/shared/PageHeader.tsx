import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  backButton?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
}

export function PageHeader({ title, subtitle, actions, backButton }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        {backButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={backButton.onClick}
            className="-ml-2 mb-2 w-fit gap-2 text-muted-foreground hover:text-foreground"
          >
            {backButton.icon && <backButton.icon className="h-4 w-4" />}
            {backButton.label}
          </Button>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

export default PageHeader;
