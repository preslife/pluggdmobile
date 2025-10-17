import { useEffect, useMemo, useState } from "react";
import { ShoppingCart, Heart, DollarSign, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  allowGifting?: boolean;
  giftMessageTemplate?: string | null;
  preorderEnabled?: boolean;
  preorderAvailableAt?: string | null;
  preorderPending?: boolean;
  currency?: string;
  onSuccess?: (payload: {
    releaseId: string;
    amount: number;
    checkoutUrl?: string;
    immediateAccess?: boolean;
  }) => void;
}

const formatCurrency = (value: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  } catch {
    return `${currency === "USD" ? "$" : currency === "EUR" ? "€" : "£"}${value.toFixed(2)}`;
  }
};

type PurchaseOptions = {
  amount?: number;
  asGift?: boolean;
  recipientEmail?: string;
  recipientName?: string;
  giftNote?: string;
};

export const ReleasePurchaseButton = ({
  releaseId,
  price,
  download_price,
  payWhatYouWant = false,
  minimumPrice = 0,
  title,
  artist,
  hasPurchased = false,
  allowGifting = false,
  giftMessageTemplate,
  preorderEnabled = false,
  preorderAvailableAt,
  preorderPending = false,
  currency = "GBP",
  onSuccess
}: ReleasePurchaseButtonProps) => {
  const calculatedPrice = download_price ?? price ?? 0;
  const defaultAmount = useMemo(
    () => Math.max(calculatedPrice, minimumPrice),
    [calculatedPrice, minimumPrice]
  );

  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState(defaultAmount);

  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState(giftMessageTemplate ?? "");
  const [giftAmount, setGiftAmount] = useState(defaultAmount);

  useEffect(() => {
    setCustomAmount(defaultAmount);
    setGiftAmount(defaultAmount);
  }, [defaultAmount]);

  const isValidAmount = customAmount >= Math.max(minimumPrice, 0) && customAmount > 0;
  const giftAmountIsValid =
    (!payWhatYouWant && calculatedPrice > 0) ||
    (payWhatYouWant && giftAmount >= Math.max(minimumPrice, 0) && giftAmount > 0);

  const performPurchase = async (options: PurchaseOptions = {}) => {
    if (!user) {
      toast.error("Please sign in to purchase releases");
      return;
    }

    const targetAmount =
      options.amount ?? (payWhatYouWant ? customAmount : calculatedPrice);

    if (!targetAmount || targetAmount <= 0) {
      toast.error("Enter a valid purchase amount");
      return;
    }

    if (payWhatYouWant && targetAmount < minimumPrice) {
      toast.error(`Minimum amount is ${formatCurrency(minimumPrice, currency)}`);
      return;
    }

    if (options.asGift) {
      const email = options.recipientEmail?.trim() ?? "";
      if (!email || !email.includes("@")) {
        toast.error("Enter a valid recipient email address");
        return;
      }
    }

    setIsLoading(true);
    try {
      const amountToCharge = Number(targetAmount);
      const usedCustomAmount =
        payWhatYouWant && Math.abs(amountToCharge - calculatedPrice) > 0.0001;

      const payload: Record<string, unknown> = {
        releaseId,
        amount: amountToCharge,
        payWhatYouWant: payWhatYouWant && usedCustomAmount
      };

      if (options.asGift) {
        payload.giftRecipientEmail = options.recipientEmail?.trim();
        payload.giftRecipientName = options.recipientName?.trim() || null;
        payload.giftMessage = options.giftNote?.trim() || null;
      }

      const { data, error } = await supabase.functions.invoke(
        "create-release-purchase",
        { body: payload }
      );

      if (error) {
        throw error;
      }

      if (data?.url) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "recentReleaseReceipt",
            JSON.stringify({
              releaseId,
              title,
              artist,
              checkoutUrl: data.url,
              timestamp: new Date().toISOString()
            })
          );
        }

        window.open(data.url, "_blank");
        setPwDialogOpen(false);
        setGiftDialogOpen(false);

        onSuccess?.({
          releaseId,
          amount: amountToCharge,
          checkoutUrl: data.url,
          immediateAccess: false
        });
      } else {
        onSuccess?.({
          releaseId,
          amount: amountToCharge,
          immediateAccess: true
        });
      }

      if (options.asGift) {
        toast.success("Gift checkout created — send the link to your recipient!");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create purchase");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGiftSubmit = () => {
    const amountForGift = payWhatYouWant ? giftAmount : calculatedPrice;
    void performPurchase({
      amount: amountForGift,
      asGift: true,
      recipientEmail: giftRecipientEmail,
      recipientName: giftRecipientName,
      giftNote: giftMessage
    });
  };

  const primaryLabel = preorderEnabled ? "Pre-order" : "Buy";
  const formattedPrice = formatCurrency(
    payWhatYouWant ? customAmount : calculatedPrice,
    currency
  );

  const primaryButton = (
    <Button
      variant="default"
      onClick={() => {
        if (payWhatYouWant) {
          setPwDialogOpen(true);
        } else {
          void performPurchase();
        }
      }}
      disabled={isLoading}
      className="gap-2"
    >
      <ShoppingCart className="h-4 w-4" />
      {isLoading ? "Processing..." : `${primaryLabel} ${formattedPrice}`}
    </Button>
  );

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
      <Button
        variant="default"
        onClick={() => void performPurchase({ amount: 0 })}
        disabled={isLoading}
        className="gap-2"
      >
        <ShoppingCart className="h-4 w-4" />
        Free Download
      </Button>
    );
  }

  return (
    <>
      {payWhatYouWant ? (
        <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
          <DialogTrigger asChild>{primaryButton}</DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Choose your price</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">by {artist}</p>
                {preorderEnabled && preorderPending && preorderAvailableAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Unlocks on {new Date(preorderAvailableAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pwyw-amount">Amount ({currency})</Label>
                <Input
                  id="pwyw-amount"
                  type="number"
                  min={minimumPrice}
                  step="0.01"
                  value={customAmount}
                  onChange={(event) =>
                    setCustomAmount(parseFloat(event.target.value) || 0)
                  }
                  placeholder={`Minimum ${formatCurrency(minimumPrice, currency)}`}
                />
                {minimumPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Minimum amount: {formatCurrency(minimumPrice, currency)}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomAmount(calculatedPrice)}
                >
                  {formatCurrency(calculatedPrice, currency)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomAmount(calculatedPrice * 1.5)}
                >
                  {formatCurrency(calculatedPrice * 1.5, currency)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomAmount(calculatedPrice * 2)}
                >
                  {formatCurrency(calculatedPrice * 2, currency)}
                </Button>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setPwDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="default"
                disabled={isLoading || !isValidAmount}
                onClick={() => void performPurchase({ amount: customAmount })}
              >
                {isLoading ? "Processing..." : "Complete Purchase"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        primaryButton
      )}

      {allowGifting && (
        <Dialog open={giftDialogOpen} onOpenChange={(open) => {
          setGiftDialogOpen(open);
          if (open) {
            setGiftRecipientEmail("");
            setGiftRecipientName("");
            setGiftMessage(giftMessageTemplate ?? "");
            setGiftAmount(defaultAmount);
          }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Gift className="h-4 w-4" />
              Send as Gift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Send as a gift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">by {artist}</p>
                {preorderEnabled && preorderAvailableAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    The recipient receives access on {new Date(preorderAvailableAt).toLocaleString()}.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-email">Recipient email</Label>
                <Input
                  id="gift-email"
                  type="email"
                  value={giftRecipientEmail}
                  onChange={(event) => setGiftRecipientEmail(event.target.value)}
                  placeholder="friend@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-name">Recipient name (optional)</Label>
                <Input
                  id="gift-name"
                  value={giftRecipientName}
                  onChange={(event) => setGiftRecipientName(event.target.value)}
                  placeholder="Their name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-message">Gift message (optional)</Label>
                <Textarea
                  id="gift-message"
                  rows={4}
                  value={giftMessage}
                  onChange={(event) => setGiftMessage(event.target.value)}
                  placeholder="Add a personal note"
                />
                <p className="text-[11px] text-muted-foreground">
                  {giftMessageTemplate
                    ? "Template provided by the creator — customise it before sending."
                    : "We’ll include this message in the delivery email."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gift-amount">Amount ({currency})</Label>
                <Input
                  id="gift-amount"
                  type="number"
                  min={minimumPrice}
                  step="0.01"
                  value={giftAmount}
                  onChange={(event) =>
                    setGiftAmount(parseFloat(event.target.value) || 0)
                  }
                  disabled={!payWhatYouWant}
                />
                <p className="text-xs text-muted-foreground">
                  {payWhatYouWant
                    ? `Minimum amount: ${formatCurrency(minimumPrice, currency)}`
                    : `Price locked at ${formatCurrency(calculatedPrice, currency)} for this release.`}
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setGiftDialogOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGiftSubmit}
                disabled={isLoading || !giftAmountIsValid}
              >
                {isLoading ? "Processing..." : "Complete Gift Checkout"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
