import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditBalance } from '@/components/checkout/CreditBalance';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { creditSystem } from '@/services/credits/credit-system';
import { setMeta } from '@/lib/seo';
import { formatCurrency } from '@/lib/utils';
import {
  Coins,
  CreditCard,
  Zap,
  Crown,
  Star,
  Check,
  Loader2,
  Gift
} from 'lucide-react';
import { useEffect } from 'react';

interface CreditPackage {
  id: string;
  credits: number;
  price: number; // in cents
  displayPrice: string;
  popular?: boolean;
  bonus?: number;
  description: string;
  features: string[];
}

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    credits: 100,
    price: 999, // $9.99
    displayPrice: '$9.99',
    description: 'Perfect for getting started',
    features: [
      '100 credits',
      'Download beats & tracks',
      'Basic licenses included',
      'Email support'
    ]
  },
  {
    id: 'popular',
    credits: 300,
    price: 1999, // $19.99
    displayPrice: '$19.99',
    popular: true,
    bonus: 50,
    description: 'Most popular choice',
    features: [
      '300 credits',
      '+50 bonus credits',
      'Premium license options',
      'Priority support',
      'Exclusive content access'
    ]
  },
  {
    id: 'pro',
    credits: 500,
    price: 2999, // $29.99
    displayPrice: '$29.99',
    bonus: 100,
    description: 'For serious creators',
    features: [
      '500 credits',
      '+100 bonus credits',
      'All license types',
      'VIP support',
      'Early access to new releases',
      'Bulk download options'
    ]
  },
  {
    id: 'enterprise',
    credits: 1000,
    price: 4999, // $49.99
    displayPrice: '$49.99',
    bonus: 300,
    description: 'Maximum value',
    features: [
      '1000 credits',
      '+300 bonus credits',
      'Commercial licenses',
      'Dedicated support',
      'Custom licensing options',
      'Exclusive producer network',
      'Monthly free credits'
    ]
  }
];

const CreditsPurchase = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    setMeta(
      "Buy Credits — Pluggd",
      "Purchase credits to download beats, tracks, and exclusive content from your favorite creators.",
      "/credits/purchase"
    );
  }, []);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!user) {
      window.location.href = '/auth/login?redirect=/credits/purchase';
      return;
    }

    setPurchasing(pkg.id);
    
    try {
      const totalCredits = pkg.credits + (pkg.bonus || 0);
      const result = await creditSystem.purchaseCreditsWithStripe(
        user.id,
        totalCredits,
        pkg.price
      );

      // Redirect to Stripe Checkout would happen here
      // For now, simulate success
      toast({
        title: 'Purchase Initiated',
        description: 'Redirecting to secure checkout...'
      });
      
      // In real implementation, redirect to Stripe
      // window.location.href = stripeCheckoutUrl;
      
    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase Failed',
        description: 'Unable to initiate purchase. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#credits-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <DomainAwareNavigation />

      <main
        id="credits-content"
        className="container mx-auto max-w-7xl px-4 py-8 pt-24"
        aria-labelledby="credits-heading"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            id="credits-heading"
            className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"
          >
            Buy Credits
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Purchase credits to download exclusive beats, tracks, and content from top creators
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credit packages */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-semibold text-left mb-6">Choose your credit package</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {creditPackages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`relative transition-transform duration-300 focus-within:shadow-lg focus-within:outline focus-within:outline-2 focus-within:outline-primary/60 ${
                    pkg.popular
                      ? 'border-primary shadow-lg md:scale-[1.02]'
                      : 'md:hover:shadow-lg md:hover:scale-[1.02]'
                  }`}
                >
                  {pkg.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <div className="mb-4">
                      {pkg.id === 'starter' && <Coins className="h-12 w-12 mx-auto text-blue-500" />}
                      {pkg.id === 'popular' && <Zap className="h-12 w-12 mx-auto text-primary" />}
                      {pkg.id === 'pro' && <Crown className="h-12 w-12 mx-auto text-purple-500" />}
                      {pkg.id === 'enterprise' && <Star className="h-12 w-12 mx-auto text-amber-500" />}
                    </div>
                    
                    <CardTitle className="text-2xl mb-2">
                      {pkg.credits} Credits
                    </CardTitle>
                    
                    {pkg.bonus && (
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Badge variant="secondary" className="bg-emerald-200 text-emerald-950">
                          <Gift className="h-3 w-3 mr-1" />
                          +{pkg.bonus} Bonus
                        </Badge>
                      </div>
                    )}
                    
                    <div className="text-3xl font-bold text-primary mb-1">
                      {pkg.displayPrice}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {pkg.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button
                      type="button"
                      className="w-full min-h-[48px]"
                      size="lg"
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasing === pkg.id}
                      variant={pkg.popular ? 'default' : 'outline'}
                    >
                      {purchasing === pkg.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          Purchase Credits
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Features section */}
            <Card aria-labelledby="credits-benefits-heading">
              <CardHeader>
                <h2 id="credits-benefits-heading" className="text-2xl font-semibold leading-none tracking-tight">
                  What You Can Do With Credits
                </h2>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Coins className="h-8 w-8 text-blue-700" />
                    </div>
                    <h3 className="font-semibold mb-2">Download Beats</h3>
                    <p className="text-sm text-muted-foreground">
                      Access thousands of high-quality beats and instrumentals
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Crown className="h-8 w-8 text-emerald-700" />
                    </div>
                    <h3 className="font-semibold mb-2">Premium Content</h3>
                    <p className="text-sm text-muted-foreground">
                      Get exclusive tracks and early access to new releases
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <Star className="h-8 w-8 text-purple-700" />
                    </div>
                    <h3 className="font-semibold mb-2">Support Creators</h3>
                    <p className="text-sm text-muted-foreground">
                      Directly support your favorite artists and producers
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-1" aria-label="Credit balance and history">
            <CreditBalance showTransactions={true} className="w-full" />
          </aside>
        </div>

        {/* FAQ Section */}
        <Card className="mt-12" aria-labelledby="credits-faq-heading">
          <CardHeader>
            <h2 id="credits-faq-heading" className="text-2xl font-semibold leading-none tracking-tight">
              Frequently Asked Questions
            </h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-lg">How do credits work?</h3>
              <p className="text-sm text-muted-foreground">
                Credits are our platform currency. Use them to purchase beats, tracks, and exclusive content.
                Each item shows its credit cost upfront.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">Do credits expire?</h3>
              <p className="text-sm text-muted-foreground">
                No! Your credits never expire. Purchase once and use them whenever you're ready.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">Can I get a refund?</h3>
              <p className="text-sm text-muted-foreground">
                Unused credits can be refunded within 30 days. Once you've used credits to purchase content,
                those specific credits cannot be refunded.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2 text-lg">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, debit cards, and PayPal through our secure Stripe integration.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreditsPurchase;