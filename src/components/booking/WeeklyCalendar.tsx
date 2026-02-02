import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface WeeklyCalendarProps {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
}

export const WeeklyCalendar = ({ selected, onSelect, disabled }: WeeklyCalendarProps) => {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const goToPreviousWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  const canGoPrevious = !isBefore(addDays(weekStart, -1), startOfDay(new Date()));

  return (
    <div className="space-y-4">
      {/* Header com navegação */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousWeek}
          disabled={!canGoPrevious}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-medium text-muted-foreground">
          {format(weekStart, "MMMM yyyy", { locale: ptBR })}
        </span>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextWeek}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dias da semana */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {weekDays.map((day) => {
          const isSelected = selected && isSameDay(day, selected);
          const isDisabled = disabled?.(day) ?? false;
          const dayIsToday = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !isDisabled && onSelect(day)}
              disabled={isDisabled}
              className={cn(
                "flex flex-col items-center justify-center p-1 sm:p-2 rounded-lg transition-all",
                "min-h-[60px] sm:min-h-[72px] border sm:border-2",
                isDisabled && "opacity-40 cursor-not-allowed",
                !isDisabled && !isSelected && "hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                isSelected && "border-primary bg-primary text-primary-foreground",
                !isSelected && "border-border bg-card",
                dayIsToday && !isSelected && "border-primary/30"
              )}
            >
              <span className={cn(
                "text-[10px] sm:text-xs uppercase font-medium",
                isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
              )}>
                {format(day, "EEE", { locale: ptBR })}
              </span>
              <span className={cn(
                "text-base sm:text-xl font-bold",
                isSelected ? "text-primary-foreground" : "text-foreground"
              )}>
                {format(day, "d")}
              </span>
              {dayIsToday && (
                <span className={cn(
                  "text-[8px] sm:text-[10px] uppercase font-medium",
                  isSelected ? "text-primary-foreground/80" : "text-primary"
                )}>
                  Hoje
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
