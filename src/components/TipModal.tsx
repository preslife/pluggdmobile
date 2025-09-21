import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet, formatCredits, creditsToGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Heart, CreditCard, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TipModalProps {
  creatorId: string;
  creatorName: string;
  children: React.ReactNode;
}

export const TipModal = ({ creatorId, creatorName, children }: TipModalProps) => {
  const { balance, spendCredits, topUpCredits } = useWallet();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTipWithCredits = async () => {
    const amount = parseInt(tipAmount);
    if (!amount || amount < 10) {
      toast({
        title: "Invalid amount",
        description: "Minimum tip is 10 credits",
        variant: "destructive"
      });
      return;
    }

    if (balance.available_credits < amount) {
      toast({
        title: "Insufficient credits",
        description: "You don't have enough credits for this tip",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await spendCredits(amount, 'spend_tip', 'tip', undefined, creatorId);
      if (result.success) {
        toast({
          title: "Tip sent!",
          description: `You tipped ${formatCredits(amount)} credits to ${creatorName}`,
        });
        setTipAmount("");
        setOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send tip. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpAndTip = async (credits: number) => {
    setLoading(true);
    try {
      const result = await topUpCredits(credits);
      if (result.url) {
        window.open(result.url, '_blank');
        toast({
          title: "Redirecting to payment",
          description: "Complete your purchase to top up credits and tip the creator",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const quickTipAmounts = [50, 100, 250, 500];
  const currentAmount = parseInt(tipAmount) || 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Tip {creatorName}
          </DialogTitle>
          <DialogDescription>
            Show your appreciation with PLGD Credits
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Please sign in to tip creators
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="tip" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tip">Tip Now</TabsTrigger>
              <TabsTrigger value="topup">Top Up & Tip</TabsTrigger>
            </TabsList>

            <TabsContent value="tip" className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Your Balance:</span>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <span className="font-medium">{formatCredits(balance.available_credits)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tip Amount (Credits)</label>
                <Input
                  type="number"
                  placeholder="Enter credits amount"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  min="10"
                  max={balance.available_credits}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum: 10 credits • ≈ £{creditsToGBP(currentAmount).toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {quickTipAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setTipAmount(amount.toString())}
                    disabled={balance.available_credits < amount}
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              <Button
                onClick={handleTipWithCredits}
                disabled={loading || !tipAmount || currentAmount < 10 || currentAmount > balance.available_credits}
                className="w-full"
              >
                <Heart className="h-4 w-4 mr-2" />
                {loading ? "Sending..." : `Tip ${formatCredits(currentAmount)} Credits`}
              </Button>
            </TabsContent>

            <TabsContent value="topup" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Top up your wallet and tip the creator in one go
              </p>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleTopUpAndTip(1000)}
                  disabled={loading}
                  variant="outline"
                  className="h-16 flex-col"
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-sm">1,000 Credits</span>
                  <span className="text-xs text-muted-foreground">£10</span>
                </Button>

                <Button
                  onClick={() => handleTopUpAndTip(2500)}
                  disabled={loading}
                  variant="outline"
                  className="h-16 flex-col"
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-sm">2,500 Credits</span>
                  <span className="text-xs text-muted-foreground">£25</span>
                </Button>

                <Button
                  onClick={() => handleTopUpAndTip(5000)}
                  disabled={loading}
                  variant="outline"
                  className="h-16 flex-col"
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-sm">5,000 Credits</span>
                  <span className="text-xs text-muted-foreground">£50</span>
                </Button>

                <Button
                  onClick={() => handleTopUpAndTip(10000)}
                  disabled={loading}
                  variant="outline"
                  className="h-16 flex-col"
                >
                  <CreditCard className="h-4 w-4 mb-1" />
                  <span className="text-sm">10,000 Credits</span>
                  <span className="text-xs text-muted-foreground">£100</span>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                After purchase, return here to send your tip
              </p>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};