import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, PenTool, Check, Eye } from 'lucide-react';
import { LicensingContract } from '@/hooks/useContracts';
import SignaturePad from '@/components/SignaturePad';
import { formatCurrency } from '@/lib/utils';

interface ContractViewerProps {
  contract: LicensingContract;
  userRole: 'producer' | 'artist';
  onSign?: (signature: string) => Promise<void>;
  showSignature?: boolean;
}

const ContractViewer = ({ contract, userRole, onSign, showSignature = true }: ContractViewerProps) => {
  const [isSigningMode, setIsSigningMode] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const signaturePadRef = useRef<any>(null);

  const isUserSigned = userRole === 'producer' ? 
    Boolean(contract.producer_signature) : 
    Boolean(contract.artist_signature);

  const isOtherPartySigned = userRole === 'producer' ? 
    Boolean(contract.artist_signature) : 
    Boolean(contract.producer_signature);

  const canSign = showSignature && !isUserSigned && contract.status === 'pending';
  const isFullySigned = contract.producer_signature && contract.artist_signature;

  const handleSign = async () => {
    if (!signaturePadRef.current || !onSign) return;

    const signatureData = signaturePadRef.current.toDataURL();
    
    if (signaturePadRef.current.isEmpty()) {
      alert('Please provide a signature');
      return;
    }

    setIsSigning(true);
    try {
      await onSign(signatureData);
      setIsSigningMode(false);
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsSigning(false);
    }
  };

  const getStatusBadge = () => {
    if (isFullySigned) {
      return <Badge className="bg-green-100 text-green-800">Fully Signed</Badge>;
    }
    if (isUserSigned && !isOtherPartySigned) {
      return <Badge className="bg-blue-100 text-blue-800">Waiting for Other Party</Badge>;
    }
    if (!isUserSigned && isOtherPartySigned) {
      return <Badge className="bg-orange-100 text-orange-800">Awaiting Your Signature</Badge>;
    }
    return <Badge variant="outline">Pending Signatures</Badge>;
  };

  const formatContractText = (text: string) => {
    return text.split('\n').map((line, index) => {
      if (line.trim() === '') return <br key={index} />;
      
      // Handle headers (lines that are all caps or start with numbers)
      if (line.match(/^[A-Z\s]+$/) || line.match(/^\d+\./)) {
        return (
          <p key={index} className="font-semibold text-sm mt-4 mb-2">
            {line}
          </p>
        );
      }
      
      // Handle sub-sections (lines starting with letters)
      if (line.match(/^[a-z]\)/)) {
        return (
          <p key={index} className="text-sm ml-4 mb-1">
            {line}
          </p>
        );
      }
      
      // Regular paragraphs
      return (
        <p key={index} className="text-sm mb-2 leading-relaxed">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Contract Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6" />
              <div>
                <CardTitle className="text-xl">Licensing Contract</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Beat: {contract.contract_data.beat_title} • {formatCurrency(contract.license_fee)}
                </p>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Producer</p>
              <p className="text-muted-foreground">{contract.contract_data.producer_name}</p>
            </div>
            <div>
              <p className="font-medium">Artist</p>
              <p className="text-muted-foreground">{contract.contract_data.artist_name}</p>
            </div>
            <div>
              <p className="font-medium">License Type</p>
              <p className="text-muted-foreground capitalize">
                {contract.contract_data?.license_title ?? (contract.template_type || '').replace(/_/g, ' ')}
              </p>
            </div>
            <div>
              <p className="font-medium">Date</p>
              <p className="text-muted-foreground">
                {new Date(contract.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Contract Terms
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full border rounded-md p-4">
            <div className="font-mono text-xs leading-relaxed">
              {formatContractText(contract.legal_text)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Signature Section */}
      {showSignature && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-5 w-5" />
              Digital Signatures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Signature Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`h-3 w-3 rounded-full ${contract.producer_signature ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-medium">Producer Signature</p>
                  <p className="text-sm text-muted-foreground">
                    {contract.producer_signature ? 'Signed' : 'Pending'}
                  </p>
                </div>
                {contract.producer_signature && <Check className="h-4 w-4 text-green-500 ml-auto" />}
              </div>
              
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`h-3 w-3 rounded-full ${contract.artist_signature ? 'bg-green-500' : 'bg-gray-300'}`} />
                <div>
                  <p className="font-medium">Artist Signature</p>
                  <p className="text-sm text-muted-foreground">
                    {contract.artist_signature ? 'Signed' : 'Pending'}
                  </p>
                </div>
                {contract.artist_signature && <Check className="h-4 w-4 text-green-500 ml-auto" />}
              </div>
            </div>

            <Separator />

            {/* Signing Interface */}
            {canSign && (
              <div className="space-y-4">
                {!isSigningMode ? (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Ready to sign this contract?
                    </p>
                    <Button onClick={() => setIsSigningMode(true)} className="w-full md:w-auto">
                      <PenTool className="h-4 w-4 mr-2" />
                      Sign Contract
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="font-medium mb-2">Please sign below</p>
                      <p className="text-sm text-muted-foreground">
                        Your signature will be legally binding
                      </p>
                    </div>
                    
                    <SignaturePad ref={signaturePadRef} />
                    
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsSigningMode(false)}
                        disabled={isSigning}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSign}
                        disabled={isSigning}
                      >
                        {isSigning ? 'Signing...' : 'Confirm Signature'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isUserSigned && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <Check className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="font-medium text-green-800">You have signed this contract</p>
                <p className="text-sm text-green-600">
                  {isFullySigned ? 'Contract is now complete' : 'Waiting for the other party to sign'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {isFullySigned && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Email Copy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContractViewer;