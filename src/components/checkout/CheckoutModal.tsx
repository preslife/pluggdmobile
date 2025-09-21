import React, { useState, useEffect } from 'react';
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
import { creditSystem, PurchaseItem } from '@/services/credits/credit-system';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  CreditCard,
  Coins,
  Download,
  Music,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PurchaseItem[];
  onSuccess?: () => void;
}

export const CheckoutModal = ({ isOpen, onClose, items, onSuccess }: CheckoutModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<'review' | 'payment' | 'success'>('review');

  const totalCost = items.reduce((sum, item) => sum + item.price, 0);
  const hasFreebies = items.some(item => item.price === 0);
  const hasPaidItems = items.some(item => item.price > 0);

  useEffect(() => {
    if (isOpen && user) {
      fetchBalance();
    }
  }, [isOpen, user]);

  const fetchBalance = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const balance = await creditSystem.getBalance(user.id);
      setCurrentBalance(balance);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit balance',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) return;

    setPurchasing(true);
    try {
      const result = await creditSystem.processPurchase(user.id, items);
      
      if (result.success) {
        toast({
          title: 'Purchase Successful!',
          description: result.message,
        });
        setStep('success');
        // Refresh balance
        await fetchBalance();
        onSuccess?.();
      } else {
        toast({
          title: 'Purchase Failed',
          description: result.message,
          variant: 'destructive'
        });
        setStep('payment');
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'An unexpected error occurred',
        variant: 'destructive'
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

  const sufficientCredits = currentBalance >= totalCost;

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
              : 'Review your order and complete purchase'
            }
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
              <Button className="flex-1" onClick={() => window.location.href = '/library'}>
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
            {/* Order Summary */}
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
                            <div className="font-semibold">
                              {item.price} credits
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div>
              <Separator />
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Items ({items.length})</span>
                  <span>{totalCost} credits</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{totalCost} credits</span>
                </div>
              </div>
              <Separator />
            </div>

            {/* Credit Balance */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary" />
                  <span className="font-medium">Your Credits</span>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="font-semibold">{currentBalance}</span>
                )}
              </div>
              
              {!loading && (
                <div className="text-sm text-muted-foreground">
                  {sufficientCredits ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Sufficient credits available</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>Need {totalCost - currentBalance} more credits</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {sufficientCredits || totalCost === 0 ? (
                <Button 
                  className="w-full" 
                  onClick={handlePurchase}
                  disabled={purchasing || loading}
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : totalCost === 0 ? (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Free Items
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Complete Purchase ({totalCost} credits)
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => window.location.href = '/credits/purchase'}
                  >
                    <Coins className="h-4 w-4 mr-2" />
                    Buy More Credits
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    You need {totalCost - currentBalance} more credits to complete this purchase
                  </p>
                </div>
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