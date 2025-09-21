import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Package, Zap, Settings, Plug } from "lucide-react";

interface EnhancedDistributionPanelProps {
  release: any;
  onClose: () => void;
  onUpdate: () => void;
}

const DISTRIBUTORS = [
  { id: 'manual', name: 'Manual Export', icon: Package },
  { id: 'distrokid', name: 'DistroKid', icon: Zap },
  { id: 'tunecore', name: 'TuneCore', icon: Settings },
  { id: 'amuse', name: 'Amuse', icon: Plug }
];

export const EnhancedDistributionPanel = ({ release, onClose, onUpdate }: EnhancedDistributionPanelProps) => {
  const [provider, setProvider] = useState('manual');
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
    if (release.distributor_provider) {
      setProvider(release.distributor_provider);
    }
  }, [release]);

  const fetchConnections = async () => {
    try {
      const { data } = await supabase
        .from('social_connections')
        .select('*')
        .in('provider', ['distrokid', 'tunecore', 'amuse']);
      
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    }
  };

  const isProviderConnected = (providerId: string) => {
    if (providerId === 'manual') return true;
    return connections.some(c => c.provider === providerId);
  };

  const saveDistributionSettings = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('releases')
        .update({
          distributor_provider: provider,
          distribution_partner_response: { provider_selected: provider, timestamp: new Date().toISOString() }
        })
        .eq('id', release.id);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Distribution settings have been updated"
      });
      
      onUpdate();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save distribution settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDistributionPackage = async () => {
    try {
      setGenerateLoading(true);

      const { data, error } = await supabase.functions.invoke('generate-distribution-package', {
        body: { 
          release_id: release.id,
          distributor_provider: provider
        }
      });

      if (error) throw error;

      // Update release status
      await supabase
        .from('releases')
        .update({
          distribution_status: 'submitted',
          distribution_submission_ref: `${provider}_package_${Date.now()}`,
          distribution_partner_response: {
            ...release.distribution_partner_response,
            export_created: true,
            provider,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', release.id);

      toast({
        title: "Package generated",
        description: `Distribution package created for ${DISTRIBUTORS.find(d => d.id === provider)?.name}`,
      });

      onUpdate();
    } catch (error) {
      console.error('Error generating package:', error);
      toast({
        title: "Error", 
        description: "Failed to generate distribution package",
        variant: "destructive"
      });
    } finally {
      setGenerateLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Enhanced Distribution Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Provider Selection */}
        <div className="space-y-3">
          <Label>Distribution Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger>
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {DISTRIBUTORS.map((dist) => {
                const connected = isProviderConnected(dist.id);
                const Icon = dist.icon;
                
                return (
                  <SelectItem 
                    key={dist.id} 
                    value={dist.id}
                    disabled={!connected}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span>{dist.name}</span>
                      {!connected && dist.id !== 'manual' && (
                        <Badge variant="outline" className="text-xs">Not Connected</Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          
          {provider !== 'manual' && !isProviderConnected(provider) && (
            <div className="p-3 bg-background border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700">
                Connect your {DISTRIBUTORS.find(d => d.id === provider)?.name} account in Settings → Connections to enable this provider.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Current Status */}
        <div className="space-y-3">
          <Label>Distribution Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={release.distribution_status === 'live' ? 'default' : 'outline'}>
              {release.distribution_status || 'pending'}
            </Badge>
            {release.distribution_submission_ref && (
              <span className="text-sm text-muted-foreground">
                Ref: {release.distribution_submission_ref}
              </span>
            )}
          </div>
        </div>

        <Separator />

        {/* Export Information */}
        <div className="space-y-3">
          <Label>Export Details</Label>
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>Selected Provider:</strong> {DISTRIBUTORS.find(d => d.id === provider)?.name}
            </p>
            {provider === 'manual' && (
              <p className="text-sm text-muted-foreground">
                Manual export will generate a ZIP package with metadata.json and all assets.
              </p>
            )}
            {provider !== 'manual' && (
              <p className="text-sm text-muted-foreground">
                Provider-specific export will include {provider.toUpperCase()} formatted files alongside standard package.
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button 
            onClick={saveDistributionSettings}
            disabled={loading}
            variant="outline"
          >
            {loading ? "Saving..." : "Save Settings"}
          </Button>
          
          <Button
            onClick={generateDistributionPackage}
            disabled={generateLoading || !isProviderConnected(provider)}
          >
            {generateLoading ? "Generating..." : "Generate Package"}
          </Button>
          
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};