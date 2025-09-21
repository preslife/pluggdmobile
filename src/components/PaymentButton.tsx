import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, CreditCard, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';

interface PaymentButtonProps {
  beatId: string;
  beatTitle: string;
  price: number;
  artistName: string;
  onPurchaseComplete?: () => void;
  className?: string;
}

export const PaymentButton: React.FC<PaymentButtonProps> = ({
  beatId,
  beatTitle,
  price,
  artistName,
  onPurchaseComplete,
  className = ""
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [purchased, setPurchased] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to purchase beats",
        variant: "destructive"
      });
      return;
    }

    if (price === 0) {
      // Free download
      await handleFreeDownload();
      return;
    }

    setProcessing(true);
    
    try {
      await processStripePayment();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Something went wrong with your payment",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFreeDownload = async () => {
    setProcessing(true);
    try {
      await recordPurchase(0);
      setPurchased(true);
      toast({
        title: "Download started!",
        description: `${beatTitle} is now available in your library`
      });
      onPurchaseComplete?.();
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const processStripePayment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          beatId,
          beatTitle,
          price,
          artistName
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: "Redirecting to payment...",
          description: "Complete your purchase in the new tab that opened."
        });
      }
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      throw new Error(error.message || "Failed to initiate payment");
    }
  };

  const recordPurchase = async (amount: number) => {
    const { error } = await supabase
      .from('purchases')
      .insert([{
        buyer_id: user!.id,
        beat_id: beatId,
        amount: amount
      }]);

    if (error) throw error;
  };

  if (purchased) {
    return (
      <Card className={`bg-green-50 border-green-200 ${className}`}>
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center space-x-2 text-green-700">
            <Check className="w-5 h-5" />
            <span className="font-medium">Purchased</span>
          </div>
          <p className="text-sm text-green-600 mt-1">
            Available in your library
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Price Display */}
      <div className="text-center">
        {price === 0 ? (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            FREE
          </Badge>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(price)}
            </div>
            <p className="text-sm text-muted-foreground">
              One-time purchase
            </p>
          </div>
        )}
      </div>

      {/* Purchase Button */}
      <Button
        onClick={handlePurchase}
        disabled={processing}
        className="w-full"
        variant={price === 0 ? "outline" : "hero"}
      >
        {processing ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{price === 0 ? 'Downloading...' : 'Processing...'}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            {price === 0 ? (
              <>
                <ShoppingCart className="w-4 h-4" />
                <span>Download Free</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Buy Now</span>
              </>
            )}
          </div>
        )}
      </Button>

      {/* Security Notice */}
      {price > 0 && (
        <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
          <AlertCircle className="w-3 h-3" />
          <span>Secure payment powered by Stripe</span>
        </div>
      )}

      {/* License Info */}
      <div className="text-xs text-muted-foreground text-center space-y-1">
        <p>Includes:</p>
        <ul className="space-y-0.5">
          <li>• High-quality audio file</li>
          <li>• Basic licensing rights</li>
          <li>• Unlimited downloads</li>
          {price > 0 && <li>• Commercial use permitted</li>}
        </ul>
      </div>
    </div>
  );
};