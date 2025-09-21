import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Play, Filter, RefreshCw, ExternalLink, Edit } from "lucide-react";
import { toast } from "sonner";

interface PayoutRecord {
  id: string;
  producer_id: string;
  beat_id: string;
  gross_amount: number;
  net_amount: number;
  payout_status: string;
  stripe_transfer_id: string | null;
  processed_at: string | null;
  created_at: string;
  adjusted_amount_cents?: number;
  admin_note?: string;
  producer_name?: string;
  beat_title?: string;
}

interface PayoutFilters {
  status: string;
  dateFrom: string;
  dateTo: string;
  producer: string;
}

export const EnhancedAdminPayouts = () => {
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [filters, setFilters] = useState<PayoutFilters>({
    status: 'all',
    dateFrom: '',
    dateTo: '',
    producer: ''
  });
  const [selectedPayout, setSelectedPayout] = useState<PayoutRecord | null>(null);
  const [editingStatus, setEditingStatus] = useState('');
  const [adjustedAmount, setAdjustedAmount] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Load payout records
  const loadPayouts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('producer_payouts')
        .select(`
          *,
          profiles!inner(full_name, username),
          beats!inner(title)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('payout_status', filters.status);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = data.map(payout => ({
        id: payout.id,
        producer_id: payout.producer_id,
        beat_id: payout.beat_id,
        gross_amount: Number(payout.gross_amount),
        net_amount: Number(payout.net_amount),
        payout_status: payout.payout_status || 'pending',
        stripe_transfer_id: payout.stripe_transfer_id,
        processed_at: payout.processed_at,
        created_at: payout.created_at,
        adjusted_amount_cents: payout.adjusted_amount_cents,
        admin_note: payout.admin_note,
        producer_name: (payout.profiles as any)?.full_name || (payout.profiles as any)?.username || 'Unknown Producer',
        beat_title: (payout.beats as any)?.title || 'Unknown Beat'
      }));

      // Apply producer filter
      const filteredByProducer = filters.producer
        ? formatted.filter(p => 
            p.producer_name.toLowerCase().includes(filters.producer.toLowerCase())
          )
        : formatted;

      setPayouts(filteredByProducer);
    } catch (error) {
      console.error('Error loading payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  // Run payout processing
  const runPayouts = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-producer-payouts', {
        body: { 
          batchId: `admin_${Date.now()}`,
          maxPayouts: 50,
          payoutType: 'standard'
        }
      });

      if (error) throw error;

      toast.success(`Processed ${data.processed_sales || 0} payouts successfully`);
      
      // Refresh the list
      loadPayouts();
    } catch (error) {
      console.error('Error running payouts:', error);
      toast.error('Failed to run payouts');
    } finally {
      setProcessing(false);
    }
  };

  // Update payout status
  const updatePayoutStatus = async () => {
    if (!selectedPayout) return;

    try {
      const updateData: any = {
        payout_status: editingStatus
      };

      if (adjustedAmount) {
        updateData.adjusted_amount_cents = Math.round(parseFloat(adjustedAmount) * 100);
      }

      if (adminNote) {
        updateData.admin_note = adminNote;
      }

      const { error } = await supabase
        .from('producer_payouts')
        .update(updateData)
        .eq('id', selectedPayout.id);

      if (error) throw error;

      toast.success('Payout updated successfully');
      setSelectedPayout(null);
      loadPayouts();
    } catch (error) {
      console.error('Error updating payout:', error);
      toast.error('Failed to update payout');
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default" className="bg-green-500 text-white">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'disputed':
        return <Badge variant="destructive">Disputed</Badge>;
      case 'on_hold':
        return <Badge variant="secondary">On Hold</Badge>;
      case 'adjusted':
        return <Badge variant="outline">Adjusted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  // Open Stripe transfer
  const openStripeTransfer = (transferId: string) => {
    const url = `https://dashboard.stripe.com/transfers/${transferId}`;
    window.open(url, '_blank');
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  useEffect(() => {
    loadPayouts();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Producer Payouts</h1>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={loadPayouts} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={runPayouts} disabled={processing} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            {processing ? 'Processing...' : 'Run Payouts'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="adjusted">Adjusted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">From Date</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">To Date</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="producer">Producer</Label>
              <Input
                placeholder="Search producer..."
                value={filters.producer}
                onChange={(e) => setFilters({...filters, producer: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Records ({payouts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{payout.producer_name}</h3>
                      <span className="text-sm text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{payout.beat_title}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Created: {new Date(payout.created_at).toLocaleDateString()}</span>
                      <span>Gross: {formatCurrency(payout.gross_amount)}</span>
                      <span>Net: {formatCurrency(payout.adjusted_amount_cents || payout.net_amount)}</span>
                      {payout.processed_at && (
                        <span>Processed: {new Date(payout.processed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {payout.admin_note && (
                      <p className="text-sm text-orange-600">Note: {payout.admin_note}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusBadge(payout.payout_status)}
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedPayout(payout);
                            setEditingStatus(payout.payout_status);
                            setAdjustedAmount(payout.adjusted_amount_cents ? (payout.adjusted_amount_cents / 100).toString() : '');
                            setAdminNote(payout.admin_note || '');
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Manage Payout</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Status</Label>
                            <Select value={editingStatus} onValueChange={setEditingStatus}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="processing">Processing</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="disputed">Disputed</SelectItem>
                                <SelectItem value="on_hold">On Hold</SelectItem>
                                <SelectItem value="adjusted">Adjusted</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Adjusted Amount ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Leave empty for original amount"
                              value={adjustedAmount}
                              onChange={(e) => setAdjustedAmount(e.target.value)}
                            />
                          </div>

                          <div>
                            <Label>Admin Note</Label>
                            <Textarea
                              placeholder="Add a note about this payout adjustment..."
                              value={adminNote}
                              onChange={(e) => setAdminNote(e.target.value)}
                            />
                          </div>

                          <Button onClick={updatePayoutStatus} className="w-full">
                            Update Payout
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {payout.stripe_transfer_id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openStripeTransfer(payout.stripe_transfer_id!)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};