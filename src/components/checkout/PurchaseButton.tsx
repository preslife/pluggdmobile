import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckoutModal } from './CheckoutModal';
import { useAuth } from '@/hooks/useAuth';
import { creditSystem, PurchaseItem } from '@/services/credits/credit-system';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  Download,
  Check,
  Loader2,
  Lock
} from 'lucide-react';

interface PurchaseButtonProps {
  item: {
    id: string;
    type: 'beat' | 'release' | 'pack' | 'license';
    title: string;
    price: number;
    license_type?: 'basic' | 'premium' | 'exclusive';
    metadata?: Record<string, any>;
  };
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onPurchaseComplete?: () => void;
  showPrice?: boolean;
  requireAuth?: boolean;
}

export const PurchaseButton = ({ 
  item, 
  variant = 'default',
  size = 'default',
  className,
  onPurchaseComplete,
  showPrice = true,
  requireAuth = true
}: PurchaseButtonProps) => {
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [hasAlreadyPurchased, setHasAlreadyPurchased] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user && item.price > 0) {
      checkPurchaseStatus();
    }
  }, [user, item.id]);

  const checkPurchaseStatus = async () => {
    if (!user) return;
    
    setChecking(true);
    try {
      const purchased = await creditSystem.hasPurchased(user.id, item.id);
      setHasAlreadyPurchased(purchased);
    } catch (error) {
      console.error('Error checking purchase status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleClick = () => {
    if (!user && requireAuth) {
      // Redirect to login
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.href);
      return;
    }

    if (hasAlreadyPurchased) {
      // Redirect to library/downloads
      window.location.href = '/library';
      return;
    }

    setCheckoutOpen(true);
  };

  const handlePurchaseSuccess = () => {
    setHasAlreadyPurchased(true);
    setCheckoutOpen(false);
    onPurchaseComplete?.();
  };

  // If user hasn't logged in and auth is required
  if (!user && requireAuth) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <Lock className="h-4 w-4 mr-2" />
        Sign In to {item.price === 0 ? 'Download' : 'Purchase'}
      </Button>
    );
  }

  // If already purchased
  if (hasAlreadyPurchased) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        onClick={handleClick}
      >
        <Check className="h-4 w-4 mr-2" />
        Owned - Download
      </Button>
    );
  }

  // If checking purchase status
  if (checking) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Checking...
      </Button>
    );
  }

  // Free item
  if (item.price === 0) {
    return (
      <>
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleClick}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Free
        </Button>
        
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          items={[item]}
          onSuccess={handlePurchaseSuccess}
        />
      </>
    );
  }

  // Paid item
  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {showPrice ? `Buy for ${item.price} credits` : 'Purchase'}
      </Button>
      
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={[item]}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
};

interface BulkPurchaseButtonProps {
  items: PurchaseItem[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onPurchaseComplete?: () => void;
  children?: React.ReactNode;
}

export const BulkPurchaseButton = ({ 
  items,
  variant = 'default',
  size = 'default',
  className,
  onPurchaseComplete,
  children
}: BulkPurchaseButtonProps) => {
  const { user } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalCost = items.reduce((sum, item) => sum + item.price, 0);
  const freeItemsCount = items.filter(item => item.price === 0).length;
  const paidItemsCount = items.length - freeItemsCount;

  const handleClick = () => {
    if (!user) {
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.href);
      return;
    }

    setCheckoutOpen(true);
  };

  const handlePurchaseSuccess = () => {
    setCheckoutOpen(false);
    onPurchaseComplete?.();
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={handleClick}
      >
        {children || (
          <>
            <ShoppingCart className="h-4 w-4 mr-2" />
            {totalCost === 0 ? (
              `Download ${items.length} Items`
            ) : (
              `Buy ${items.length} Items (${totalCost} credits)`
            )}
          </>
        )}
      </Button>
      
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={items}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
};