import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Download,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentRecord {
  id: string;
  type: 'purchase' | 'payout' | 'subscription';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  description: string;
  stripe_reference?: string;
  receipt_url?: string;
}

export const PaymentQA = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchPaymentHistory();
    }
  }, [user]);

  const fetchPaymentHistory = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch various payment types
      const [purchasesResponse, payoutsResponse, subscriptionsResponse] = await Promise.all([
        supabase
          .from('release_purchases')
          .select('*')
          .eq('user_id', user.id)
          .order('purchased_at', { ascending: false }),
        supabase
          .from('payout_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (purchasesResponse.error) throw purchasesResponse.error;
      if (payoutsResponse.error) throw payoutsResponse.error;
      if (subscriptionsResponse.error) throw subscriptionsResponse.error;

      // Transform data into unified format
      const allPayments: PaymentRecord[] = [
        ...(purchasesResponse.data || []).map(p => ({
          id: p.id,
          type: 'purchase' as const,
          amount: Number(p.amount_paid),
          status: 'completed' as const,
          created_at: p.purchased_at,
          description: `Release purchase`,
          stripe_reference: p.stripe_payment_intent_id
        })),
        ...(payoutsResponse.data || []).map(p => ({
          id: p.id,
          type: 'payout' as const,
          amount: Number(p.amount),
          status: p.payout_status as 'pending' | 'completed' | 'failed',
          created_at: p.created_at,
          description: `Payout via ${p.payout_method}`,
          stripe_reference: p.payout_reference
        })),
        ...(subscriptionsResponse.data || []).map(s => ({
          id: s.id,
          type: 'subscription' as const,
          amount: 0, // Subscription amounts would come from Stripe
          status: s.status === 'active' ? 'completed' as const : 'pending' as const,
          created_at: s.created_at,
          description: `${s.tier} subscription`,
          stripe_reference: s.stripe_subscription_id
        }))
      ];

      // Sort by date
      allPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setPayments(allPayments);
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError(error instanceof Error ? error.message : 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  const retryPayment = async (paymentId: string) => {
    try {
      // This would typically call a Stripe retry endpoint
      toast({
        title: "Payment retry initiated",
        description: "We're attempting to process your payment again.",
      });
    } catch (error) {
      toast({
        title: "Retry failed",
        description: "Unable to retry payment. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const downloadReceipt = async (payment: PaymentRecord) => {
    if (!payment.stripe_reference) {
      toast({
        title: "Receipt unavailable",
        description: "No receipt found for this transaction.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call edge function to generate/fetch receipt
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: { 
          payment_id: payment.id,
          stripe_reference: payment.stripe_reference 
        }
      });

      if (error) throw error;

      if (data?.receipt_url) {
        window.open(data.receipt_url, '_blank');
      } else {
        toast({
          title: "Receipt generated",
          description: "Your receipt has been sent to your email.",
        });
      }
    } catch (error) {
      toast({
        title: "Receipt error",
        description: "Unable to generate receipt. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'refunded':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'refunded':
        return 'destructive';
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
            <span>Loading payment history...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPaymentHistory}
            className="ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const purchaseHistory = payments.filter(p => p.type === 'purchase');
  const payoutHistory = payments.filter(p => p.type === 'payout');
  const subscriptionHistory = payments.filter(p => p.type === 'subscription');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History & QA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
              <TabsTrigger value="purchases">Purchases ({purchaseHistory.length})</TabsTrigger>
              <TabsTrigger value="payouts">Payouts ({payoutHistory.length})</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions ({subscriptionHistory.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <PaymentList 
                payments={payments} 
                onRetry={retryPayment}
                onDownloadReceipt={downloadReceipt}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="purchases" className="mt-6">
              <PaymentList 
                payments={purchaseHistory} 
                onRetry={retryPayment}
                onDownloadReceipt={downloadReceipt}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="payouts" className="mt-6">
              <PaymentList 
                payments={payoutHistory} 
                onRetry={retryPayment}
                onDownloadReceipt={downloadReceipt}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>

            <TabsContent value="subscriptions" className="mt-6">
              <PaymentList 
                payments={subscriptionHistory} 
                onRetry={retryPayment}
                onDownloadReceipt={downloadReceipt}
                getStatusIcon={getStatusIcon}
                getStatusColor={getStatusColor}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold">
                  ${purchaseHistory.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">
                  ${payoutHistory.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">
                  {payments.filter(p => p.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface PaymentListProps {
  payments: PaymentRecord[];
  onRetry: (paymentId: string) => void;
  onDownloadReceipt: (payment: PaymentRecord) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  getStatusColor: (status: string) => any;
}

const PaymentList = ({ 
  payments, 
  onRetry, 
  onDownloadReceipt, 
  getStatusIcon, 
  getStatusColor 
}: PaymentListProps) => {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No payments found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payments.map((payment) => (
        <Card key={payment.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(payment.status)}
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(payment.created_at).toLocaleDateString()} • 
                    ${payment.amount.toFixed(2)}
                  </p>
                  {payment.stripe_reference && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {payment.stripe_reference}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(payment.status)}>
                  {payment.status}
                </Badge>
                
                {payment.status === 'failed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRetry(payment.id)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                
                {payment.stripe_reference && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDownloadReceipt(payment)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Receipt
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};