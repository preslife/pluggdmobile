import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  type PurchaseItemType,
  type WalletBalanceSummary,
} from '@/services/credits/credit-system';
import { creditPolicyService } from '@/services/credits/credit-policy';
import { Slider } from '@/components/ui/slider';
import { formatCurrency } from '@/lib/utils';
import { logger } from '@/lib/logger';
import {
  ShoppingCart,
  CreditCard,
  Coins,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Music,
  AudioWaveform,
  Package,
  BadgeCheck,
  GraduationCap,
  Shirt,
  Monitor,
  Cloud,
  Box,
  Cpu,
  Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PurchaseItem[];
  onSuccess?: () => void;
}

const DEFAULT_MAX_CART_PERCENT = 0.5;
const CREDITS_PER_GBP = 100;

interface TaxQuote {
  currency: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  taxRate: number;
}

type PollResult =
  | { status: 'success'; paymentIntentId: string | null }
  | { status: 'expired' | 'timeout' | 'error'; message: string; paymentIntentId: string | null }
  | { status: 'cancelled'; paymentIntentId: string | null };

export interface PurchaseTypeDisplayConfig {
  label: string;
  icon: LucideIcon;
  accentClass: string;
}

export const PURCHASE_TYPE_CONFIG = {
  release: {
    label: 'Release',
    icon: Music,
    accentClass: 'bg-purple-100 text-purple-600',
  },
  beat: {
    label: 'Beat',
    icon: AudioWaveform,
    accentClass: 'bg-blue-100 text-blue-600',
  },
  sample_pack: {
    label: 'Sample Pack',
    icon: Package,
    accentClass: 'bg-amber-100 text-amber-600',
  },
  membership: {
    label: 'Membership',
    icon: BadgeCheck,
    accentClass: 'bg-green-100 text-green-600',
  },
  course: {
    label: 'Course',
    icon: GraduationCap,
    accentClass: 'bg-pink-100 text-pink-600',
  },
  merchandise: {
    label: 'Merchandise',
    icon: Shirt,
    accentClass: 'bg-orange-100 text-orange-600',
  },
  digital_download: {
    label: 'Digital Download',
    icon: Download,
    accentClass: 'bg-cyan-100 text-cyan-600',
  },
  software: {
    label: 'Software',
    icon: Monitor,
    accentClass: 'bg-slate-100 text-slate-600',
  },
  digital: {
    label: 'Digital Product',
    icon: Cloud,
    accentClass: 'bg-sky-100 text-sky-600',
  },
  physical: {
    label: 'Physical Product',
    icon: Box,
    accentClass: 'bg-yellow-100 text-yellow-600',
  },
  hardware: {
    label: 'Hardware',
    icon: Cpu,
    accentClass: 'bg-indigo-100 text-indigo-600',
  },
  bundle: {
    label: 'Bundle',
    icon: Layers,
    accentClass: 'bg-teal-100 text-teal-600',
  },
} satisfies Record<PurchaseItemType, PurchaseTypeDisplayConfig>;

const FALLBACK_PURCHASE_TYPE_CONFIG: PurchaseTypeDisplayConfig = {
  label: 'Product',
  icon: FileText,
  accentClass: 'bg-muted text-muted-foreground',
};

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

export const getPurchaseTypeConfig = (type: PurchaseItemType): PurchaseTypeDisplayConfig => {
  const config = PURCHASE_TYPE_CONFIG[type];
  if (!config) {
    console.warn(`Missing purchase type config for "${type}"`);
  }
  return config ?? FALLBACK_PURCHASE_TYPE_CONFIG;
};

const formatLicenseLabel = (license?: PurchaseItem['license_type']) => {
  switch (license) {
    case 'basic':
      return 'Basic license';
    case 'premium':
      return 'Premium license';
    case 'exclusive':
      return 'Exclusive license';
    default:
      return null;
  }
};

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
  const [taxLoading, setTaxLoading] = useState(false);
  const [taxQuote, setTaxQuote] = useState<TaxQuote | null>(null);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(null);
  const [completedPaymentIntentId, setCompletedPaymentIntentId] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);
  const [pollMessage, setPollMessage] = useState('');
  const [pollIntroMessage, setPollIntroMessage] = useState('');
  const [pollError, setPollError] = useState<string | null>(null);
  const pollAbortRef = useRef(false);
  const paymentWindowOpenedRef = useRef(false);

  const checkoutItems = useMemo<PurchaseItem[]>(() => {
    return items.map((item) => {
      const config = getPurchaseTypeConfig(item.type);
      const metadata = {
        type_label: config.label,
        ...(item.metadata ?? {}),
      };

      return {
        ...item,
        metadata,
      };
    });
  }, [items]);

  const totalCost = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.price, 0),
    [checkoutItems],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void logger.userAction('checkout_modal_opened', 'CheckoutModal', {
      item_count: checkoutItems.length,
      total_cost_credits: totalCost,
      has_authenticated_user: Boolean(user?.id),
      item_types: checkoutItems.map((item) => item.type),
    });
  }, [checkoutItems, isOpen, totalCost, user?.id]);

  const cashDuePreview = useMemo(() => {
    return Math.max(totalCost - creditsToApply, 0);
  }, [totalCost, creditsToApply]);

  const hasCashComponent = cashDuePreview > 0;
  const canCompleteWithCredits = cashDuePreview === 0;

  const fetchTaxEstimate = useCallback(
    async (cashDueCredits: number, { force = false }: { force?: boolean } = {}): Promise<TaxQuote | null> => {
      const amountMinor = Math.max(Math.round((cashDueCredits / CREDITS_PER_GBP) * 100), 0);

      if (amountMinor <= 0) {
        setTaxQuote(null);
        setTaxError(null);
        return null;
      }

      if (!force && taxQuote && taxQuote.subtotalMinor === amountMinor) {
        return taxQuote;
      }

      setTaxLoading(true);
      setTaxError(null);
      setLiveMessage('Calculating taxes for your purchase...');

      let loggedTaxError = false;

      try {
        void logger.info('checkout_tax_estimate_start', {
          cash_due_credits: cashDueCredits,
          amount_minor: amountMinor,
        });
        const { data, error } = await supabase.functions.invoke('estimate-tax', {
          body: {
            amount_minor: amountMinor,
            currency: 'gbp',
          },
        });

        if (error) {
          void logger.error('checkout_tax_estimate_failed', {
            cash_due_credits: cashDueCredits,
          }, toError(error));
          loggedTaxError = true;
          throw error;
        }

        const normalized: TaxQuote = {
          currency: typeof data?.currency === 'string' ? data.currency : 'gbp',
          subtotalMinor: typeof data?.subtotal_minor === 'number' ? data.subtotal_minor : amountMinor,
          taxMinor: typeof data?.tax_minor === 'number' ? data.tax_minor : 0,
          totalMinor: typeof data?.total_minor === 'number' ? data.total_minor : amountMinor,
          taxRate:
            typeof data?.tax_rate === 'number' && Number.isFinite(data.tax_rate) ? data.tax_rate : 0,
        };

        setTaxQuote(normalized);
        setLiveMessage('Tax estimate ready.');
        void logger.info('checkout_tax_estimate_success', {
          cash_due_credits: cashDueCredits,
          currency: normalized.currency,
          subtotal_minor: normalized.subtotalMinor,
          tax_minor: normalized.taxMinor,
          total_minor: normalized.totalMinor,
          tax_rate: normalized.taxRate,
        });
        return normalized;
      } catch (error) {
        console.error('Tax estimation error:', error);
        setTaxError('Unable to load a tax estimate. Tax will be finalized during payment.');
        setLiveMessage('Unable to load the tax estimate automatically.');
        setTaxQuote(null);
        if (!loggedTaxError) {
          void logger.error('checkout_tax_estimate_unhandled_failure', {
            cash_due_credits: cashDueCredits,
          }, toError(error));
        }
        return null;
      } finally {
        setTaxLoading(false);
      }
    },
    [taxQuote],
  );

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (!hasCashComponent) {
      setTaxQuote(null);
      setTaxError(null);
      return;
    }

    fetchTaxEstimate(cashDuePreview).catch((error) => {
      console.error('Preloading tax estimate failed:', error);
    });
  }, [isOpen, hasCashComponent, cashDuePreview, fetchTaxEstimate]);

  useEffect(() => {
    if (step === 'payment' && checkoutUrl && !paymentWindowOpenedRef.current) {
      const paymentWindow = window.open(checkoutUrl, '_blank', 'noopener');
      paymentWindowOpenedRef.current = true;
      if (!paymentWindow) {
        window.location.href = checkoutUrl;
        setPollMessage((current) =>
          current || 'Click the button below to open the secure payment page and finish checkout.',
        );
      } else {
        setPollMessage((current) =>
          current || 'A secure Stripe tab has opened. Complete the payment to continue.',
        );
      }
    }
  }, [checkoutUrl, step]);

  useEffect(() => {
    return () => {
      pollAbortRef.current = true;
    };
  }, []);

  const fetchBalance = async () => {
    if (!user) return;

    setLoading(true);
    void logger.info('checkout_balance_fetch_start', {
      user_id: user.id,
    });
    try {
      const balance = await creditSystem.getBalanceSummary(user.id);
      setBalanceSummary(balance);
      void logger.info('checkout_balance_fetch_success', {
        user_id: user.id,
        available_credits: balance.available_credits,
        held_credits: balance.held_credits,
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
      void logger.error('checkout_balance_fetch_failed', {
        user_id: user.id,
      }, toError(error));
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
    void logger.info('checkout_credit_policy_fetch_start', {});
    try {
      const policy = await creditPolicyService.getCurrentPolicy();
      if (policy?.maxCartPercent && Number.isFinite(policy.maxCartPercent)) {
        setMaxCartPercent(Math.min(Math.max(policy.maxCartPercent, 0), 1));
        void logger.info('checkout_credit_policy_fetch_success', {
          max_cart_percent: policy.maxCartPercent,
        });
      } else {
        setMaxCartPercent(DEFAULT_MAX_CART_PERCENT);
        void logger.warn('checkout_credit_policy_missing', {
          received_value: policy?.maxCartPercent,
        });
      }
    } catch (error) {
      console.error('Error fetching credit policy:', error);
      setMaxCartPercent(DEFAULT_MAX_CART_PERCENT);
      void logger.error('checkout_credit_policy_fetch_failed', {}, toError(error));
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

  const taxCurrency = taxQuote?.currency?.toUpperCase?.() ?? 'GBP';
  const subtotalCurrency = totalCost / CREDITS_PER_GBP;
  const baseCashDueCurrency = cashDuePreview / CREDITS_PER_GBP;
  const taxAmountCurrency = (taxQuote?.taxMinor ?? 0) / 100;
  const totalCashDueCurrency = baseCashDueCurrency + taxAmountCurrency;
  const totalCashDueCreditsWithTax = Math.round(totalCashDueCurrency * CREDITS_PER_GBP);
  const policyPercentDisplay = Math.round(maxCartPercent * 100);

  const resetPollingState = useCallback(() => {
    pollAbortRef.current = true;
    setPolling(false);
    setPollAttempts(0);
    setPollMessage('');
    setPollError(null);
    setPollIntroMessage('');
    setCheckoutUrl(null);
    setCheckoutSessionId(null);
    paymentWindowOpenedRef.current = false;
  }, []);

  const createHybridCheckout = useCallback(
    async (
      cashDueCredits: number,
      options: {
        taxDetails?: TaxQuote | null;
        appliedCredits: number;
        baseCashDueCredits: number;
      },
    ) => {
      if (!user || cashDueCredits <= 0) return null;

      const payload = {
        manualAmountCredits: cashDueCredits,
        paymentMetadata: {
          transaction_type: 'hybrid_purchase',
          user_id: user.id,
          credits_applied: creditsToApply,
          total_cost_credits: totalCost,
          max_credit_percentage: maxCartPercent,
          items: checkoutItems.map((item) => ({
            id: item.id,
            type: item.type,
            title: item.title,
            price: item.price,
            license_type: item.license_type,
            metadata: item.metadata || {},
          })),
          cash_due_before_tax_credits: options.baseCashDueCredits,
          cash_due_total_credits: cashDueCredits,
          tax_currency: options.taxDetails?.currency,
          tax_rate: options.taxDetails?.taxRate,
          tax_minor: options.taxDetails?.taxMinor,
          subtotal_minor: options.taxDetails?.subtotalMinor,
          total_minor: options.taxDetails?.totalMinor,
          credits_applied_effective: options.appliedCredits,
        },
      };

      void logger.info('checkout_hybrid_session_request', {
        user_id: user.id,
        session_cash_due_credits: cashDueCredits,
        items: checkoutItems.map((item) => ({
          id: item.id,
          type: item.type,
          price: item.price,
        })),
      });

      const { data, error } = await supabase.functions.invoke('enhanced-store-checkout', {
        body: payload,
      });

      if (error) {
        void logger.error('checkout_hybrid_session_failed', {
          user_id: user.id,
          session_cash_due_credits: cashDueCredits,
        }, toError(error));
        throw new Error(error.message || 'Failed to initiate Stripe checkout');
      }

      if (data) {
        void logger.info('checkout_hybrid_session_success', {
          user_id: user.id,
          session_cash_due_credits: cashDueCredits,
          has_payment_intent: Boolean((data as { paymentIntentId?: string | null })?.paymentIntentId),
        });
      }

      return data as { url: string; sessionId: string; paymentIntentId?: string | null };
    },
    [checkoutItems, creditsToApply, maxCartPercent, totalCost, user],
  );

  const startPolling = useCallback(
    async (sessionId: string, paymentIntentId?: string | null): Promise<PollResult> => {
      pollAbortRef.current = false;
      setPolling(true);
      setPollAttempts(0);
      setPollError(null);
      setPollMessage('Starting payment status checks...');
      setLiveMessage('Waiting for payment confirmation from Stripe...');

      void logger.info('checkout_payment_poll_start', {
        session_id: sessionId,
        initial_payment_intent_id: paymentIntentId ?? null,
      });

      const maxAttempts = 20;
      const delayMs = 3000;
      let latestPaymentIntentId = paymentIntentId ?? null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (pollAbortRef.current) {
          setPolling(false);
          void logger.warn('checkout_payment_poll_cancelled', {
            session_id: sessionId,
            latest_payment_intent_id: latestPaymentIntentId,
            attempt,
            phase: 'pre-request',
          });
          return { status: 'cancelled', paymentIntentId: latestPaymentIntentId };
        }

        setPollAttempts(attempt);
        setPollMessage(`Checking payment status (attempt ${attempt}/${maxAttempts})...`);

        try {
          const { data, error } = await supabase.functions.invoke('get-checkout-session', {
            body: { sessionId },
          });

          if (pollAbortRef.current) {
            setPolling(false);
            void logger.warn('checkout_payment_poll_cancelled', {
              session_id: sessionId,
              latest_payment_intent_id: latestPaymentIntentId,
            });
            return { status: 'cancelled', paymentIntentId: latestPaymentIntentId };
          }

          if (error) {
            console.error('Checkout polling error:', error);
            setPollError('Unable to reach Stripe. Retrying...');
            void logger.error('checkout_payment_poll_attempt_failed', {
              session_id: sessionId,
              attempt,
            }, toError(error));
          } else if (data) {
            if (typeof data.payment_intent_id === 'string') {
              latestPaymentIntentId = data.payment_intent_id;
            }

            if (data.payment_status === 'paid' || data.status === 'complete') {
              setLiveMessage('Payment confirmed. Finalizing your order...');
              setPolling(false);
              setPollError(null);
              setPollMessage('Payment confirmed! Finalizing...');
              void logger.info('checkout_payment_poll_success', {
                session_id: sessionId,
                payment_intent_id: latestPaymentIntentId,
                attempts: attempt,
              });
              return { status: 'success', paymentIntentId: latestPaymentIntentId };
            }

            if (data.status === 'expired' || data.payment_status === 'unpaid') {
              setPollError('The checkout session expired before completion.');
              setPolling(false);
              setLiveMessage('Payment session expired before completion.');
              void logger.warn('checkout_payment_poll_expired', {
                session_id: sessionId,
                payment_intent_id: latestPaymentIntentId,
                attempts: attempt,
              });
              return {
                status: 'expired',
                message: 'The checkout session expired before completion.',
                paymentIntentId: latestPaymentIntentId,
              };
            }
          }
        } catch (error) {
          console.error('Unexpected polling error:', error);
          setPollError('An unexpected error occurred while checking payment status.');
          void logger.error('checkout_payment_poll_unexpected_error', {
            session_id: sessionId,
            attempt,
          }, toError(error));
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      setPolling(false);
      setLiveMessage('Timed out while waiting for payment confirmation.');
      void logger.warn('checkout_payment_poll_timeout', {
        session_id: sessionId,
        payment_intent_id: latestPaymentIntentId,
        attempts: maxAttempts,
      });
      return {
        status: 'timeout',
        message: 'We could not confirm the payment in time. Please refresh or try again.',
        paymentIntentId: latestPaymentIntentId,
      };
    },
    [setLiveMessage],
  );

  const openPaymentPage = useCallback(() => {
    if (!checkoutUrl) return;

    const newWindow = window.open(checkoutUrl, '_blank', 'noopener');
    if (!newWindow) {
      window.location.href = checkoutUrl;
    } else {
      newWindow.focus();
    }
  }, [checkoutUrl]);

  const handlePurchase = async () => {
    if (!user || !balanceSummary) return;

    setPurchasing(true);
    setLiveMessage('Processing your purchase...');
    resetPollingState();
    setCompletedPaymentIntentId(null);
    setReceiptUrl(null);

    void logger.userAction('checkout_purchase_attempt', 'CheckoutModal', {
      user_id: user.id,
      item_count: checkoutItems.length,
      total_cost_credits: totalCost,
      desired_credits: creditsToApply,
      available_credits: balanceSummary.available_credits,
    });

    try {
      const desiredCredits = Math.min(creditsToApply, creditCap);
      const baseCashDueCredits = Math.max(totalCost - desiredCredits, 0);

      let taxDetails: TaxQuote | null = null;
      let checkoutSession:
        | { url: string; sessionId: string; paymentIntentId?: string | null }
        | null = null;
      let totalManualCredits = baseCashDueCredits;

      if (baseCashDueCredits > 0) {
        taxDetails = await fetchTaxEstimate(baseCashDueCredits, { force: true });
        const taxCredits = taxDetails ? Math.round(((taxDetails.taxMinor ?? 0) / 100) * CREDITS_PER_GBP) : 0;
        totalManualCredits = baseCashDueCredits + taxCredits;

        checkoutSession = await createHybridCheckout(totalManualCredits, {
          taxDetails,
          appliedCredits: desiredCredits,
          baseCashDueCredits,
        });

        if (checkoutSession) {
          setCheckoutUrl(checkoutSession.url);
          setCheckoutSessionId(checkoutSession.sessionId);
          setPollIntroMessage('Complete your payment in the secure Stripe checkout. We will confirm once the payment succeeds.');
          setPollMessage('Waiting for you to complete payment...');
          paymentWindowOpenedRef.current = false;
        }
      }

      const result = await creditSystem.processPurchase(user.id, checkoutItems, {
        requestedCredits: desiredCredits,
        maxCreditPercentage: maxCartPercent,
        cartTotal: totalCost,
        stripePaymentIntentId: checkoutSession?.paymentIntentId ?? undefined,
        stripeCheckoutSessionId: checkoutSession?.sessionId ?? undefined,
      });

      void logger.info('checkout_purchase_processed', {
        user_id: user.id,
        item_count: checkoutItems.length,
        requested_credits: desiredCredits,
        cash_due_credits: result.cashDue,
        requires_cash_component: result.cashDue > 0,
      });

      if (result.cashDue > 0) {
        if (checkoutSession?.url && checkoutSession.sessionId) {
          const estimatedTotal = taxDetails
            ? formatCurrency((taxDetails.totalMinor ?? 0) / 100, taxDetails.currency?.toUpperCase?.() ?? 'GBP')
            : formatCurrency(baseCashDueCurrency, 'GBP');

          toast({
            title: 'Complete Your Payment',
            description: `A secure Stripe window will open to charge ${estimatedTotal}. Finish the payment to access your downloads.`,
          });

          setStep('payment');
          setPurchasing(false);

          void logger.info('checkout_purchase_waiting_for_stripe', {
            user_id: user.id,
            session_id: checkoutSession.sessionId,
            payment_intent_id: checkoutSession.paymentIntentId ?? null,
          });

          const pollResult = await startPolling(checkoutSession.sessionId, checkoutSession.paymentIntentId ?? null);

          if (pollResult.status === 'success') {
            setCompletedPaymentIntentId(pollResult.paymentIntentId ?? null);
            toast({
              title: 'Purchase Successful!',
              description: 'Your payment has been confirmed.',
            });
            setStep('success');
            setLiveMessage('Purchase complete. Downloads are ready.');
            await fetchBalance();
            onSuccess?.();
            void logger.info('checkout_purchase_completed', {
              user_id: user.id,
              session_id: checkoutSession.sessionId,
              payment_intent_id: pollResult.paymentIntentId ?? null,
              credits_applied: desiredCredits,
            });
          } else if (pollResult.status === 'cancelled') {
            setLiveMessage('Payment polling cancelled.');
            void logger.warn('checkout_purchase_polling_cancelled', {
              user_id: user.id,
              session_id: checkoutSession.sessionId,
              payment_intent_id: pollResult.paymentIntentId ?? null,
            });
          } else {
            const errorMessage =
              pollResult.status === 'expired'
                ? pollResult.message
                : pollResult.status === 'timeout'
                ? pollResult.message
                : pollResult.message || 'Unable to confirm payment.';
            void logger.error('checkout_purchase_polling_failed', {
              user_id: user.id,
              session_id: checkoutSession.sessionId,
              payment_intent_id: pollResult.paymentIntentId ?? null,
              status: pollResult.status,
            }, new Error(errorMessage));
            throw new Error(errorMessage);
          }
        } else {
          void logger.error('checkout_purchase_missing_session', {
            user_id: user.id,
            checkout_session_present: Boolean(checkoutSession),
          });
          throw new Error('Unable to start Stripe checkout for remaining balance');
        }
      } else {
        toast({
          title: 'Purchase Successful!',
          description: result.message,
        });
        setStep('success');
        setLiveMessage('Purchase complete. Downloads are ready.');
        await fetchBalance();
        onSuccess?.();
        void logger.info('checkout_purchase_completed', {
          user_id: user.id,
          session_id: null,
          payment_intent_id: null,
          credits_applied: desiredCredits,
        });
      }
    } catch (error) {
      console.error('Purchase error:', error);
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: 'Purchase Failed',
        description: message,
        variant: 'destructive',
      });
      setLiveMessage('Purchase failed. Please review the errors and try again.');
      void logger.error('checkout_purchase_failed', {
        user_id: user?.id,
        item_count: checkoutItems.length,
      }, toError(error));
    } finally {
      if (step !== 'payment') {
        setPurchasing(false);
      }
    }
  };

  const handleDownloadReceipt = async () => {
    if (!completedPaymentIntentId) {
      void logger.warn('checkout_receipt_missing_payment_reference', {
        user_id: user?.id,
      });
      toast({
        title: 'Receipt unavailable',
        description: 'We could not find a payment reference for this purchase yet.',
        variant: 'destructive',
      });
      return;
    }

    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
      void logger.info('checkout_receipt_opened_from_cache', {
        user_id: user?.id,
        payment_intent_id: completedPaymentIntentId,
      });
      return;
    }

    setReceiptLoading(true);
    setLiveMessage('Preparing your receipt for download...');
    void logger.info('checkout_receipt_generation_start', {
      user_id: user?.id,
      payment_intent_id: completedPaymentIntentId,
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-receipt', {
        body: {
          payment_id: completedPaymentIntentId,
          type: 'purchase',
        },
      });

      if (error) {
        throw error;
      }

      if (data?.pdf_url) {
        setReceiptUrl(data.pdf_url);
        window.open(data.pdf_url, '_blank');
        setLiveMessage('Receipt ready. Opened in a new tab.');
        void logger.info('checkout_receipt_generation_success', {
          user_id: user?.id,
          payment_intent_id: completedPaymentIntentId,
        });
      } else {
        throw new Error('No receipt URL returned');
      }
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast({
        title: 'Receipt unavailable',
        description: 'We were unable to generate the receipt. Please try again shortly.',
        variant: 'destructive',
      });
      setLiveMessage('Receipt generation failed.');
      void logger.error('checkout_receipt_generation_failed', {
        user_id: user?.id,
        payment_intent_id: completedPaymentIntentId,
      }, toError(error));
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleClose = () => {
    resetPollingState();
    setStep('review');
    setLiveMessage('');
    setTaxQuote(null);
    setTaxError(null);
    setCompletedPaymentIntentId(null);
    setReceiptUrl(null);
    setPollMessage('');
    setPollIntroMessage('');
    void logger.userAction('checkout_modal_closed', 'CheckoutModal', {
      user_id: user?.id,
      item_count: checkoutItems.length,
      step,
    });
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
        Apply {creditsToApply} credits & pay {formatCurrency(totalCashDueCurrency, taxCurrency)}
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

        <div aria-live="polite" className="sr-only">
          {liveMessage}
        </div>

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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={handleDownloadReceipt}
                disabled={receiptLoading || !completedPaymentIntentId}
              >
                <FileText className="h-4 w-4 mr-2" />
                {receiptLoading ? 'Preparing receipt...' : 'Download receipt'}
              </Button>
              <Button className="flex-1" onClick={() => (window.location.href = '/library')}>
                <Download className="h-4 w-4 mr-2" />
                Go to Library
              </Button>
              <Button variant="outline" onClick={handleClose} className="sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        ) : step === 'payment' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" aria-hidden="true" />
                <h3 className="text-lg font-semibold">Waiting for payment confirmation</h3>
                <p className="text-sm text-muted-foreground">
                  {pollIntroMessage || 'Complete your payment in the secure Stripe checkout window.'}
                </p>
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  {pollMessage || 'Waiting for confirmation...'}
                </p>
                {pollAttempts > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Status check {pollAttempts} of 20
                  </p>
                )}
                {pollError && (
                  <p className="text-sm text-destructive" role="alert">
                    {pollError}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={openPaymentPage} disabled={!checkoutUrl} aria-busy={polling}>
                <CreditCard className="h-4 w-4 mr-2" />
                Open secure payment page
              </Button>
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2">
                {checkoutItems.map((item) => {
                  const typeConfig = getPurchaseTypeConfig(item.type);
                  const TypeIcon = typeConfig.icon;
                  const licenseLabel = formatLicenseLabel(item.license_type);

                  return (
                  <Card key={item.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 ${typeConfig.accentClass} rounded-lg flex items-center justify-center`}
                          >
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{item.title}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <span>{typeConfig.label}</span>
                              {licenseLabel && (
                                <>
                                  <span>•</span>
                                  <span>{licenseLabel}</span>
                                </>
                              )}
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
                  );
                })}
              </div>
            </div>

            <div>
              <Separator />
              <div className="py-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Items ({checkoutItems.length})</span>
                  <span>{totalCost} credits</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotalCurrency, taxCurrency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Estimated tax</span>
                  <span className="flex items-center gap-2">
                    {taxLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span className="text-xs text-muted-foreground">Calculating...</span>
                      </>
                    ) : (
                      formatCurrency(taxAmountCurrency, taxCurrency)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Credits applied</span>
                  <span>-{creditsToApply} credits</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Cash due at checkout</span>
                  <span>{formatCurrency(totalCashDueCurrency, taxCurrency)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total due</span>
                  <span>
                    {canCompleteWithCredits
                      ? `${creditsToApply} credits`
                      : `${creditsToApply} credits + ${formatCurrency(totalCashDueCurrency, taxCurrency)}`}
                  </span>
                </div>
                {taxError && (
                  <p className="text-xs text-destructive" role="alert">
                    {taxError}
                  </p>
                )}
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
                  (totalCost > 0 && (!balanceSummary || policyLoading)) ||
                  (hasCashComponent && taxLoading)
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
