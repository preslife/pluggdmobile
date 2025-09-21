import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import LicenseSelection from './LicenseSelection';
import ContractViewer from './ContractViewer';
import { useContracts, ContractTemplate } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { useWallet, formatCredits, creditsToGBP } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
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

type ModalStep = 'payment_method' | 'license_selection' | 'contract_review' | 'contract_signing';

const BeatLicensingModal = ({ isOpen, onClose, beat }: BeatLicensingModalProps) => {
  const { user } = useAuth();
  const { balance, spendCredits } = useWallet();
  const { toast } = useToast();
  const { createContract, signContract, contracts } = useContracts();
  const [currentStep, setCurrentStep] = useState<ModalStep>('payment_method');
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'stripe'>('credits');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<number>(0);
  const [currentContract, setCurrentContract] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentMethodNext = () => {
    setCurrentStep('license_selection');
  };

  const handleLicenseSelected = async (template: ContractTemplate, price: number) => {
    // License selected for processing
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to license this beat",
        variant: "destructive"
      });
      return;
    }

    setSelectedTemplate(template);
    setSelectedPrice(price);
    setIsProcessing(true);

    try {
      if (paymentMethod === 'credits') {
        // Pay with credits
        const creditsRequired = Math.round(price * 100); // Convert GBP to credits (100 credits = £1)
        
        if (balance.available_credits < creditsRequired) {
          toast({
            title: "Insufficient Credits",
            description: `You need ${formatCredits(creditsRequired)} credits but only have ${formatCredits(balance.available_credits)} available.`,
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }

        const result = await spendCredits(
          creditsRequired, 
          'spend_purchase', 
          'beat_license', 
          beat.id, 
          beat.user_id
        );

        if (result.success) {
          toast({
            title: "Payment Successful!",
            description: `You've licensed "${beat.title}" for ${formatCredits(creditsRequired)} credits.`,
          });
          onClose();
          resetModal();
        } else {
          throw new Error(result.error);
        }
      } else {
        // Pay with Stripe
        const pricePence = Math.round(price * 100);
        
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          'create-beat-purchase',
          {
            body: {
              beatId: beat.id,
              licenseFee: pricePence
            }
          }
        );
        
        if (checkoutError) {
          toast({
            title: "Error",
            description: checkoutError.message || "Failed to create payment session",
            variant: "destructive",
          });
          return;
        }
        
        if (checkoutData?.url) {
          window.open(checkoutData.url, '_blank');
          onClose();
        }
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContractSigned = async (signature: string) => {
    if (!currentContract || !user) return;

    setIsProcessing(true);
    try {
      const success = await signContract(currentContract.id, signature, 'artist');
      if (success) {
        setCurrentStep('contract_signing');
        toast({
          title: "Contract Signed Successfully",
          description: "Your licensing agreement is now active",
        });
        
        // Close modal after a delay to show success
        setTimeout(() => {
          onClose();
          resetModal();
        }, 2000);
      }
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModal = () => {
    setCurrentStep('payment_method');
    setPaymentMethod('credits');
    setSelectedTemplate(null);
    setSelectedPrice(0);
    setCurrentContract(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    onClose();
    resetModal();
  };

  const canGoBack = currentStep !== 'payment_method' && currentStep !== 'contract_signing';

  const handleBack = () => {
    if (currentStep === 'license_selection') {
      setCurrentStep('payment_method');
    } else if (currentStep === 'contract_review') {
      setCurrentStep('license_selection');
      setCurrentContract(null);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'payment_method':
        return 'Choose Payment Method';
      case 'license_selection':
        return 'Choose License Type';
      case 'contract_review':
        return 'Review Contract';
      case 'contract_signing':
        return 'Contract Completed';
      default:
        return 'Beat Licensing';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'payment_method':
        return 'Select how you want to pay for this beat license';
      case 'license_selection':
        return 'Select the license that best fits your needs';
      case 'contract_review':
        return 'Review the contract terms and provide your digital signature';
      case 'contract_signing':
        return 'Your licensing agreement has been signed and is now active';
      default:
        return '';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="z-[100] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{getStepTitle()}</DialogTitle>
              <DialogDescription className="mt-1">
                {getStepDescription()}
              </DialogDescription>
            </div>
            
            {canGoBack && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          
          {/* Beat Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="font-medium">Beat: {beat.title}</p>
            <p className="text-sm text-muted-foreground">
              Licensing beat for commercial use
            </p>
          </div>
        </DialogHeader>

        <div className="mt-6">
          {/* Step 1: Payment Method Selection */}
          {currentStep === 'payment_method' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credits Payment Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'credits' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('credits')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'credits' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {paymentMethod === 'credits' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Pay with PLGD Credits</h3>
                      <p className="text-sm text-muted-foreground">
                        Your balance: {formatCredits(balance.available_credits)} credits
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stripe Payment Option */}
                <div 
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setPaymentMethod('stripe')}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'stripe' ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {paymentMethod === 'stripe' && <div className="w-2 h-2 bg-white rounded-full m-0.5" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Pay with Card</h3>
                      <p className="text-sm text-muted-foreground">
                        Credit or debit card via Stripe
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handlePaymentMethodNext} className="w-full">
                Continue to License Selection
              </Button>
            </div>
          )}

          {/* Step 2: License Selection */}
          {currentStep === 'license_selection' && (
            <LicenseSelection
              beatId={beat.id}
              producerId={beat.user_id}
              beatTitle={beat.title}
              onLicenseSelected={handleLicenseSelected}
            />
          )}

          {/* Step 3: Contract Review & Signing */}
          {currentStep === 'contract_review' && currentContract && (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Preparing contract...</p>
                </div>
              ) : (
                <ContractViewer
                  contract={currentContract}
                  userRole="artist"
                  onSign={handleContractSigned}
                  showSignature={true}
                />
              )}
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 'contract_signing' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <ArrowRight className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold">Contract Signed Successfully!</h3>
              <p className="text-muted-foreground">
                Your licensing agreement for "{beat.title}" is now active.
                You'll receive an email confirmation shortly.
              </p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>License Type:</strong> {selectedTemplate?.title}<br />
                  <strong>License Fee:</strong> {formatCurrency(selectedPrice)}<br />
                  <strong>Status:</strong> Active
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Loading overlay */}
        {isProcessing && currentStep !== 'contract_review' && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="bg-background p-6 rounded-lg shadow-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Processing...</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BeatLicensingModal;