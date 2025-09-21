import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plug, Zap, Settings } from "lucide-react";

interface DistributorConnection {
  id: string;
  provider: string;
  provider_user_id?: string;
  access_token?: string;
  connection_data?: any;
  created_at: string;
}

const DISTRIBUTORS = [
  {
    id: 'distrokid',
    name: 'DistroKid',
    description: 'Upload to Spotify, Apple Music, and more',
    icon: Zap,
    color: 'bg-orange-500'
  },
  {
    id: 'tunecore',
    name: 'TuneCore',
    description: 'Professional music distribution',
    icon: Settings,
    color: 'bg-blue-500'
  },
  {
    id: 'amuse',
    name: 'Amuse',
    description: 'Free music distribution',
    icon: Plug,
    color: 'bg-green-500'
  }
];

export const DistributorConnections = () => {
  const [connections, setConnections] = useState<DistributorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('social_connections')
        .select('*')
        .in('provider', ['distrokid', 'tunecore', 'amuse']);

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Error",
        description: "Failed to load distributor connections",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (provider: string) => {
    // OAuth placeholder - in production would redirect to provider OAuth
    toast({
      title: "Coming Soon",
      description: `${provider} integration will be available soon. Connect your account manually for now.`,
    });
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const { error } = await supabase
        .from('social_connections')
        .delete()
        .eq('provider', provider);

      if (error) throw error;

      setConnections(connections.filter(c => c.provider !== provider));
      toast({
        title: "Disconnected",
        description: `Successfully disconnected from ${provider}`,
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect",
        variant: "destructive"
      });
    }
  };

  const isConnected = (provider: string) => {
    return connections.some(c => c.provider === provider);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Distributor Connections
          </CardTitle>
          <CardDescription>
            Connect your music distribution accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg animate-pulse" />
                  <div className="space-y-2">
                    <div className="w-24 h-4 bg-muted rounded animate-pulse" />
                    <div className="w-32 h-3 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="w-20 h-8 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5" />
          Distributor Connections
        </CardTitle>
        <CardDescription>
          Connect your music distribution accounts to streamline releases
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DISTRIBUTORS.map((distributor) => {
            const connected = isConnected(distributor.id);
            const Icon = distributor.icon;
            
            return (
              <div key={distributor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${distributor.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{distributor.name}</div>
                    <div className="text-sm text-muted-foreground">{distributor.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {connected ? (
                    <>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Connected
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(distributor.id)}
                      >
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(distributor.id)}
                    >
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        <Separator className="my-6" />
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            <strong>Note:</strong> Distributor integrations are currently in development.
          </p>
          <p>
            Once connected, you'll be able to export release packages in the correct format for each distributor directly from the Distribution Panel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};