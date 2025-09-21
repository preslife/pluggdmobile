import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Clock, DollarSign, MessageSquare, Award, Play } from 'lucide-react';

interface CommissionBid {
  id: string;
  commission_request_id: string;
  producer_id: string;
  bid_amount_cents: number;
  estimated_delivery_days: number;
  proposal_message: string;
  portfolio_samples: string[];
  status: string;
  created_at: string;
  profiles?: {
    username: string;
    full_name: string;
    avatar_url: string;
  };
}

interface CommissionRequest {
  id: string;
  title: string;
  description: string;
  budget_cents: number;
  genre: string;
  deadline: string;
  status: string;
}

interface CommissionBiddingProps {
  commissionRequest: CommissionRequest;
  userRole: 'requester' | 'producer';
}

export const CommissionBidding = ({ commissionRequest, userRole }: CommissionBiddingProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bids, setBids] = useState<CommissionBid[]>([]);
  const [showBidForm, setShowBidForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Bid form state
  const [bidAmount, setBidAmount] = useState(commissionRequest.budget_cents / 100);
  const [deliveryDays, setDeliveryDays] = useState(7);
  const [proposalMessage, setProposalMessage] = useState('');
  const [portfolioSamples, setPortfolioSamples] = useState<string[]>(['']);

  useEffect(() => {
    fetchBids();
  }, [commissionRequest.id]);

  const fetchBids = async () => {
    try {
      const { data, error } = await supabase
        .from('commission_bids')
        .select('*')
        .eq('commission_request_id', commissionRequest.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBids(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading bids",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const submitBid = async () => {
    if (!user) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('commission_bids')
        .insert({
          commission_request_id: commissionRequest.id,
          producer_id: user.id,
          bid_amount_cents: Math.round(bidAmount * 100),
          estimated_delivery_days: deliveryDays,
          proposal_message: proposalMessage,
          portfolio_samples: portfolioSamples.filter(url => url.trim() !== '')
        });

      if (error) throw error;

      toast({
        title: "Bid submitted successfully!",
        description: "The requester will review your proposal."
      });

      setShowBidForm(false);
      fetchBids();
    } catch (error: any) {
      toast({
        title: "Failed to submit bid",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const acceptBid = async (bidId: string) => {
    try {
      // Accept the bid
      const { error: updateError } = await supabase
        .from('commission_bids')
        .update({ status: 'accepted' })
        .eq('id', bidId);

      if (updateError) throw updateError;

      // Reject all other bids
      const { error: rejectError } = await supabase
        .from('commission_bids')
        .update({ status: 'rejected' })
        .eq('commission_request_id', commissionRequest.id)
        .neq('id', bidId);

      if (rejectError) throw rejectError;

      // Update commission request status
      const { error: commissionError } = await supabase
        .from('commission_requests')
        .update({ status: 'accepted' })
        .eq('id', commissionRequest.id);

      if (commissionError) throw commissionError;

      toast({
        title: "Bid accepted!",
        description: "The producer can now start working on your commission."
      });

      fetchBids();
    } catch (error: any) {
      toast({
        title: "Failed to accept bid",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const addPortfolioField = () => {
    setPortfolioSamples([...portfolioSamples, '']);
  };

  const updatePortfolioField = (index: number, value: string) => {
    const updated = [...portfolioSamples];
    updated[index] = value;
    setPortfolioSamples(updated);
  };

  const removePortfolioField = (index: number) => {
    setPortfolioSamples(portfolioSamples.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Commission Bids</h3>
          <p className="text-sm text-muted-foreground">
            {bids.length} {bids.length === 1 ? 'bid' : 'bids'} received
          </p>
        </div>
        
        {userRole === 'producer' && commissionRequest.status === 'pending' && (
          <Dialog open={showBidForm} onOpenChange={setShowBidForm}>
            <DialogTrigger asChild>
              <Button>Place Bid</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Submit Your Bid</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Bid Amount (USD)</label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter your bid amount"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Budget: ${(commissionRequest.budget_cents / 100).toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Estimated Delivery (Days)</label>
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(parseInt(e.target.value) || 1)}
                    placeholder="Number of days"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Proposal Message</label>
                  <Textarea
                    value={proposalMessage}
                    onChange={(e) => setProposalMessage(e.target.value)}
                    placeholder="Describe your approach and experience..."
                    className="min-h-24"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Portfolio Samples (URLs)</label>
                  {portfolioSamples.map((sample, index) => (
                    <div key={index} className="flex gap-2 mt-2">
                      <Input
                        value={sample}
                        onChange={(e) => updatePortfolioField(index, e.target.value)}
                        placeholder="https://..."
                      />
                      {portfolioSamples.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removePortfolioField(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addPortfolioField}
                    className="mt-2"
                  >
                    Add Sample
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowBidForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={submitBid}
                    disabled={submitting || !proposalMessage.trim()}
                    className="flex-1"
                  >
                    {submitting ? "Submitting..." : "Submit Bid"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-4">
        {bids.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No bids yet</p>
            </CardContent>
          </Card>
        ) : (
          bids.map((bid) => (
            <Card key={bid.id} className={`${bid.status === 'accepted' ? 'border-green-500 bg-green-50/50' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={bid.profiles?.avatar_url} />
                      <AvatarFallback>
                        {bid.profiles?.username?.[0]?.toUpperCase() || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">
                        {bid.profiles?.username || bid.profiles?.full_name || 'Producer'}
                      </CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${(bid.bid_amount_cents / 100).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {bid.estimated_delivery_days} days
                          </span>
                        </div>
                      </CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        bid.status === 'accepted' ? 'default' :
                        bid.status === 'rejected' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {bid.status === 'accepted' && <Award className="w-3 h-3 mr-1" />}
                      {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                    </Badge>
                    
                    {userRole === 'requester' && bid.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => acceptBid(bid.id)}
                      >
                        Accept Bid
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-1">Proposal</h4>
                    <p className="text-sm text-muted-foreground">{bid.proposal_message}</p>
                  </div>
                  
                  {bid.portfolio_samples.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Portfolio Samples</h4>
                      <div className="flex flex-wrap gap-2">
                        {bid.portfolio_samples.map((sample, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(sample, '_blank')}
                            className="text-xs"
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Sample {index + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};