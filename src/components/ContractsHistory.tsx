import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Eye, Calendar, DollarSign } from 'lucide-react';
import { useContracts } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import ContractViewer from './ContractViewer';
import { formatCurrency } from '@/lib/utils';
const ContractsHistory = () => {
  const { user } = useAuth();
  const { contracts, loading } = useContracts();
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please log in to view your contracts
          </p>
        </CardContent>
      </Card>
    );
  }

  const myContracts = contracts.filter(contract => 
    contract.artist_id === user.id || contract.producer_id === user.id
  );

  const asArtist = contracts.filter(contract => contract.artist_id === user.id);
  const asProducer = contracts.filter(contract => contract.producer_id === user.id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTemplateType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleViewContract = (contract: any) => {
    setSelectedContract(contract);
    setIsViewerOpen(true);
  };

  const ContractsList = ({ contractsList, role }: { contractsList: any[], role: 'artist' | 'producer' }) => (
    <div className="space-y-4">
      {contractsList.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No contracts found</p>
        </div>
      ) : (
        contractsList.map((contract) => (
          <Card key={contract.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">
                    {contract.contract_data.beat_title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {role === 'artist' ? 
                      `Producer: ${contract.contract_data.producer_name}` : 
                      `Artist: ${contract.contract_data.artist_name}`
                    }
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(contract.created_at).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(contract.license_fee)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(contract.status)}>
                    {contract.status}
                  </Badge>
                      <Badge variant="outline">
                        {contract.contract_data?.license_title || formatTemplateType(contract.template_type)}
                      </Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleViewContract(contract)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Contract
                </Button>
                
                {contract.status === 'signed' && (
                  <>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      Download PDF
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-1" />
                      Email Copy
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading contracts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Licensing Contracts
          </CardTitle>
          <CardDescription>
            Manage your beat licensing agreements and contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Contracts ({myContracts.length})</TabsTrigger>
              <TabsTrigger value="artist">As Artist ({asArtist.length})</TabsTrigger>
              <TabsTrigger value="producer">As Producer ({asProducer.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-6">
              <ScrollArea className="h-[600px]">
                <ContractsList contractsList={myContracts} role="artist" />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="artist" className="mt-6">
              <ScrollArea className="h-[600px]">
                <ContractsList contractsList={asArtist} role="artist" />
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="producer" className="mt-6">
              <ScrollArea className="h-[600px]">
                <ContractsList contractsList={asProducer} role="producer" />
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Contract Viewer Dialog */}
      {selectedContract && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold">Contract Details</h2>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>
                Close
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              <ContractViewer
                contract={selectedContract}
                userRole={selectedContract.artist_id === user.id ? 'artist' : 'producer'}
                showSignature={selectedContract.status === 'pending'}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ContractsHistory;