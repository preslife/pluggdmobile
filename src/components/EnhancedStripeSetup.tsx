import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Shield,
  CreditCard,
  Building,
  User,
  FileText,
  HelpCircle,
  ArrowRight,
  Info
} from "lucide-react";

interface StripeAccountStatus {
  id?: string;
  stripe_account_id?: string;
  onboarding_complete: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements_pending?: string[];
  capabilities?: any;
  country?: string;
  default_currency?: string;
  account_status: string;
  external_account_id?: string;
  updated_at?: string;
}

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'complete' | 'error';
  icon: React.ReactNode;
  action?: () => void;
  required: boolean;
}

const EnhancedStripeSetup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stripeAccount, setStripeAccount] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchStripeAccountStatus();
    }
  }, [user?.id]);

  useEffect(() => {
    updateSetupSteps();
  }, [stripeAccount]);

  const fetchStripeAccountStatus = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('producer_stripe_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setStripeAccount(data || {
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        account_status: 'not_created',
        requirements_pending: []
      });

    } catch (error) {
      console.error('Error fetching Stripe account status:', error);
      toast({
        title: "Error",
        description: "Failed to load account status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshAccountStatus = async () => {
    if (!stripeAccount?.stripe_account_id) return;

    try {
      setRefreshing(true);
      
      const { data, error } = await supabase.functions.invoke('update-stripe-account-status');
      
      if (error) throw error;

      toast({
        title: "Status Updated",
        description: "Account status has been refreshed",
      });

      await fetchStripeAccountStatus();

    } catch (error: any) {
      console.error('Error refreshing status:', error);
      toast({
        title: "Error",
        description: "Failed to refresh account status",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const createStripeAccount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      
      if (error) throw error;

      if (data?.onboarding_url) {
        window.open(data.onboarding_url, '_blank');
        
        toast({
          title: "Stripe Setup Started",
          description: "Complete your setup in the new tab",
        });

        // Refresh status after a short delay
        setTimeout(() => {
          fetchStripeAccountStatus();
        }, 2000);
      }

    } catch (error: any) {
      console.error('Error creating Stripe account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create Stripe account",
        variant: "destructive",
      });
    }
  };

  const updateSetupSteps = () => {
    if (!stripeAccount) return;

    const steps: SetupStep[] = [
      {
        id: 'create_account',
        title: 'Create Stripe Account',
        description: 'Initialize your Stripe Connect account',
        status: stripeAccount.stripe_account_id ? 'complete' : 'pending',
        icon: <User className="h-5 w-5" />,
        action: !stripeAccount.stripe_account_id ? createStripeAccount : undefined,
        required: true
      },
      {
        id: 'business_details',
        title: 'Business Information',
        description: 'Provide your business or personal details',
        status: stripeAccount.details_submitted ? 'complete' : 
                stripeAccount.stripe_account_id ? 'pending' : 'pending',
        icon: <Building className="h-5 w-5" />,
        action: stripeAccount.stripe_account_id && !stripeAccount.details_submitted ? createStripeAccount : undefined,
        required: true
      },
      {
        id: 'identity_verification',
        title: 'Identity Verification',
        description: 'Verify your identity and business documents',
        status: stripeAccount.charges_enabled ? 'complete' : 
                stripeAccount.details_submitted ? 'in_progress' : 'pending',
        icon: <Shield className="h-5 w-5" />,
        required: true
      },
      {
        id: 'bank_account',
        title: 'Bank Account',
        description: 'Add your bank account for payouts',
        status: stripeAccount.payouts_enabled ? 'complete' : 
                stripeAccount.external_account_id ? 'in_progress' : 'pending',
        icon: <CreditCard className="h-5 w-5" />,
        required: true
      },
      {
        id: 'final_approval',
        title: 'Final Approval',
        description: 'Stripe reviews and approves your account',
        status: stripeAccount.onboarding_complete && stripeAccount.payouts_enabled ? 'complete' : 
                stripeAccount.details_submitted ? 'in_progress' : 'pending',
        icon: <CheckCircle className="h-5 w-5" />,
        required: true
      }
    ];

    setSetupSteps(steps);
  };

  const getOverallProgress = () => {
    if (!setupSteps.length) return 0;
    const completedSteps = setupSteps.filter(step => step.status === 'complete').length;
    return (completedSteps / setupSteps.length) * 100;
  };

  const getStatusInfo = () => {
    if (!stripeAccount?.stripe_account_id) {
      return {
        title: "Get Started with Payouts",
        description: "Set up your Stripe Connect account to start receiving payments for your beats.",
        color: "blue",
        action: "Get Started"
      };
    }

    if (stripeAccount.onboarding_complete && stripeAccount.payouts_enabled) {
      return {
        title: "Account Active",
        description: "Your payout account is fully set up and ready to receive payments.",
        color: "green",
        action: null
      };
    }

    if (stripeAccount.details_submitted) {
      return {
        title: "Under Review",
        description: "Your account is being reviewed by Stripe. This usually takes 1-2 business days.",
        color: "yellow",
        action: "Refresh Status"
      };
    }

    return {
      title: "Setup Required",
      description: "Complete your account setup to start receiving payouts.",
      color: "orange",
      action: "Continue Setup"
    };
  };

  const statusInfo = getStatusInfo();

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                Payout Account Setup
                <Badge 
                  variant={statusInfo.color === 'green' ? 'default' : 
                          statusInfo.color === 'yellow' ? 'secondary' : 'destructive'}
                >
                  {statusInfo.title}
                </Badge>
              </CardTitle>
              <p className="text-muted-foreground mt-1">{statusInfo.description}</p>
            </div>
            {stripeAccount?.stripe_account_id && (
              <Button 
                onClick={refreshAccountStatus} 
                disabled={refreshing}
                variant="outline" 
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Setup Progress</span>
                <span>{Math.round(getOverallProgress())}%</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
            </div>

            {statusInfo.action && (
              <Button 
                onClick={statusInfo.action === "Get Started" ? createStripeAccount : 
                        statusInfo.action === "Continue Setup" ? createStripeAccount :
                        refreshAccountStatus}
                className="w-full"
                disabled={refreshing}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {statusInfo.action}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {setupSteps.map((step, index) => (
              <div key={step.id}>
                <div className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {step.status === 'complete' ? (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    ) : step.status === 'in_progress' ? (
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                    ) : step.status === 'error' ? (
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                        {step.icon}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{step.title}</h3>
                      {step.required && <Badge variant="outline" className="text-xs">Required</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>

                  {step.action && (
                    <Button onClick={step.action} variant="outline" size="sm">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {index < setupSteps.length - 1 && (
                  <div className="ml-8 h-4 w-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Requirements & Help */}
      {stripeAccount?.requirements_pending && stripeAccount.requirements_pending.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Additional Information Required:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {stripeAccount.requirements_pending.map((req, index) => (
                  <li key={index}>{req.replace(/_/g, ' ').toLowerCase()}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                What You'll Need
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Government-issued photo ID</li>
                <li>Business or personal tax information</li>
                <li>Bank account details</li>
                <li>Business address (if applicable)</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Timeline
              </h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Account creation: Instant</li>
                <li>Information review: 1-2 business days</li>
                <li>Full activation: 2-7 business days</li>
                <li>First payout: After activation</li>
              </ul>
            </div>
          </div>
          
          <Separator />
          
          <div className="text-sm text-muted-foreground">
            <p>
              Payouts are processed weekly for pending earnings above £10. 
              All transactions are secured by Stripe's industry-leading payment infrastructure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedStripeSetup;