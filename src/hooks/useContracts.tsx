import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface ContractTemplate {
  id: string;
  template_type: string;
  title: string;
  description: string;
  legal_text: string;
  price_range_min: number;
  price_range_max: number;
  features: any;
  restrictions: any;
  deliverables: any;
}

export interface LicensingContract {
  id: string;
  beat_id: string;
  producer_id: string;
  artist_id: string;
  template_type: string;
  license_fee: number;
  contract_data: any;
  legal_text: string;
  status: string;
  signed_at?: string;
  producer_signature?: string;
  artist_signature?: string;
  contract_pdf_url?: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export const useContracts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<LicensingContract[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch contract templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('price_range_min');

      if (error) throw error;
      
      // Parse JSON fields and ensure proper typing
      const processedTemplates = (data || []).map(template => ({
        ...template,
        features: Array.isArray(template.features) ? template.features : JSON.parse(template.features as string),
        restrictions: Array.isArray(template.restrictions) ? template.restrictions : JSON.parse(template.restrictions as string),
        deliverables: Array.isArray(template.deliverables) ? template.deliverables : JSON.parse(template.deliverables as string)
      }));
      
      setTemplates(processedTemplates);
    } catch (error) {
      console.error('Error fetching contract templates:', error);
      toast({
        title: "Error",
        description: "Failed to load contract templates",
        variant: "destructive"
      });
    }
  };

  // Fetch user's contracts
  const fetchContracts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('licensing_contracts')
        .select('*')
        .or(`producer_id.eq.${user.id},artist_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts(data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to load contracts",
        variant: "destructive"
      });
    }
  };

  // Create a new contract
  const createContract = async (contractData: {
    beat_id: string;
    producer_id: string;
    template_type: string;
    license_fee: number;
    custom_terms?: any;
  }) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a contract",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    try {
      // Get the template
      const template = templates.find(t => t.template_type === contractData.template_type);
      if (!template) throw new Error('Contract template not found');

      // Get beat and producer info for contract data
      const { data: beatData, error: beatError } = await supabase
        .from('beats')
        .select('title, user_id, uploaded_by_admin, producer_name')
        .eq('id', contractData.beat_id)
         .maybeSingle();

       if (beatError) throw beatError;
       if (!beatData) throw new Error('Beat not found');

      // Get producer profile (used when not uploaded by admin)
      const { data: producerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', contractData.producer_id)
        .maybeSingle();

      // Get artist profile
      const { data: artistProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      // Determine proper producer display name
      const displayProducerName = beatData.uploaded_by_admin
        ? (beatData.producer_name || 'Producer')
        : (producerProfile?.full_name || 'Producer');

      // Prepare contract data
      const contractDataFull = {
        beat_title: beatData.title,
        producer_name: displayProducerName,
        artist_name: artistProfile?.full_name || 'Artist',
        purchase_date: new Date().toLocaleDateString(),
        amount: contractData.license_fee,
        license_title: contractData.custom_terms?.license_title, // helpful for review UI
        ...contractData.custom_terms
      };

      // Replace placeholders in legal text
      let populatedLegalText = template.legal_text;
      Object.entries(contractDataFull).forEach(([key, value]) => {
        const placeholder = `{${key}}`;
        populatedLegalText = populatedLegalText.replace(new RegExp(placeholder, 'g'), String(value));
      });

      const { data, error } = await supabase
        .from('licensing_contracts')
        .insert({
          beat_id: contractData.beat_id,
          producer_id: contractData.producer_id,
          artist_id: user.id,
          template_type: contractData.template_type,
          license_fee: contractData.license_fee,
          contract_data: contractDataFull,
          legal_text: populatedLegalText,
          status: 'pending'
        })
        .select()
         .maybeSingle();

       if (error) throw error;

       if (!data) throw new Error('Contract creation failed');

       toast({
         title: "Contract Created",
         description: "Contract ready for review and signing",
       });

       await fetchContracts();
       return data;
    } catch (error: any) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create contract",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Sign a contract
  const signContract = async (contractId: string, signature: string, signerType: 'producer' | 'artist') => {
    if (!user) return false;

    setLoading(true);
    try {
      // Record the signature
      const { error: sigError } = await supabase
        .from('contract_signatures')
        .insert({
          contract_id: contractId,
          signer_id: user.id,
          signer_type: signerType,
          signature_data: signature,
          ip_address: 'placeholder', // Would get real IP in production
          user_agent: navigator.userAgent
        });

      if (sigError) throw sigError;

      // Update the contract with signature
      const updateData = signerType === 'producer' 
        ? { producer_signature: signature }
        : { artist_signature: signature };

      const { error: contractError } = await supabase
        .from('licensing_contracts')
        .update(updateData)
        .eq('id', contractId);

      if (contractError) throw contractError;

      // Check if both parties have signed
      const { data: contract } = await supabase
        .from('licensing_contracts')
        .select('producer_signature, artist_signature')
        .eq('id', contractId)
        .maybeSingle();

      if (contract?.producer_signature && contract?.artist_signature) {
        // Both parties signed - mark as complete
        await supabase
          .from('licensing_contracts')
          .update({ 
            status: 'signed',
            signed_at: new Date().toISOString()
          })
          .eq('id', contractId);
      }

      toast({
        title: "Contract Signed",
        description: "Your signature has been recorded",
      });

      await fetchContracts();
      return true;
    } catch (error: any) {
      console.error('Error signing contract:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign contract",
        variant: "destructive"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (user) {
      fetchContracts();
    }
  }, [user]);

  return {
    templates,
    contracts,
    loading,
    createContract,
    signContract,
    fetchContracts,
    fetchTemplates
  };
};