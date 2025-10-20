import { useEffect, useMemo, useState } from "react";
import { Hash, Link2, Loader2, ShieldCheck, Unplug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { OAuthService } from "@/services/plugins/oauth-service";

interface TikTokConnectionMeta {
  id: string;
  accountId: string | null;
  accountName: string | null;
  avatarUrl: string | null;
  method: "oauth" | "apiKey";
  connectedAt: string | null;
  updatedAt: string | null;
  expiresAt: string | null;
  scope: string | null;
  sandbox: boolean;
}

type ConnectorStatus = "connected" | "disconnected" | "error" | "loading";

const statusCopy: Record<Exclude<ConnectorStatus, "loading">, { label: string; badgeClass: string }> = {
  connected: { label: "Connected", badgeClass: "border-green-600 text-green-600" },
  disconnected: { label: "Not Connected", badgeClass: "border-muted-foreground text-muted-foreground" },
  error: { label: "Connection Error", badgeClass: "border-destructive text-destructive" },
};

export const ConnectionsModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectorStatus>("loading");
  const [connection, setConnection] = useState<TikTokConnectionMeta | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showApiForm, setShowApiForm] = useState(false);

  useEffect(() => {
    if (!user) {
      setStatus("disconnected");
      setConnection(null);
      return;
    }

    const fetchStatus = async () => {
      setStatus("loading");
      const { data, error } = await supabase.functions.invoke("tiktok-connector", {
        body: { action: "status" },
      });

      if (error) {
        console.error("Failed to load TikTok connection", error);
        setStatus("error");
        setConnection(null);
        return;
      }

      if (data?.status === "connected") {
        setConnection(data.connection as TikTokConnectionMeta);
        setStatus("connected");
      } else {
        setConnection(null);
        setStatus("disconnected");
      }
    };

    fetchStatus().catch((err) => {
      console.error("Unable to fetch TikTok connection status", err);
      setStatus("error");
      setConnection(null);
    });
  }, [user?.id]);

  const formattedUpdatedAt = useMemo(() => {
    if (!connection?.updatedAt) return null;
    try {
      return new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(connection.updatedAt));
    } catch (error) {
      console.error("Failed to format TikTok timestamp", error);
      return null;
    }
  }, [connection?.updatedAt]);

  const handleApiKeyConnect = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountName.trim() || !accountId.trim() || !apiKey.trim()) {
      toast({
        title: "Missing details",
        description: "Account name, account ID, and API key are required to link TikTok manually.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke("tiktok-connector", {
        body: {
          action: "connect",
          method: "apiKey",
          accountName: accountName.trim(),
          accountId: accountId.trim(),
          apiKey: apiKey.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || "Unable to save API key");
      }

      if (data?.status === "connected") {
        setConnection(data.connection as TikTokConnectionMeta);
        setStatus("connected");
        setShowApiForm(false);
        toast({
          title: "TikTok linked",
          description: "API key saved and ready for export workflows.",
        });
      } else {
        throw new Error("TikTok connection did not report a success status");
      }
    } catch (error: any) {
      console.error("TikTok manual connect failed", error);
      setStatus("error");
      toast({
        title: "Could not link TikTok",
        description: error?.message || "Please verify the credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke("tiktok-connector", {
        body: { action: "disconnect" },
      });

      if (error) {
        throw new Error(error.message || "Unable to disconnect");
      }

      if (data?.status === "disconnected") {
        setConnection(null);
        setStatus("disconnected");
        toast({
          title: "TikTok disconnected",
          description: "We removed your saved credentials.",
        });
      } else {
        throw new Error("Unexpected response from connector");
      }
    } catch (error: any) {
      console.error("Failed to disconnect TikTok", error);
      setStatus("error");
      toast({
        title: "Disconnect failed",
        description: error?.message || "Please try again in a few moments.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const launchOAuth = () => {
    try {
      const url = OAuthService.getAuthorizationUrl("tiktok_business");
      window.location.href = url;
    } catch (error: any) {
      console.error("Unable to start TikTok OAuth", error);
      toast({
        title: "OAuth unavailable",
        description: error?.message || "Double-check your TikTok client credentials.",
        variant: "destructive",
      });
    }
  };

  const renderStatusBadge = () => {
    if (status === "loading") {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-muted-foreground border-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Checking…
        </Badge>
      );
    }

    const copy = statusCopy[status] ?? statusCopy.error;
    return (
      <Badge variant="outline" data-testid="tiktok-connection-status" className={`flex items-center gap-1 ${copy.badgeClass}`}>
        {status === "connected" ? <ShieldCheck className="h-3 w-3" /> : <Unplug className="h-3 w-3" />}
        {copy.label}
      </Badge>
    );
  };

  return (
    <Card data-testid="tiktok-connection-card" className="border-dashed">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Hash className="h-5 w-5" /> TikTok Connector
          </CardTitle>
          <CardDescription>
            Link TikTok to export campaign-ready assets directly from your catalog workflow.
          </CardDescription>
        </div>
        {renderStatusBadge()}
      </CardHeader>
      <CardContent className="space-y-6">
        {connection && (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <Link2 className="h-4 w-4 text-primary" /> Connected as {connection.accountName ?? "Unknown account"}
            </div>
            <div className="text-muted-foreground flex flex-wrap gap-3">
              {connection.method === "apiKey" ? (
                <Badge variant="outline" className="border-indigo-500 text-indigo-500">API Key</Badge>
              ) : (
                <Badge variant="outline" className="border-blue-500 text-blue-500">OAuth</Badge>
              )}
              {connection.sandbox && (
                <Badge variant="outline" className="border-amber-500 text-amber-500">Sandbox</Badge>
              )}
              {connection.scope && (
                <span>Scope: {connection.scope}</span>
              )}
              {formattedUpdatedAt && <span>Last updated {formattedUpdatedAt}</span>}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={launchOAuth} variant="default" size="sm" disabled={saving}>
            Use TikTok OAuth
          </Button>
          <Button
            onClick={() => setShowApiForm((value) => !value)}
            variant="outline"
            size="sm"
            disabled={saving}
            data-testid="toggle-api-form"
          >
            {showApiForm ? "Hide API key form" : "Use API key"}
          </Button>
          {status === "connected" && (
            <Button
              onClick={handleDisconnect}
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={saving}
            >
              Disconnect
            </Button>
          )}
        </div>

        {showApiForm && (
          <form onSubmit={handleApiKeyConnect} className="grid gap-4" data-testid="api-key-form">
            <div className="grid gap-2">
              <Label htmlFor="tiktok-account-name">Account display name</Label>
              <Input
                id="tiktok-account-name"
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
                placeholder="TikTok Artist Handle"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tiktok-account-id">Business account ID</Label>
              <Input
                id="tiktok-account-id"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                placeholder="e.g. 720103918273"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tiktok-api-key">TikTok API key</Label>
              <Input
                id="tiktok-api-key"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste the generated API key"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save API key
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};
