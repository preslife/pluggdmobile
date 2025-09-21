import { useState } from "react";
import { ShoppingCart, Heart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ReleasePurchaseButtonProps {
  releaseId: string;
  price: number;
  download_price?: number;
  payWhatYouWant?: boolean;
  minimumPrice?: number;
  title: string;
  artist: string;
  hasPurchased?: boolean;
}

export const ReleasePurchaseButton = ({
  releaseId,
  price,
  download_price,
  payWhatYouWant = false,
  minimumPrice = 0,
  title,
  artist,
  hasPurchased = false
}: ReleasePurchaseButtonProps) => {
  // Use exact same logic as ReleaseCard
  const calculatedPrice = download_price || price || 0;
  const [isOpen, setIsOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(calculatedPrice);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const handlePurchase = async (amount?: number) => {
    if (!user) {
      toast.error("Please sign in to purchase releases");
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-release-purchase', {
        body: {
          releaseId,
          amount: payWhatYouWant ? amount || customAmount : calculatedPrice,
          payWhatYouWant: payWhatYouWant && (amount !== undefined || customAmount !== calculatedPrice)
        }
      });

      if (error) throw error;

      if (data.url) {
        window.open(data.url, '_blank');
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create purchase');
    } finally {
      setIsLoading(false);
    }
  };

  const isValidAmount = customAmount >= minimumPrice && customAmount > 0;

  if (hasPurchased) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Heart className="h-4 w-4" />
        Owned
      </Button>
    );
  }

  if ((price || 0) === 0 && (download_price || 0) === 0) {
    return (
      <Button variant="default" onClick={() => handlePurchase(0)} disabled={isLoading} className="gap-2">
        <ShoppingCart className="h-4 w-4" />
        Free Download
      </Button>
    );
  }

  if (!payWhatYouWant) {
    return (
      <Button
        variant="default"
        onClick={() => handlePurchase()}
        disabled={isLoading}
        className="gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        {isLoading ? "Processing..." : `Buy £${calculatedPrice.toFixed(2)}`}
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Pay What You Want
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Purchase Release</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">by {artist}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (GBP)</Label>
            <Input
              id="amount"
              type="number"
              min={minimumPrice}
              step="0.01"
              value={customAmount}
              onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
              placeholder={`Minimum £${minimumPrice.toFixed(2)}`}
            />
            {minimumPrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Minimum amount: £{minimumPrice.toFixed(2)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomAmount(calculatedPrice)}
            >
              £{calculatedPrice.toFixed(2)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomAmount(calculatedPrice * 1.5)}
            >
              £{(calculatedPrice * 1.5).toFixed(2)}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCustomAmount(calculatedPrice * 2)}
            >
              £{(calculatedPrice * 2).toFixed(2)}
            </Button>
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
              onClick={() => handlePurchase(customAmount)}
              disabled={!isValidAmount || isLoading}
              className="flex-1"
            >
              {isLoading ? "Processing..." : `Pay £${customAmount.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};