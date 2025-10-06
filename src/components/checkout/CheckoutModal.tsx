import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  creditSystem,
  type PurchaseItem,
  type WalletBalanceSummary,
} from '@/services/credits/credit-system';
import { creditPolicyService } from '@/services/credits/credit-policy';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  CreditCard,
  Coins,
  Download,
  Music,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PurchaseItem[];
  onSuccess?: () => void;
}

const DEFAULT_MAX_CART_PERCENT = 0.5;
const CREDITS_PER_GBP = 100;

export const CheckoutModal = ({ isOpen, onClose, items, onSuccess }: CheckoutModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balanceSummary, setBalanceSummary] = useState<WalletBalanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');
  const [creditsToApply, setCreditsToApply] = useState(0);
  const [maxCartPercent, setMaxCartPercent] = useState(DEFAULT_MAX_CART_PERCENT);
  const [policyLoading, setPolicyLoading] = useState(false);

  const totalCost = items.reduce((sum, item) => sum + item.price, 0);

  useEffect(() => {
    if (isOpen && user) {
      fetchBalance();
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      fetchPolicy();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!balanceSummary || !isOpen) return;

    const cap = Math.max(
      Math.min(
        Math.floor(totalCost * maxCartPercent),
        balanceSummary.available_credits,
        totalCost,
      ),
      0,
    );

    setCreditsToApply(cap > 0 ? cap : 0);
  }, [balanceSummary, totalCost, isOpen, maxCartPercent]);

  const fetchBalance = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const balance = await creditSystem.getBalanceSummary(user.id);
      setBalanceSummary(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit balance',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPolicy = async () => {
    setPolicyLoading(true);
    try {
      const policy = await creditPolicyService.getCurrentPolicy();
      if (policy?.maxCartPercent && Number.isFinite(policy.maxCartPercent)) {
        setMaxCartPercent(Math.min(Math.max(policy.maxCartPercent, 0), 1));
      } else {
        setMaxCartPercent(DEFAULT_MAX_CART_PERCENT);
      }
    } catch (error) {
      console.error('Error fetching credit policy:', error);
      setMaxCartPercent(DEFAULT_MAX_CART_PERCENT);
    } finally {
      setPolicyLoading(false);
    }
  };

  const creditCap = useMemo(() => {
    if (!balanceSummary) return 0;
    return Math.max(
      Math.min(
        Math.floor(totalCost * maxCartPercent),
        balanceSummary.available_credits,
        totalCost,
      ),
      0,
    );
  }, [balanceSummary, totalCost, maxCartPercent]);

  const cashDuePreview = useMemo(() => {
    return Math.max(totalCost - creditsToApply, 0);
  }, [totalCost, creditsToApply]);

  const hasCashComponent = cashDuePreview > 0;
  const canCompleteWithCredits = cashDuePreview === 0;
  const policyPercentDisplay = Math.round(maxCartPercent * 100);

  const createHybridCheckout = async (cashDueCredits: number) => {
    if (!user || cashDueCredits <= 0) return null;

    const payload = {
      manualAmountCredits: cashDueCredits,
      paymentMetadata: {
        transaction_type: 'hybrid_purchase',
        user_id: user.id,
        credits_applied: creditsToApply,
        total_cost_credits: totalCost,
        max_credit_percentage: maxCartPercent,
        items: items.map((item) => ({
          id: item.id,
          type: item.type,
          title: item.title,
          price: item.price,
          license_type: item.license_type,
          metadata: item.metadata || {},
        })),
      },
    };

    const { data, error } = await supabase.functions.invoke('enhanced-store-checkout', {
      body: payload,
    });

    if (error) {
      throw new Error(error.message || 'Failed to initiate Stripe checkout');
    }

    return data as { url: string; sessionId: string; paymentIntentId?: string | null };
  };

  const handlePurchase = async () => {
    if (!user || !balanceSummary) return;

    setPurchasing(true);
    try {
      const desiredCredits = Math.min(creditsToApply, creditCap);
      const cashDueCredits = Math.max(totalCost - desiredCredits, 0);

      let checkoutSession:
        | { url: string; sessionId: string; paymentIntentId?: string | null }
        | null = null;

      if (cashDueCredits > 0) {
        checkoutSession = await createHybridCheckout(cashDueCredits);
      }

      const result = await creditSystem.processPurchase(user.id, items, {
        requestedCredits: desiredCredits,
        maxCreditPercentage: maxCartPercent,
        cartTotal: totalCost,
        stripePaymentIntentId: checkoutSession?.paymentIntentId ?? undefined,
        stripeCheckoutSessionId: checkoutSession?.sessionId ?? undefined,
      });

      if (result.cashDue > 0) {
        if (checkoutSession?.url) {
          toast({
            title: 'Continue to Payment',
            description: `You will be redirected to complete the remaining ${formatCurrency(result.cashDue / CREDITS_PER_GBP)} by card.`,
          });
          setStep('payment');
          window.location.href = checkoutSession.url;
        } else {
          throw new Error('Unable to start Stripe checkout for remaining balance');
        }
      } else {
        toast({
          title: 'Purchase Successful!',
          description: result.message,
        });
        setStep('success');
        await fetchBalance();
        onSuccess?.();
      }
    } catch (error) {
      console.error('Purchase error:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Purchase Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleClose = () => {
    setStep('review');
    onClose();
  };

  if (!user) {
    return null;
  }

  const checkoutButtonLabel = () => {
    if (totalCost === 0) {
      return (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Free Items
        </>
      );
    }

    if (canCompleteWithCredits) {
      return (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          Complete Purchase ({creditsToApply} credits)
        </>
      );
    }

    return (
      <>
        <CreditCard className="h-4 w-4 mr-2" />
        Apply {creditsToApply} credits & pay {formatCurrency(cashDuePreview / CREDITS_PER_GBP)}
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {step === 'success' ? 'Purchase Complete!' : 'Checkout'}
          </DialogTitle>
          <DialogDescription>
            {step === 'success'
              ? 'Your items are now available in your library'
              : 'Review your order and complete purchase'}
          </DialogDescription>
        </DialogHeader>

        {step === 'success' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Download Ready!</h3>
                <p className="text-sm text-muted-foreground">
                  Your purchased items are now available in your library.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => (window.location.href = '/library')}>
                <Download className="h-4 w-4 mr-2" />
                Go to Library
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Music className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.type}
                              {item.license_type && ` • ${item.license_type} license`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {item.price === 0 ? (
                            <Badge variant="secondary">Free</Badge>
                          ) : (
                            <div className="font-semibold">{item.price} credits</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <Separator />
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Items ({items.length})</span>
                  <span>{totalCost} credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Credits applied</span>
                  <span>-{creditsToApply} credits</span>
                </div>
                {hasCashComponent && (
                  <div className="flex justify-between text-sm">
                    <span>Card payment due</span>
                    <span>{formatCurrency(cashDuePreview / CREDITS_PER_GBP)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total due</span>
                  <span>
                    {canCompleteWithCredits
                      ? `${creditsToApply} credits`
                      : `${creditsToApply} credits + ${formatCurrency(cashDuePreview / CREDITS_PER_GBP)}`}
                  </span>
                </div>
              </div>
              <Separator />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-medium">Your Credits</span>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold">{balanceSummary?.available_credits ?? 0}</span>
                )}
              </div>

              {!loading && (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    {creditCap > 0 ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span>
                      {policyLoading
                        ? 'Checking credit policy...'
                        : creditCap > 0
                        ? `You can apply up to ${creditCap} credits (${policyPercentDisplay}% cap).`
                        : 'Add more credits to reduce the card payment.'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span>Credits applied</span>
                      <span>{creditsToApply} credits</span>
                    </div>
                    <Slider
                      value={[Math.min(creditsToApply, creditCap)]}
                      onValueChange={([value]) => setCreditsToApply(Math.min(value, creditCap))}
                      max={Math.max(creditCap, 0)}
                      min={0}
                      step={1}
                      disabled={creditCap === 0}
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>{creditCap} credits</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={handlePurchase}
                disabled={
                  purchasing ||
                  loading ||
                  (totalCost > 0 && (!balanceSummary || policyLoading))
                }
              >
                {purchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  checkoutButtonLabel()
                )}
              </Button>

              {!canCompleteWithCredits && (
                <p className="text-xs text-center text-muted-foreground">
                  Remaining balance: {formatCurrency(cashDuePreview / CREDITS_PER_GBP)} will be charged via Stripe.
                </p>
              )}

              <Button variant="outline" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
