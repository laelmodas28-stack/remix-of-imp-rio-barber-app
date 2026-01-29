import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, isAfter, startOfDay } from "date-fns";

export interface BarbershopSubscription {
  id: string;
  barbershop_id: string;
  plan_type: string;
  status: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  asaas_customer_id: string | null;
  asaas_payment_id: string | null;
  asaas_payment_link: string | null;
  payment_method: string | null;
  payment_value: number | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrialStatus {
  isInTrial: boolean;
  trialExpired: boolean;
  daysRemaining: number;
  trialEndDate: Date | null;
  hasActiveSubscription: boolean;
  isLoading: boolean;
  subscription: BarbershopSubscription | null;
  trialSubscription: BarbershopSubscription | null;
  refetch: () => void;
}

export const useTrialStatus = (barbershopId?: string): TrialStatus => {
  const { user } = useAuth();

  // Fetch ALL subscriptions for this barbershop to analyze properly
  const { data: subscriptions, isLoading, refetch } = useQuery({
    queryKey: ["barbershop-subscriptions-all", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;

      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching subscriptions:", error);
        return null;
      }

      return data as BarbershopSubscription[];
    },
    enabled: !!barbershopId && !!user,
  });

  const defaultReturn = {
    isInTrial: false,
    trialExpired: false,
    daysRemaining: 0,
    trialEndDate: null,
    hasActiveSubscription: false,
    isLoading,
    subscription: null,
    trialSubscription: null,
    refetch: () => {},
  };

  if (!user || !barbershopId || isLoading) {
    return defaultReturn;
  }

  // No subscriptions found - system should be blocked
  if (!subscriptions || subscriptions.length === 0) {
    return {
      ...defaultReturn,
      trialExpired: true, // No subscription = blocked
      isLoading: false,
      refetch,
    };
  }

  const now = new Date();

  // Find the most recent subscription for display purposes
  const latestSubscription = subscriptions[0];

  // PRIORITY 1: Find any PAID and ACTIVE subscription (status = 'active' with paid_at set)
  const paidActiveSubscription = subscriptions.find(s => 
    s.status === 'active' && 
    s.paid_at && 
    s.subscription_ends_at && 
    isAfter(new Date(s.subscription_ends_at), now)
  );

  // If has a paid active subscription - system is fully unlocked
  if (paidActiveSubscription) {
    const endDate = new Date(paidActiveSubscription.subscription_ends_at!);
    return {
      isInTrial: false,
      trialExpired: false,
      daysRemaining: differenceInDays(endDate, now),
      trialEndDate: null,
      hasActiveSubscription: true,
      isLoading: false,
      subscription: paidActiveSubscription,
      trialSubscription: null,
      refetch,
    };
  }

  // PRIORITY 2: Find any valid trial subscription (status = 'trial' with valid trial_ends_at)
  const trialSubscription = subscriptions.find(s => 
    s.status === 'trial' && 
    s.trial_ends_at && 
    isAfter(new Date(s.trial_ends_at), now)
  );

  // If has valid trial - system is accessible
  if (trialSubscription && trialSubscription.trial_ends_at) {
    const trialEndDate = new Date(trialSubscription.trial_ends_at);
    // Use startOfDay to calculate full remaining days (including today)
    // This ensures if you register today, you see 7 days, not 6
    const daysLeft = differenceInDays(startOfDay(trialEndDate), startOfDay(now)) + 1;
    return {
      isInTrial: true,
      trialExpired: false,
      daysRemaining: Math.max(daysLeft, 0),
      trialEndDate,
      hasActiveSubscription: true, // Trial counts as active for access
      isLoading: false,
      subscription: latestSubscription,
      trialSubscription,
      refetch,
    };
  }

  // PRIORITY 3: Check if there was a trial that has now expired
  const expiredTrial = subscriptions.find(s => 
    s.status === 'trial' && 
    s.trial_ends_at && 
    !isAfter(new Date(s.trial_ends_at), now)
  );

  // Also check any subscription with trial_ends_at that has passed
  const anyExpiredTrialEnd = subscriptions.find(s => 
    s.trial_ends_at && 
    !isAfter(new Date(s.trial_ends_at), now)
  );

  const relevantExpiredTrial = expiredTrial || anyExpiredTrialEnd;
  const trialEndDate = relevantExpiredTrial?.trial_ends_at 
    ? new Date(relevantExpiredTrial.trial_ends_at) 
    : null;

  // No active paid subscription and no valid trial = blocked
  return {
    isInTrial: false,
    trialExpired: true,
    daysRemaining: 0,
    trialEndDate,
    hasActiveSubscription: false,
    isLoading: false,
    subscription: latestSubscription,
    trialSubscription: expiredTrial || null,
    refetch,
  };
};
