import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import LicenseSelection from './LicenseSelection';
import { ContractTemplate } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BeatLicensingModalProps {
  isOpen: boolean;
  onClose: () => void;
  beat: {
    id: string;
    title: string;
    user_id: string;
    price: number;
  };
}

type PreparedLicence = {
  beat: { id: string; title: string; producerName: string };
  option: {
    id: string;
    name: string;
    priceLabel: string;
    usageRights: string[];
    restrictions: string[];
    deliverables: string[];
    territory: string;
    term: string;
  };
  contract: { id: string; legalText: string };
};

const DELIVERY_CONSENT_VERSION = '2026-08-01.1';

const asList = (value: unknown): string[] => Array.isArray(value)
  ? value.map(String).filter(Boolean)
  : [];

const normalizePrepared = (data: any): PreparedLicence | null => {
  if (!data?.beat?.id || !data?.option?.id || !data?.contract?.id) return null;
  return {
    beat: {
      id: String(data.beat.id),
      title: String(data.beat.title || 'Untitled beat'),
      producerName: String(data.beat.producerName || 'Producer'),
    },
    option: {
      id: String(data.option.id),
      name: String(data.option.name || 'Professional licence'),
      priceLabel: String(data.option.priceLabel || 'Price confirmed at checkout'),
      usageRights: asList(data.option.usageRights),
      restrictions: asList(data.option.restrictions),
      deliverables: asList(data.option.deliverables),
      territory: String(data.option.territory || 'Defined in the agreement'),
      term: String(data.option.term || 'Defined in the agreement'),
    },
    contract: {
      id: String(data.contract.id),
      legalText: String(data.contract.legalText || ''),
    },
  };
};

const BeatLicensingModal = ({ isOpen, onClose, beat }: BeatLicensingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prepared, setPrepared] = useState<PreparedLicence | null>(null);
  const [legalName, setLegalName] = useState('');
  const [licenceAccepted, setLicenceAccepted] = useState(false);
  const [deliveryAccepted, setDeliveryAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPrepared(null);
      setLegalName('');
      setLicenceAccepted(false);
      setDeliveryAccepted(false);
      setLoading(false);
    }
  }, [isOpen]);

  const selectLicence = async (
    _template: ContractTemplate,
    _price: number,
    optionId: string,
  ) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Sign in to review verified licence terms.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('prepare-beat-license', {
      body: { beatId: beat.id, licenseOptionId: optionId },
    });
    setLoading(false);
    if (error) {
      toast({
        title: 'Licence unavailable',
        description: 'PLUGGD could not verify a complete, producer-authorised agreement for this tier. No payment was started.',
        variant: 'destructive',
      });
      return;
    }
    const next = normalizePrepared(data);
    if (!next) {
      toast({ title: 'Licence unavailable', description: 'The verified agreement response was incomplete.', variant: 'destructive' });
      return;
    }
    setPrepared(next);
  };

  const continueToCheckout = async () => {
    if (!prepared || loading) return;
    if (!legalName.trim()) {
      toast({ title: 'Legal name required', description: 'Enter the name that should appear on the licence.', variant: 'destructive' });
      return;
    }
    if (!licenceAccepted || !deliveryAccepted) {
      toast({ title: 'Review both confirmations', description: 'The licence acceptance and immediate-delivery request are separate choices.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error: signatureError } = await supabase.functions.invoke('contract-execution', {
        body: {
          contractId: prepared.contract.id,
          signature: legalName.trim(),
          signerType: 'artist',
          digitalDeliveryConsent: {
            accepted: true,
            version: DELIVERY_CONSENT_VERSION,
          },
        },
      });
      if (signatureError) throw signatureError;

      const { data, error: checkoutError } = await supabase.functions.invoke('create-beat-purchase', {
        body: {
          beatId: prepared.beat.id,
          licenseOptionId: prepared.option.id,
          contractId: prepared.contract.id,
          requestId: `${Date.now()}-${crypto.randomUUID().slice(0, 12)}`,
          platform: 'web',
          storefront: 'GB',
          returnUrl: `${window.location.origin}/beat/${prepared.beat.id}`,
        },
      });
      if (checkoutError) throw checkoutError;
      const checkoutUrl = String(data?.checkoutUrl || data?.url || '');
      if (!/^https:\/\/checkout\.stripe\.com\//i.test(checkoutUrl)) {
        throw new Error('The secure checkout link was invalid.');
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      toast({
        title: 'Secure checkout unavailable',
        description: error instanceof Error ? error.message : 'No payment was started. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  const close = () => {
    if (!loading) onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="z-[100] max-h-[92vh] max-w-4xl overflow-y-auto border-border/70 bg-background p-0">
        <div className="border-b border-border/70 bg-gradient-to-br from-primary/15 via-background to-background px-6 py-5 sm:px-8">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge variant="outline" className="mb-3 border-primary/40 text-primary">PROFESSIONAL LICENSING</Badge>
                <DialogTitle className="text-2xl sm:text-3xl">{prepared ? prepared.option.name : 'Choose the right licence'}</DialogTitle>
                <DialogDescription className="mt-2 text-sm">
                  {beat.title} · terms, pricing and ownership verified before checkout
                </DialogDescription>
              </div>
              <ShieldCheck className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
            </div>
          </DialogHeader>
        </div>

        <div className="p-6 sm:p-8">
          {loading && !prepared ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Preparing the verified agreement…</p>
            </div>
          ) : !prepared ? (
            <LicenseSelection
              beatId={beat.id}
              producerId={beat.user_id}
              beatTitle={beat.title}
              onLicenseSelected={selectLicence}
            />
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Fact label="VERIFIED PRICE" value={prepared.option.priceLabel} accent />
                <Fact label="TERRITORY" value={prepared.option.territory} />
                <Fact label="TERM" value={prepared.option.term} />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <LicenceList title="Usage rights" values={prepared.option.usageRights} />
                <LicenceList title="Restrictions" values={prepared.option.restrictions} />
                <LicenceList title="Deliverables" values={prepared.option.deliverables} />
              </div>

              <Separator />
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">Licence agreement</h3>
                </div>
                <ScrollArea className="h-72 border border-border/70 bg-muted/20 p-5">
                  <div className="whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{prepared.contract.legalText}</div>
                </ScrollArea>
              </div>

              <div className="grid gap-3">
                <label htmlFor="licence-legal-name" className="text-xs font-semibold tracking-[0.12em] text-muted-foreground">LEGAL NAME ON LICENCE</label>
                <Input id="licence-legal-name" value={legalName} onChange={(event) => setLegalName(event.target.value)} autoComplete="name" placeholder="Enter your full legal name" />
              </div>

              <Confirmation
                id="accept-licence"
                checked={licenceAccepted}
                onCheckedChange={setLicenceAccepted}
                title="Accept the licence agreement"
                description="I have reviewed and accept the complete licence agreement shown above."
              />
              <Confirmation
                id="accept-delivery"
                checked={deliveryAccepted}
                onCheckedChange={setDeliveryAccepted}
                title="Request immediate digital delivery"
                description="I request immediate access to the digital files and understand that, once the download begins, I lose my 14-day right to cancel to the extent permitted by law."
              />

              <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-5 sm:flex-row sm:justify-between">
                <Button variant="ghost" onClick={() => setPrepared(null)} disabled={loading}>
                  <ArrowLeft className="mr-2 h-4 w-4" />Choose another tier
                </Button>
                <Button onClick={continueToCheckout} disabled={loading || !licenceAccepted || !deliveryAccepted || !legalName.trim()} className="min-w-56">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                  Continue securely<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-center text-xs text-muted-foreground">Beat licences use hosted card checkout. PLUGGD credits cannot purchase a beat licence.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Fact = ({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) => (
  <div className="border border-border/70 bg-muted/20 p-4">
    <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">{label}</p>
    <p className={`mt-2 text-sm font-semibold ${accent ? 'text-primary' : ''}`}>{value}</p>
  </div>
);

const LicenceList = ({ title, values }: { title: string; values: string[] }) => (
  <div className="border border-border/70 p-4">
    <h4 className="mb-3 font-semibold">{title}</h4>
    <ul className="space-y-2 text-sm text-muted-foreground">
      {(values.length ? values : ['Defined in the agreement']).map((value) => (
        <li key={value} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" /><span>{value}</span></li>
      ))}
    </ul>
  </div>
);

const Confirmation = ({ id, checked, onCheckedChange, title, description }: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title: string;
  description: string;
}) => (
  <div className="flex items-start gap-3 border border-border/70 bg-muted/20 p-4">
    <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
    <label htmlFor={id} className="cursor-pointer">
      <span className="block text-sm font-semibold">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </label>
  </div>
);

export default BeatLicensingModal;
