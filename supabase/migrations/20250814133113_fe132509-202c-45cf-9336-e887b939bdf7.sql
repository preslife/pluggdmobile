-- Fix the trigger conflict by using IF NOT EXISTS pattern
DROP TRIGGER IF EXISTS update_producer_stripe_accounts_updated_at ON public.producer_stripe_accounts;

-- Add updated_at trigger for producer_stripe_accounts
CREATE TRIGGER update_producer_stripe_accounts_updated_at
    BEFORE UPDATE ON public.producer_stripe_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();