import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, isAfter } from "date-fns";

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
  refetch: () => void;
}

export const useTrialStatus = (barbershopId?: string): TrialStatus => {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ["barbershop-subscription", barbershopId],
    queryFn: async () => {
      if (!barbershopId) return null;

      const { data, error } = await supabase
        .from("barbershop_subscriptions")
        .select("*")
        .eq("barbershop_id", barbershopId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        return null;
      }

      return data as BarbershopSubscription | null;
    },
    enabled: !!barbershopId && !!user,
  });

  if (!user || !barbershopId || isLoading) {
    return {
      isInTrial: false,
      trialExpired: false,
      daysRemaining: 0,
      trialEndDate: null,
      hasActiveSubscription: false,
      isLoading,
      subscription: null,
      refetch: () => {},
    };
  }

  // No subscription found - consider as expired (should have trial from registration)
  if (!subscription) {
    return {
      isInTrial: false,
      trialExpired: true, // No subscription = expired/blocked
      daysRemaining: 0,
      trialEndDate: null,
      hasActiveSubscription: false,
      isLoading: false,
      subscription: null,
      refetch,
    };
  }

  const now = new Date();
  
  // Check if subscription is active
  if (subscription.status === 'active' && subscription.subscription_ends_at) {
    const endDate = new Date(subscription.subscription_ends_at);
    const hasActive = isAfter(endDate, now);
    
    return {
      isInTrial: false,
      trialExpired: false,
      daysRemaining: hasActive ? differenceInDays(endDate, now) : 0,
      trialEndDate: null,
      hasActiveSubscription: hasActive,
      isLoading: false,
      subscription,
      refetch,
    };
  }

  // Check if in trial
  if (subscription.status === 'trial' && subscription.trial_ends_at) {
    const trialEndDate = new Date(subscription.trial_ends_at);
    const isInTrial = isAfter(trialEndDate, now);
    const daysRemaining = isInTrial ? differenceInDays(trialEndDate, now) : 0;

    return {
      isInTrial,
      trialExpired: !isInTrial,
      daysRemaining,
      trialEndDate,
      hasActiveSubscription: isInTrial, // Trial counts as active
      isLoading: false,
      subscription,
      refetch,
    };
  }

  // Expired, pending payment, or any other status without active subscription
  // Check if trial_ends_at exists and has passed
  const trialEndDate = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialHasExpired = trialEndDate ? !isAfter(trialEndDate, now) : true;

  return {
    isInTrial: false,
    trialExpired: trialHasExpired || subscription.status === 'expired',
    daysRemaining: 0,
    trialEndDate,
    hasActiveSubscription: false,
    isLoading: false,
    subscription,
    refetch,
  };
};
