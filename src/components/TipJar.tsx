import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Coffee, Star } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TipJarProps {
  creatorId: string;
  creatorName: string;
  className?: string;
}

export const TipJar = ({ creatorId, creatorName, className }: TipJarProps) => {
  const { user } = useAuth();
  const { balance, spendCredits } = useWallet();
  const { toast } = useToast();
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const quickAmounts = [100, 500, 1000, 2500];

  const handleTip = async (amount: number) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to tip creators",
        variant: "destructive"
      });
      return;
    }

    if (amount < 10) {
      toast({
        title: "Minimum tip amount",
        description: "Minimum tip is 10 credits",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Spend credits for tip
      const result = await spendCredits(
        amount, 
        'spend_tip', 
        'tip', 
        creatorId,
        creatorId
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process tip');
      }

      // Create tip record
      const { error: tipError } = await supabase
        .from('artist_tips')
        .insert({
          fan_id: user.id,
          artist_id: creatorId,
          amount: amount,
          message: message || null,
          status: 'succeeded',
          paid_at: new Date().toISOString()
        });

      if (tipError) throw tipError;

      toast({
        title: "Tip sent!",
        description: `You tipped ${amount} credits to ${creatorName}`,
      });

      setCustomAmount("");
      setMessage("");
    } catch (error) {
      console.error('Error sending tip:', error);
      toast({
        title: "Error",
        description: "Failed to send tip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <Coffee className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sign in to tip {creatorName}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5 text-red-500" />
          Tip {creatorName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Available: {balance.available_credits} credits
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => handleTip(amount)}
              disabled={loading || balance.available_credits < amount}
              className="flex items-center gap-1"
            >
              <Star className="h-3 w-3" />
              {amount}
            </Button>
          ))}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary" className="w-full">
              Custom Amount
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tip {creatorName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Amount (credits)</label>
                <Input
                  type="number"
                  placeholder="Enter amount..."
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  min="10"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message (optional)</label>
                <Input
                  placeholder="Say something nice..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                />
              </div>
              <Button
                onClick={() => handleTip(parseInt(customAmount))}
                disabled={
                  loading || 
                  !customAmount || 
                  parseInt(customAmount) < 10 || 
                  balance.available_credits < parseInt(customAmount)
                }
                className="w-full"
              >
                {loading ? "Sending..." : `Tip ${customAmount || 0} credits`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
