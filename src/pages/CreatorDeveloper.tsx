import { useState, useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Copy, Trash2, Plus, Code, Key, Webhook, TrendingUp, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenManagement } from "@/components/developer/TokenManagement";
import { ApiUsageCharts } from "@/components/developer/ApiUsageCharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trackPhase4Events } from "@/lib/analytics";

interface ApiToken {
  id: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
  scopes: string[];
  rate_limit_per_min: number;
  revoked: boolean;
}

interface ApiUsageStats {
  calls_7d: number;
  calls_30d: number;
  success_rate: number;
  rate_limit_hits: number;
}

const CreatorDeveloper = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [showToken, setShowToken] = useState<string | null>(null);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<Record<string, ApiUsageStats>>({});
  const [activeTab, setActiveTab] = useState<'tokens' | 'usage' | 'webhooks'>('tokens');

  useEffect(() => {
    setMeta(
      "Developer API — Pluggd",
      "Create API tokens to access your Pluggd data programmatically.",
      "/dashboard/creator/developer"
    );
  }, []);

  useEffect(() => {
    if (user) {
      fetchTokens();
      trackPhase4Events.developerCenterAccessed();
    }
  }, [user]);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('id, label, last_used_at, created_at, scopes, rate_limit_per_min, revoked')
        .eq('user_id', user?.id)
        .eq('revoked', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    }
    setLoading(false);
  };

  const formatLastUsed = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Developer API</h1>
            <p className="text-muted-foreground">
              Manage API tokens, view usage analytics, and configure webhooks for programmatic access to your data.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tokens' | 'usage' | 'webhooks')} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="tokens" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                API Tokens
              </TabsTrigger>
              <TabsTrigger value="usage" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Usage Analytics
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tokens">
              <TokenManagement 
                tokens={tokens} 
                onTokensChange={fetchTokens}
                userId={user?.id}
              />
            </TabsContent>

            <TabsContent value="usage">
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold">API Usage Analytics</h2>
                  <p className="text-muted-foreground">Monitor your API usage patterns and performance</p>
                </div>
                <ApiUsageCharts />
              </div>
            </TabsContent>

            <TabsContent value="webhooks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhook Management
                  </CardTitle>
                  <CardDescription>
                    Configure webhook endpoints to receive real-time notifications about events in your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <Code className="h-4 w-4" />
                    <AlertDescription>
                      Webhook management interface coming soon. For now, webhooks can be configured through the API.
                      <br />
                      <a href="/docs/webhooks" className="text-primary hover:underline mt-2 inline-block">
                        View webhook documentation →
                      </a>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* API Documentation Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Quick reference for using the Pluggd API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API token in the Authorization header for all requests:
                </p>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  Authorization: Bearer YOUR_API_TOKEN
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                  https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/api-v1
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Available Endpoints</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <code>GET /me</code>
                    <span className="text-muted-foreground">Get user profile</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <code>GET /releases</code>
                    <span className="text-muted-foreground">Get user releases</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <code>GET /beats</code>
                    <span className="text-muted-foreground">Get user beats</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <code>GET /stats</code>
                    <span className="text-muted-foreground">Get analytics data</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted/50 rounded">
                    <code>GET /smartlinks</code>
                    <span className="text-muted-foreground">Get smartlinks</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button variant="outline" asChild>
                  <a href="/docs" target="_blank">
                    <Code className="h-4 w-4 mr-2" />
                    Full Documentation
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/docs/integrations" target="_blank">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Integration Examples
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreatorDeveloper;