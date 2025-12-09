import { formatCurrency } from "@/lib/utils";
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, Crown, Zap, Infinity as InfinityIcon, Star, Eye, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useContracts, ContractTemplate } from '@/hooks/useContracts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface LicenseSelectionProps {
  beatId: string;
  producerId: string;
  beatTitle: string;
  onLicenseSelected: (template: ContractTemplate, price: number) => void;
}

const LicenseSelection = ({ beatId, producerId, beatTitle, onLicenseSelected }: LicenseSelectionProps) => {
  const { templates } = useContracts();
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [availableLicenses, setAvailableLicenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});
  const [producerName, setProducerName] = useState<string>('Producer');
  const [artistName, setArtistName] = useState<string>('Artist');
  const [producerOverride, setProducerOverride] = useState<boolean>(false);

  const getIconForTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic_lease': return <Zap className="h-5 w-5" />;
      case 'premium_lease': return <Crown className="h-5 w-5" />;
      case 'unlimited_lease': return <InfinityIcon className="h-5 w-5" />;
      case 'exclusive_rights': return <Star className="h-5 w-5" />;
      default: return <Check className="h-5 w-5" />;
    }
  };

  const getColorForTemplate = (templateType: string) => {
    switch (templateType) {
      case 'basic_lease': return 'from-blue-500 to-cyan-500';
      case 'premium_lease': return 'from-purple-500 to-pink-500';
      case 'unlimited_lease': return 'from-orange-500 to-red-500';
      case 'exclusive_rights': return 'from-yellow-500 to-amber-500';
      default: return 'from-gray-500 to-slate-500';
    }
  };

  const handlePriceChange = (templateType: string, price: number) => {
    setCustomPrices(prev => ({ 
      ...prev, 
      [templateType]: Math.round(price * 100) // Store in pence
    }));
  };

  // Fetch available licenses for this beat
  useEffect(() => {
    const fetchAvailableLicenses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('licensing_options')
          .select('*')
          .eq('beat_id', beatId)
          .eq('is_available', true);

        if (error) throw error;
        setAvailableLicenses(data || []);
        
        // Set initial custom prices in pence (convert from USD pricing to pence)
        const prices: Record<string, number> = {};
        data?.forEach(license => {
          prices[license.license_type] = Math.round(license.price * 80); // Convert USD to GBP pence
        });
        setCustomPrices(prices);
      } catch (error) {
        console.error('Error fetching licenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableLicenses();
  }, [beatId]);

  useEffect(() => {
    const fetchNames = async () => {
      try {
        if (!producerOverride && producerId) {
          const { data: producer, error: prodErr } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', producerId)
            .maybeSingle();
          if (!prodErr && producer?.full_name) setProducerName(producer.full_name);
        }
        if (user?.id) {
          const { data: artist, error: artistErr } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (!artistErr && artist?.full_name) setArtistName(artist.full_name);
        }
      } catch (e) {
        console.error('Error fetching names:', e);
      }
    };
    fetchNames();
  }, [producerId, user?.id, producerOverride]);

  // Prefer the beat's producer_name when uploaded by admin
  useEffect(() => {
    const checkBeatAttribution = async () => {
      try {
        const { data: beat } = await supabase
          .from('beats')
          .select('uploaded_by_admin, producer_name')
          .eq('id', beatId)
          .maybeSingle();
        if (beat?.uploaded_by_admin && beat?.producer_name) {
          setProducerName(beat.producer_name);
          setProducerOverride(true);
        } else {
          setProducerOverride(false);
        }
      } catch (e) {
        console.error('Error checking beat attribution:', e);
      }
    };
    checkBeatAttribution();
  }, [beatId]);

  const populateLegalText = (legalText: string, amount: number) => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const purchase_date = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    const map: Record<string, string | number> = {
      purchase_date,
      producer_name: producerName || 'Producer',
      artist_name: artistName || 'Artist',
      beat_title: beatTitle,
      amount: amount ?? ''
    };
    let result = legalText;
    Object.entries(map).forEach(([key, val]) => {
      const re = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(re, String(val));
    });
    // Remove any remaining placeholders like {something}
    result = result.replace(/\{[^}]+\}/g, '');
    return result;
  };

  const handleSelectLicense = (template: ContractTemplate) => {
    console.log('handleSelectLicense called with:', template.template_type);
    const availableLicense = availableLicenses.find(l => l.license_type === template.template_type);
    const pricePence = Math.round((availableLicense?.price || template.price_range_min || 0) * 80); // Convert USD to GBP pence
    const priceGBP = pricePence / 100; // Convert to pounds for display
    console.log('Final price (GBP):', priceGBP);
    onLicenseSelected(template, priceGBP);
  };

  const toggleTerms = (templateType: string) => {
    setExpandedTerms(prev => ({
      ...prev,
      [templateType]: !prev[templateType]
    }));
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Please log in to view licensing options
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Loading available licenses...</p>
      </div>
    );
  }

  const availableTemplates = templates.filter(template => 
    availableLicenses.some(license => license.license_type === template.template_type)
  );

  if (availableTemplates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No licenses are currently available for this beat. Please contact the producer for more information.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your License</h2>
        <p className="text-muted-foreground">
          Select the license that best fits your project needs
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {availableTemplates.map((template) => {
          const isSelected = selectedTemplate === template.template_type;
          const availableLicense = availableLicenses.find(l => l.license_type === template.template_type);
          const pricePence = Math.round((availableLicense?.price || template.price_range_min || 0) * 80); // Convert USD to GBP pence
          const currentPrice = pricePence / 100; // Convert to pounds

          return (
            <Card 
              key={template.id} 
              className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-primary shadow-lg scale-105' : ''
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${getColorForTemplate(template.template_type)} opacity-5 pointer-events-none`} />
              
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIconForTemplate(template.template_type)}
                    <CardTitle className="text-lg">{template.title}</CardTitle>
                  </div>
                  <Badge variant={isSelected ? "default" : "secondary"}>
                    {formatCurrency(currentPrice)}
                  </Badge>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Fixed Price Display */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">License Fee</label>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(currentPrice)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Price set by producer
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">What's Included:</h4>
                  <ul className="space-y-1">
                    {template.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-3 w-3 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {template.features.length > 4 && (
                      <li className="text-xs text-muted-foreground">
                        +{template.features.length - 4} more features
                      </li>
                    )}
                  </ul>
                </div>

                {/* Key Restrictions */}
                {template.restrictions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-orange-600">Restrictions:</h4>
                    <ul className="space-y-1">
                      {template.restrictions.slice(0, 2).map((restriction, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {restriction}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-3">
                  <Collapsible 
                    open={!!expandedTerms[template.template_type]} 
                    onOpenChange={(open) => setExpandedTerms(prev => ({ ...prev, [template.template_type]: open }))}
                  >
                    <CollapsibleTrigger asChild>
                      <Button onClick={() => {}} variant="outline" size="sm" className="w-full justify-between">
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          View Terms
                        </div>
                        {expandedTerms[template.template_type] ? 
                          <ChevronUp className="h-4 w-4" /> : 
                          <ChevronDown className="h-4 w-4" />
                        }
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="p-4 border rounded-lg bg-muted/50 max-h-40 overflow-y-auto">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4" />
                          <h4 className="font-semibold text-sm">{template.title} - Full Terms</h4>
                        </div>
                        <div className="text-xs leading-relaxed">
                          <div dangerouslySetInnerHTML={{ __html: populateLegalText(template.legal_text, currentPrice).replace(/\n/g, '<br />') }} />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                   
                  <Button 
                    onClick={() => {
                      // License selection initiated
                      handleSelectLicense(template);
                    }}
                    className="w-full"
                    variant={isSelected ? "default" : "outline"}
                  >
                    {isSelected ? 'License Selected ✓' : 'Select This License'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          All licenses include secure contract generation and electronic signatures
        </p>
        <p className="text-xs text-muted-foreground">
          Prices are set by the producer and displayed above
        </p>
      </div>
    </div>
  );
};

export default LicenseSelection;
