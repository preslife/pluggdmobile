import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, Loader2 } from 'lucide-react';

interface DirectBuyButtonProps {
  releaseId: string;
  price: number;
  title: string;
  artist: string;
  isPayWhatYouWant?: boolean;
  minimumPrice?: number;
  disabled?: boolean;
  className?: string;
}

export const DirectBuyButton = ({ 
  releaseId, 
  price, 
  title, 
  artist,
  isPayWhatYouWant = false,
  minimumPrice = 0,
  disabled = false,
  className = ''
}: DirectBuyButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to purchase releases',
        variant: 'destructive',
      });
      return;
    }

    setPurchasing(true);
    try {
      // Get referral code from URL if present
      const urlParams = new URLSearchParams(window.location.search);
      const referrerCode = urlParams.get('ref');

      const { data, error } = await supabase.functions.invoke('create-release-purchase', {
        body: {
          release_id: releaseId,
          amount: price,
          referrer_code: referrerCode
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        
        toast({
          title: 'Redirecting to Payment',
          description: 'Opening secure checkout in a new tab...',
        });
      } else {
        toast({
          title: 'Purchase Successful!',
          description: 'Your download is now available in your dashboard',
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'Unable to process your purchase. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (price === 0) {
    return (
      <Button 
        onClick={handlePurchase}
        disabled={disabled || purchasing}
        className={className}
      >
        {purchasing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <ShoppingCart className="w-4 h-4 mr-2" />
        )}
        Download Free
      </Button>
    );
  }

  return (
    <Button 
      onClick={handlePurchase}
      disabled={disabled || purchasing}
      className={className}
    >
      {purchasing ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ShoppingCart className="w-4 h-4 mr-2" />
      )}
      Buy {formatCurrency(price)}
    </Button>
  );
};