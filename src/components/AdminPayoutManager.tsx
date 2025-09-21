import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  DollarSign, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle,
  PlayCircle,
  RefreshCw
} from 'lucide-react';

interface PayoutBatch {
  id: string;
  batch_id: string;
  total_amount: number;
  total_producers: number;
  status: string;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface PendingPayout {
  producer_id: string;
  producer_email: string;
  total_earnings: number;
  sales_count: number;
  stripe_account_id?: string;
  onboarding_complete: boolean;
}

const AdminPayoutManager: React.FC = () => {
  const { user } = useAuth();
  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>([]);
  const [pendingPayouts, setPendingPayouts] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchPayoutData = async () => {
    try {
      // Fetch payout batches
      const { data: batchesData } = await supabase
        .from('payout_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setPayoutBatches(batchesData || []);

      // Fetch pending payouts - get unique producers first
      const { data: pendingData } = await supabase
        .from('beat_sales')
        .select('producer_id, producer_earnings')
        .eq('payout_status', 'pending')
        .gte('producer_earnings', 1.00);

      if (pendingData && pendingData.length > 0) {
        // Get unique producer IDs
        const producerIds = [...new Set(pendingData.map(sale => sale.producer_id))];
        
        // Fetch producer details
        const { data: producerDetails } = await supabase
          .from('producer_stripe_accounts')
          .select(`
            user_id,
            stripe_account_id,
            onboarding_complete,
            profiles!inner(email)
          `)
          .in('user_id', producerIds);

        // Group by producer
        const groupedPayouts = pendingData.reduce((acc, sale) => {
          const producerId = sale.producer_id;
          if (!acc[producerId]) {
            const producerDetail = producerDetails?.find(p => p.user_id === producerId);
            acc[producerId] = {
              producer_id: producerId,
              producer_email: (producerDetail?.profiles as any)?.email || 'Unknown',
              total_earnings: 0,
              sales_count: 0,
              stripe_account_id: producerDetail?.stripe_account_id,
              onboarding_complete: producerDetail?.onboarding_complete || false,
            };
          }
          acc[producerId].total_earnings += sale.producer_earnings;
          acc[producerId].sales_count += 1;
          return acc;
        }, {} as Record<string, PendingPayout>);

        setPendingPayouts(Object.values(groupedPayouts));
      }
    } catch (error) {
      console.error('Error fetching payout data:', error);
      toast({
        title: "Error",
        description: "Failed to load payout data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processBatchPayout = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-producer-payouts', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Payout Processing Started",
        description: `Processing payouts for ${data.producers_processed || 0} producers`,
      });

      // Refresh data
      await fetchPayoutData();
    } catch (error) {
      console.error('Error processing payouts:', error);
      toast({
        title: "Error",
        description: "Failed to process payouts",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const createPayoutBatch = async () => {
    try {
      const { data, error } = await supabase.rpc('create_payout_batch');

      if (error) throw error;

      toast({
        title: "Payout Batch Created",
        description: "New payout batch has been created",
      });

      await fetchPayoutData();
    } catch (error) {
      console.error('Error creating payout batch:', error);
      toast({
        title: "Error",
        description: "Failed to create payout batch",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchPayoutData();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const totalPendingAmount = pendingPayouts.reduce((sum, payout) => sum + payout.total_earnings, 0);
  const eligibleProducers = pendingPayouts.filter(p => p.onboarding_complete && p.total_earnings >= 10).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payout Management</h1>
          <p className="text-muted-foreground">Manage producer payouts and batch processing</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPayoutData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={createPayoutBatch} variant="outline">
            Create Batch
          </Button>
          <Button 
            onClick={processBatchPayout} 
            disabled={processing || eligibleProducers === 0}
          >
            <PlayCircle className="h-4 w-4 mr-2" />
            Process Payouts
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalPendingAmount.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Across {pendingPayouts.length} producers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Producers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eligibleProducers}</div>
            <p className="text-xs text-muted-foreground">
              Ready for payout (≥£10)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {processing ? 'Running' : 'Ready'}
            </div>
            <p className="text-xs text-muted-foreground">
              {processing ? 'Processing payouts...' : 'System ready'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payouts</CardTitle>
          <CardDescription>Producers awaiting payout processing</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPayouts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No pending payouts at this time
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Stripe Status</TableHead>
                  <TableHead>Eligible</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPayouts.map((payout) => (
                  <TableRow key={payout.producer_id}>
                    <TableCell>{payout.producer_email}</TableCell>
                    <TableCell>£{payout.total_earnings.toFixed(2)}</TableCell>
                    <TableCell>{payout.sales_count}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={payout.onboarding_complete ? 'default' : 'secondary'}
                      >
                        {payout.onboarding_complete ? 'Complete' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payout.onboarding_complete && payout.total_earnings >= 10 ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Batch History</CardTitle>
          <CardDescription>Recent payout batch processing history</CardDescription>
        </CardHeader>
        <CardContent>
          {payoutBatches.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No payout batches processed yet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Producers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payoutBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono text-sm">{batch.batch_id}</TableCell>
                    <TableCell>£{batch.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{batch.total_producers}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          batch.status === 'completed' ? 'default' : 
                          batch.status === 'processing' ? 'secondary' : 
                          'destructive'
                        }
                      >
                        {batch.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(batch.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {batch.completed_at ? 
                        new Date(batch.completed_at).toLocaleDateString() : 
                        '-'
                      }
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayoutManager;