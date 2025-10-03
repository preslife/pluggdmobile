import { useState } from "react";
import { Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ArtistTipButtonProps {
  artistId: string;
  artistName: string;
  releaseId?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export const ArtistTipButton = ({ 
  artistId, 
  artistName, 
  releaseId,
  variant = "outline",
  size = "default"
}: ArtistTipButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handleTip = async () => {
    if (!user) {
      toast.error("Please sign in to send tips");
      return;
    }

    if (amount < 1) {
      toast.error("Minimum tip amount is £1");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-artist-tip', {
        body: {
          artistId,
          amount,
          message: message.trim() || null,
          releaseId: releaseId || null
        }
      });

      if (error) throw error;

      if (data?.url) {
        if (data.sessionId) {
          sessionStorage.setItem('pluggd:lastTipSession', data.sessionId);
        }
        setIsOpen(false);
        setMessage("");
        toast.success("Redirecting to payment...");
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Tip error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create tip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Heart className="h-4 w-4" />
          Tip Artist
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Tip</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Show your support for <span className="font-semibold">{artistName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tip-amount">Amount (GBP)</Label>
            <Input
              id="tip-amount"
              type="number"
              min="1"
              step="0.50"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 1)}
              placeholder="Enter amount"
            />
            <p className="text-xs text-muted-foreground">
              Minimum tip: £1.00
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 5, 10].map((presetAmount) => (
              <Button
                key={presetAmount}
                variant="outline"
                size="sm"
                onClick={() => setAmount(presetAmount)}
                className={amount === presetAmount ? "ring-2 ring-primary" : ""}
              >
                £{presetAmount}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tip-message">Message (Optional)</Label>
            <Textarea
              id="tip-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice to the artist..."
              maxLength={200}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/200
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTip}
              disabled={amount < 1 || isLoading}
              className="flex-1 gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isLoading ? "Processing..." : `Tip £${amount.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
