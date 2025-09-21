import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StripeAccountStatus {
  id?: string;
  stripe_account_id?: string;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  account_status: string;
  requirements_pending?: string[];
  updated_at?: string;
  details_submitted?: boolean;
  capabilities?: any;
  country?: string;
  default_currency?: string;
  external_account_id?: string;
  user_id?: string;
  created_at?: string;
}

interface PayoutEligibility {
  isEligible: boolean;
  pendingAmount: number;
  minimumRequired: number;
}

export const ProducerStatusIndicator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<StripeAccountStatus>({
    onboarding_complete: false,
    charges_enabled: false,
    payouts_enabled: false,
    account_status: 'not_setup'
  });
  const [payoutEligibility, setPayoutEligibility] = useState<PayoutEligibility>({
    isEligible: false,
    pendingAmount: 0,
    minimumRequired: 10
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProducerStatus();
    }
  }, [user]);

  const fetchProducerStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch Stripe account status
      const { data: stripeData, error: stripeError } = await supabase
        .from('producer_stripe_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (stripeError) {
        console.error('Error fetching Stripe status:', stripeError);
      }

      if (stripeData) {
        setStatus({
          ...stripeData,
          charges_enabled: (stripeData as any).charges_enabled || false,
          payouts_enabled: (stripeData as any).payouts_enabled || false
        });
      }

      // Check payout eligibility
      const { data: eligibilityData, error: eligibilityError } = await supabase
        .rpc('is_payout_eligible', { p_producer_id: user.id });

      if (eligibilityError) {
        console.error('Error checking payout eligibility:', eligibilityError);
      }

      // Get pending earnings amount
      const { data: pendingData, error: pendingError } = await supabase
        .rpc('get_producer_pending_earnings', { p_producer_id: user.id });

      if (pendingError) {
        console.error('Error fetching pending earnings:', pendingError);
      }

      setPayoutEligibility({
        isEligible: eligibilityData || false,
        pendingAmount: pendingData || 0,
        minimumRequired: 10
      });

    } catch (error) {
      console.error('Error fetching producer status:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    if (!user || !status.stripe_account_id) return;

    try {
      setRefreshing(true);

      // Call edge function to refresh Stripe account status
      const { data, error } = await supabase.functions.invoke('update-stripe-account-status', {
        body: { accountId: status.stripe_account_id }
      });

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Stripe account status has been refreshed.",
      });

      // Refresh local data
      await fetchProducerStatus();

    } catch (error: any) {
      console.error('Error refreshing status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh account status.",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const setupStripeConnect = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;

      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        
        toast({
          title: "Stripe Connect Setup",
          description: "Complete your setup in the new tab to start receiving payouts.",
        });
      }
    } catch (error: any) {
      console.error('Error setting up Stripe Connect:', error);
      toast({
        title: "Error",
        description: "Failed to setup Stripe Connect. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = () => {
    if (status.onboarding_complete && (status.charges_enabled || false) && (status.payouts_enabled || false)) {
      return "default";
    }
    if (status.onboarding_complete) {
      return "secondary";
    }
    return "destructive";
  };

  const getStatusText = () => {
    if (status.onboarding_complete && (status.charges_enabled || false) && (status.payouts_enabled || false)) {
      return "Active";
    }
    if (status.onboarding_complete) {
      return "Pending Review";
    }
    return "Setup Required";
  };

  const getStatusIcon = () => {
    if (status.onboarding_complete && (status.charges_enabled || false) && (status.payouts_enabled || false)) {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (status.onboarding_complete) {
      return <Clock className="w-4 h-4" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Payout Status</span>
          <Badge variant={getStatusColor()} className="flex items-center gap-1">
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pending Earnings</span>
            <span className="font-semibold">£{payoutEligibility.pendingAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Minimum Payout</span>
            <span className="text-sm">£{payoutEligibility.minimumRequired.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Payout Eligible</span>
            <Badge variant={payoutEligibility.isEligible ? "default" : "secondary"}>
              {payoutEligibility.isEligible ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          {!status.onboarding_complete ? (
            <Button onClick={setupStripeConnect} className="flex-1">
              Setup Stripe Connect
            </Button>
          ) : (
            <Button 
              onClick={refreshStatus} 
              disabled={refreshing}
              variant="outline" 
              className="flex-1"
            >
              {refreshing ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Refreshing...
                </div>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Refresh Status
                </>
              )}
            </Button>
          )}
        </div>

        {status.requirements_pending && status.requirements_pending.length > 0 && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Outstanding Requirements:</h4>
            <ul className="text-xs space-y-1">
              {status.requirements_pending.map((req, index) => (
                <li key={index} className="text-muted-foreground">• {req}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};