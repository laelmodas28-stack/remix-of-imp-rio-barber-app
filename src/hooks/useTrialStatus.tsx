import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, isAfter } from "date-fns";

export interface TrialStatus {
  isInTrial: boolean;
  trialExpired: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
  hasActiveSubscription: boolean;
  isLoading: boolean;
}

// Note: This hook requires a barbershop_subscriptions table that doesn't exist yet.
// For now, we return a default "active" status.
export const useTrialStatus = (barbershopId?: string): TrialStatus => {
  const { user } = useAuth();

  // Return default active status since barbershop_subscriptions table doesn't exist yet
  // TODO: Implement proper subscription checking when table is created
  const isLoading = false;

  if (!user || !barbershopId) {
    return {
      isInTrial: false,
      trialExpired: false,
      daysRemaining: 0,
      trialEndDate: null,
      hasActiveSubscription: false,
      isLoading,
    };
  }

  // Default to active subscription (no restrictions)
  return {
    isInTrial: false,
    trialExpired: false,
    daysRemaining: 0,
    trialEndDate: null,
    hasActiveSubscription: true,
    isLoading,
  };
};