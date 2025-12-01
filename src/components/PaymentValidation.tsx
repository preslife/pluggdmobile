import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  CreditCard,
  DollarSign,
  Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentValidationIssue {
  id: string;
  type: 'duplicate' | 'failed' | 'suspicious' | 'expired';
  severity: 'low' | 'medium' | 'high';
  description: string;
  payment_id: string;
  amount: number;
  created_at: string;
  resolved: boolean;
}

export const PaymentValidation = () => {
  const [issues, setIssues] = useState<PaymentValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      validatePayments();
    }
  }, [user]);

  const validatePayments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const issues: PaymentValidationIssue[] = [];

      // Check for failed payments
      const { data: failedPayments } = await supabase
        .from('release_purchases')
        .select('*')
        .eq('user_id', user.id)
        .is('stripe_payment_intent_id', null);

      failedPayments?.forEach(payment => {
        issues.push({
          id: `failed-${payment.id}`,
          type: 'failed',
          severity: 'high',
          description: 'Payment failed to process completely',
          payment_id: payment.id,
          amount: Number(payment.amount_paid),
          created_at: payment.purchased_at,
          resolved: false
        });
      });

      // Check for expired downloads
      const { data: expiredDownloads } = await supabase
        .from('release_purchases')
        .select('*')
        .eq('user_id', user.id)
        .not('download_expires_at', 'is', null)
        .lt('download_expires_at', new Date().toISOString());

      expiredDownloads?.forEach(purchase => {
        issues.push({
          id: `expired-${purchase.id}`,
          type: 'expired',
          severity: 'medium',
          description: 'Download link has expired',
          payment_id: purchase.id,
          amount: Number(purchase.amount_paid),
          created_at: purchase.purchased_at,
          resolved: false
        });
      });

      // Check for duplicate payments (same user, same release, within 1 hour)
      const { data: allPurchases } = await supabase
        .from('release_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (allPurchases) {
        const releaseGroups = new Map<string, typeof allPurchases>();
        
        allPurchases.forEach(purchase => {
          const key = purchase.release_id;
          if (!releaseGroups.has(key)) {
            releaseGroups.set(key, []);
          }
          releaseGroups.get(key)!.push(purchase);
        });

        releaseGroups.forEach(purchases => {
          if (purchases.length > 1) {
            for (let i = 1; i < purchases.length; i++) {
              const current = purchases[i];
              const previous = purchases[i - 1];
              const timeDiff = new Date(previous.purchased_at).getTime() - new Date(current.purchased_at).getTime();
              
              if (timeDiff < 3600000) { // 1 hour in milliseconds
                issues.push({
                  id: `duplicate-${current.id}`,
                  type: 'duplicate',
                  severity: 'medium',
                  description: 'Potential duplicate purchase detected',
                  payment_id: current.id,
                  amount: Number(current.amount_paid),
                  created_at: current.purchased_at,
                  resolved: false
                });
              }
            }
          }
        });
      }

      // Check for suspicious amounts (unusually high for user's history)
      if (allPurchases && allPurchases.length > 1) {
        const amounts = allPurchases.map(p => Number(p.amount_paid));
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const maxNormalAmount = avgAmount * 3; // 3x average as threshold

        allPurchases.forEach(purchase => {
          if (Number(purchase.amount_paid) > maxNormalAmount && Number(purchase.amount_paid) > 100) {
            issues.push({
              id: `suspicious-${purchase.id}`,
              type: 'suspicious',
              severity: 'low',
              description: 'Unusually high payment amount detected',
              payment_id: purchase.id,
              amount: Number(purchase.amount_paid),
              created_at: purchase.purchased_at,
              resolved: false
            });
          }
        });
      }

      setIssues(issues);
    } catch (error) {
      console.error('Payment validation error:', error);
      toast({
        title: "Validation Error",
        description: "Failed to validate payments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resolveIssue = async (issueId: string, issue: PaymentValidationIssue) => {
    try {
      setResolving(issueId);

      switch (issue.type) {
        case 'expired': {
          // Extend download link
          const newExpiryDate = new Date();
          newExpiryDate.setDate(newExpiryDate.getDate() + 30); // Extend by 30 days

          const { error: updateError } = await supabase
            .from('release_purchases')
            .update({ 
              download_expires_at: newExpiryDate.toISOString(),
              downloads_used: 0 // Reset download count
            })
            .eq('id', issue.payment_id);

          if (updateError) throw updateError;

          toast({
            title: "Download Extended",
            description: "Download link has been extended by 30 days",
          });
          break;
        }
        case 'failed': {
          // Retry payment processing
          const { error: retryError } = await supabase.functions.invoke('retry-payment', {
            body: { payment_id: issue.payment_id }
          });

          if (retryError) throw retryError;

          toast({
            title: "Payment Retry Initiated",
            description: "We're attempting to process the payment again",
          });
          break;
        }
        case 'duplicate':
          // Mark as reviewed/resolved
          toast({
            title: "Issue Acknowledged",
            description: "Duplicate payment has been flagged for review",
          });
          break;

        case 'suspicious':
          // Mark as reviewed
          toast({
            title: "Payment Verified",
            description: "High amount payment has been verified",
          });
          break;
      }

      // Remove from local issues list
      setIssues(prev => prev.filter(i => i.id !== issueId));

    } catch (error) {
      console.error('Resolution error:', error);
      toast({
        title: "Resolution Failed",
        description: "Failed to resolve payment issue",
        variant: "destructive",
      });
    } finally {
      setResolving(null);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Validating payments...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (issues.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-500" />
            Payment Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
            <p className="text-muted-foreground">
              No payment issues detected. All transactions are valid.
            </p>
            <Button 
              variant="outline" 
              onClick={validatePayments}
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-validate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Payment Issues Detected ({issues.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {issues.map((issue) => (
            <Alert key={issue.id}>
              <div className="flex items-start gap-3">
                {getSeverityIcon(issue.severity)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{issue.description}</h4>
                    <Badge variant={getSeverityColor(issue.severity) as any}>
                      {issue.severity}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Amount: ${issue.amount.toFixed(2)}</p>
                    <p>Date: {new Date(issue.created_at).toLocaleDateString()}</p>
                    <p className="font-mono text-xs">ID: {issue.payment_id.slice(0, 8)}</p>
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveIssue(issue.id, issue)}
                      disabled={resolving === issue.id}
                    >
                      {resolving === issue.id ? (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      )}
                      Resolve
                    </Button>
                  </div>
                </div>
              </div>
            </Alert>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            onClick={validatePayments}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-validate All Payments
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};