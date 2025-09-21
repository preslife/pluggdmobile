import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Copy, Trash2, Plus, RefreshCw, Settings } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface TokenManagementProps {
  tokens: ApiToken[];
  onTokensChange: () => void;
  userId?: string;
}

const AVAILABLE_SCOPES = [
  { value: 'read_releases', label: 'Read Releases' },
  { value: 'read_beats', label: 'Read Beats' },
  { value: 'read_stats', label: 'Read Statistics' },
  { value: 'read_smartlinks', label: 'Read Smartlinks' },
];

export const TokenManagement = ({ tokens, onTokensChange, userId }: TokenManagementProps) => {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenScopes, setNewTokenScopes] = useState<string[]>(['read_releases', 'read_beats', 'read_stats']);
  const [newTokenRateLimit, setNewTokenRateLimit] = useState(60);
  const [showToken, setShowToken] = useState<string | null>(null);
  const [newTokenValue, setNewTokenValue] = useState<string | null>(null);

  const generateToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'pk_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const hashToken = async (token: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const createToken = async () => {
    if (!newTokenLabel.trim()) {
      toast({
        title: "Label Required",
        description: "Please provide a label for your API token",
        variant: "destructive",
      });
      return;
    }

    if (newTokenScopes.length === 0) {
      toast({
        title: "Scopes Required",
        description: "Please select at least one scope for your API token",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const token = generateToken();
      const tokenHash = await hashToken(token);

      const { error } = await supabase
        .from('api_tokens')
        .insert({
          user_id: userId,
          label: newTokenLabel.trim(),
          token_hash: tokenHash,
          scopes: newTokenScopes,
          rate_limit_per_min: newTokenRateLimit,
        });

      if (error) throw error;

      setNewTokenValue(token);
      setNewTokenLabel("");
      setNewTokenScopes(['read_releases', 'read_beats', 'read_stats']);
      setNewTokenRateLimit(60);
      onTokensChange();

      // Track token creation
      trackPhase4Events.apiTokenCreated(newTokenLabel.trim(), newTokenScopes);

      toast({
        title: "Token Created",
        description: "Your API token has been created successfully. Make sure to copy it now - you won't be able to see it again.",
      });
    } catch (error: any) {
      console.error('Error creating token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create API token",
        variant: "destructive",
      });
    }
    setCreating(false);
  };

  const revokeToken = async (tokenId: string, label: string) => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ revoked: true })
        .eq('id', tokenId);

      if (error) throw error;

      onTokensChange();
      
      // Track token revocation
      trackPhase4Events.apiTokenRevoked(tokenId);
      
      toast({
        title: "Token Revoked",
        description: `Token "${label}" has been revoked successfully.`,
      });
    } catch (error: any) {
      console.error('Error revoking token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke token",
        variant: "destructive",
      });
    }
  };

  const updateTokenRateLimit = async (tokenId: string, rateLimit: number) => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update({ rate_limit_per_min: rateLimit })
        .eq('id', tokenId);

      if (error) throw error;

      onTokensChange();
      toast({
        title: "Rate Limit Updated",
        description: `Rate limit has been updated to ${rateLimit} requests per minute.`,
      });
    } catch (error: any) {
      console.error('Error updating rate limit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update rate limit",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Token copied to clipboard",
    });
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">API Tokens</h2>
          <p className="text-muted-foreground">Manage your API tokens for programmatic access</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Create a new API token for programmatic access to your data.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token-label">Token Label</Label>
                <Input
                  id="token-label"
                  placeholder="e.g., My App Integration"
                  value={newTokenLabel}
                  onChange={(e) => setNewTokenLabel(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Scopes</Label>
                <div className="space-y-2 mt-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <div key={scope.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={scope.value}
                        checked={newTokenScopes.includes(scope.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewTokenScopes([...newTokenScopes, scope.value]);
                          } else {
                            setNewTokenScopes(newTokenScopes.filter(s => s !== scope.value));
                          }
                        }}
                      />
                      <Label htmlFor={scope.value} className="text-sm">{scope.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="rate-limit">Rate Limit (requests per minute)</Label>
                <Select value={newTokenRateLimit.toString()} onValueChange={(value) => setNewTokenRateLimit(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 requests/min</SelectItem>
                    <SelectItem value="60">60 requests/min</SelectItem>
                    <SelectItem value="120">120 requests/min</SelectItem>
                    <SelectItem value="300">300 requests/min</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={createToken} disabled={creating} className="w-full">
                {creating ? "Creating..." : "Create Token"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {newTokenValue && (
        <Alert className="border-primary">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Your new API token:</p>
              <div className="flex items-center space-x-2">
                <code className="bg-muted px-2 py-1 rounded text-sm flex-1 break-all">
                  {showToken === newTokenValue ? newTokenValue : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToken(showToken === newTokenValue ? null : newTokenValue)}
                >
                  {showToken === newTokenValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(newTokenValue)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Make sure to copy your token now. You won't be able to see it again!
              </p>
              <Button variant="outline" size="sm" onClick={() => setNewTokenValue(null)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        {tokens.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">No API tokens created yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first token to get started with the API.</p>
            </CardContent>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{token.label}</CardTitle>
                    <CardDescription>
                      Created {new Date(token.created_at).toLocaleDateString()} • 
                      Last used {formatLastUsed(token.last_used_at)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Token Settings</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Rate Limit</Label>
                            <Select 
                              value={token.rate_limit_per_min.toString()} 
                              onValueChange={(value) => updateTokenRateLimit(token.id, parseInt(value))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="30">30 requests/min</SelectItem>
                                <SelectItem value="60">60 requests/min</SelectItem>
                                <SelectItem value="120">120 requests/min</SelectItem>
                                <SelectItem value="300">300 requests/min</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeToken(token.id, token.label)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {token.scopes.map((scope) => (
                    <Badge key={scope} variant="secondary" className="text-xs">
                      {AVAILABLE_SCOPES.find(s => s.value === scope)?.label || scope}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Rate limit: {token.rate_limit_per_min} requests/min</span>
                  <span>Token ID: {token.id.slice(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};