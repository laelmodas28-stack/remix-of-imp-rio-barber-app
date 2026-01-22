import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle - Dropdown menu for selecting theme mode
 * 
 * Provides Light / Dark / System options with visual indicators.
 * Shows current resolved theme icon (sun/moon) in the trigger button.
 */
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9">
        <Sun className="h-4 w-4" />
        <span className="sr-only">Alternar tema</span>
      </Button>
    );
  }

  const themes = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themes.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              theme === value && "bg-accent"
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {theme === value && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * ThemeSelector - Full settings panel for theme selection with preview cards
 * 
 * Use this in settings pages for a more visual theme selection experience.
 */
export function ThemeSelector() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  const themes = [
    {
      value: "light",
      label: "Claro",
      icon: Sun,
      preview: {
        bg: "bg-white",
        surface: "bg-gray-100",
        text: "text-gray-900",
        accent: "bg-amber-500",
      },
    },
    {
      value: "dark",
      label: "Escuro",
      icon: Moon,
      preview: {
        bg: "bg-zinc-900",
        surface: "bg-zinc-800",
        text: "text-white",
        accent: "bg-amber-500",
      },
    },
    {
      value: "system",
      label: "Sistema",
      icon: Monitor,
      preview: {
        bg: "bg-gradient-to-br from-white to-zinc-900",
        surface: "bg-gradient-to-br from-gray-100 to-zinc-800",
        text: "text-gray-500",
        accent: "bg-amber-500",
      },
    },
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Tema do Aplicativo
      </label>
      <div className="grid grid-cols-3 gap-3">
        {themes.map(({ value, label, icon: Icon, preview }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
              theme === value
                ? "border-primary shadow-gold"
                : "border-border hover:border-primary/50"
            )}
          >
            {theme === value && (
              <div className="absolute -top-1.5 -right-1.5 bg-primary rounded-full p-0.5">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}

            {/* Mini preview */}
            <div
              className={cn(
                "w-full h-12 rounded-md overflow-hidden flex items-center justify-center",
                preview.bg
              )}
            >
              <div
                className={cn(
                  "w-8 h-6 rounded-sm flex items-center justify-center",
                  preview.surface
                )}
              >
                <div className={cn("w-4 h-1 rounded-full", preview.accent)} />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">{label}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {theme === "system"
          ? `Seguindo preferência do sistema (${resolvedTheme === "dark" ? "escuro" : "claro"})`
          : `Tema ${theme === "dark" ? "escuro" : "claro"} ativo`}
      </p>
    </div>
  );
}
