import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Trophy, Users, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Battle {
  id: string;
  title: string;
  entry_fee_cents?: number;
  prize_pool_cents?: number;
  status: string;
  starts_at: string;
  ends_at: string;
}

interface BattleMonetizationProps {
  battle: Battle;
  onUpdate?: () => void;
}

export const BattleMonetization = ({ battle, onUpdate }: BattleMonetizationProps) => {
  const [loading, setLoading] = useState(false);
  const [entryFee, setEntryFee] = useState(battle.entry_fee_cents ? (battle.entry_fee_cents / 100).toString() : '');
  const { toast } = useToast();

  const handleEntryPayment = async () => {
    if (!battle.entry_fee_cents) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          amount: battle.entry_fee_cents,
          metadata: {
            type: 'battle_entry',
            battle_id: battle.id,
          },
          success_url: `${window.location.origin}/battles/${battle.id}?entry=success`,
          cancel_url: `${window.location.origin}/battles/${battle.id}?entry=cancelled`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateEntryFee = async () => {
    setLoading(true);
    try {
      const entryFeeCents = entryFee ? Math.round(parseFloat(entryFee) * 100) : null;
      
      const { error } = await supabase
        .from('battles')
        .update({ entry_fee_cents: entryFeeCents })
        .eq('id', battle.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry fee updated successfully",
      });

      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const canEnter = battle.status === 'live' && battle.entry_fee_cents;
  const showEntryManagement = battle.status === 'upcoming';

  return (
    <div className="space-y-4">
      {/* Prize Pool Display */}
      {battle.prize_pool_cents && battle.prize_pool_cents > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Prize Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">
                {formatCurrency(battle.prize_pool_cents)}
              </div>
              <Badge variant="secondary">
                <DollarSign className="h-3 w-3 mr-1" />
                Total Winnings
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entry Fee Management (for battle creators) */}
      {showEntryManagement && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Entry Fee Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="entryFee">Entry Fee (USD)</Label>
              <Input
                id="entryFee"
                type="number"
                step="0.01"
                min="0"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Leave empty for free entry. Winners receive 90% of total entry fees.
              </p>
            </div>
            <Button onClick={updateEntryFee} disabled={loading}>
              {loading ? 'Updating...' : 'Update Entry Fee'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entry Payment (for participants) */}
      {canEnter && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Battle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Entry Fee</p>
                <p className="text-sm text-muted-foreground">
                  Pay to participate in this battle
                </p>
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(battle.entry_fee_cents!)}
              </div>
            </div>
            <Button 
              onClick={handleEntryPayment} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? 'Processing...' : 'Pay to Enter Battle'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Free Entry Display */}
      {battle.status === 'live' && !battle.entry_fee_cents && (
        <Card>
          <CardContent className="text-center py-6">
            <Users className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold mb-2">Free Entry</h3>
            <p className="text-muted-foreground">
              This battle is free to enter - no payment required!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};