import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AVAILABLE_THEMES } from "@/lib/themes";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  currentTheme: string;
  onThemeChange: (themeColor: string) => void;
}

const ThemeSelector = ({ currentTheme, onThemeChange }: ThemeSelectorProps) => {
  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle>Tema do App</CardTitle>
        <CardDescription>
          Escolha o esquema de cores que melhor representa sua barbearia
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {AVAILABLE_THEMES.map((theme) => {
            const isSelected = currentTheme === theme.primaryColor;
            
            return (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.primaryColor)}
                className={cn(
                  "relative rounded-lg border-2 p-4 transition-all hover:scale-105",
                  isSelected
                    ? "border-primary shadow-lg"
                    : "border-border hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* Preview */}
                <div className="mb-3 h-20 rounded-md bg-black flex items-center justify-center border-2"
                  style={{ borderColor: theme.primaryColor }}
                >
                  <div 
                    className="text-2xl font-bold"
                    style={{ color: theme.primaryColor }}
                  >
                    Aa
                  </div>
                </div>

                {/* Theme Info */}
                <h3 className="font-semibold text-lg mb-1">{theme.name}</h3>
                <p className="text-xs text-muted-foreground">{theme.description}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSelector;
