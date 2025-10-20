import { useState, useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Copy, Trash2, Code, Key, Webhook, TrendingUp, BarChart3, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenManagement } from "@/components/developer/TokenManagement";
import { ApiUsageCharts } from "@/components/developer/ApiUsageCharts";
import { trackPhase4Events } from "@/lib/analytics";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { logger } from "@/lib/logger";

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

interface DeveloperWebhook {
  id: string;
  name: string;
  url: string;
  secret?: string | null;
  secret_preview?: string | null;
  events: string[];
  created_at: string;
  last_triggered_at?: string | null;
  status?: string | null;
}

const webhookSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  url: z.string().url("Please enter a valid URL"),
  secret: z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : "")),
  events: z
    .array(z.string())
    .min(1, "Select at least one event"),
});

type WebhookFormValues = z.infer<typeof webhookSchema>;

const WEBHOOK_EVENTS = [
  {
    value: "purchase.created",
    label: "Purchase Created",
    description: "Triggered when someone purchases your beat or release.",
  },
  {
    value: "subscription.updated",
    label: "Subscription Updated",
    description: "Triggered when a fan subscribes to or cancels their subscription.",
  },
  {
    value: "comment.created",
    label: "Comment Created",
    description: "Triggered when someone comments on your post or release.",
  },
  {
    value: "follower.created",
    label: "Follower Created",
    description: "Triggered when someone follows your profile.",
  },
];

const CreatorDeveloper = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageStats, setUsageStats] = useState<Record<string, ApiUsageStats>>({});
  const [activeTab, setActiveTab] = useState<'tokens' | 'usage' | 'webhooks'>('tokens');
  const [webhooks, setWebhooks] = useState<DeveloperWebhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const webhookForm = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: "",
      url: "",
      secret: "",
      events: ["purchase.created"],
    },
  });

  useEffect(() => {
    setMeta(
      "Developer API — Pluggd",
      "Create API tokens to access your Pluggd data programmatically.",
      "/dashboard/creator/developer"
    );
  }, []);

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

  const fetchWebhooks = async () => {
    setWebhooksLoading(true);
    try {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const { data, error } = await supabase.rpc('developer_list_webhooks');

      if (error) {
        throw error;
      }

      setWebhooks((data as DeveloperWebhook[]) || []);
      setRevealedSecrets((prev) => {
        const next: Record<string, boolean> = {};
        (data as DeveloperWebhook[] | undefined)?.forEach((webhook) => {
          if (prev[webhook.id]) {
            next[webhook.id] = true;
          }
        });
        return next;
      });
      logger.info('Developer webhooks fetched', {
        component: 'CreatorDeveloper',
        action: 'list_webhooks',
        count: data?.length ?? 0,
        durationMs: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - start),
      });
    } catch (error: any) {
      const message = error?.message || 'Failed to load webhooks';
      logger.error(
        'Failed to fetch developer webhooks',
        {
          component: 'CreatorDeveloper',
          action: 'list_webhooks',
          error: message,
        },
        error instanceof Error ? error : undefined
      );
      toast({
        title: 'Unable to load webhooks',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setWebhooksLoading(false);
    }
  };

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateSecret = () => {
    const array = new Uint8Array(32);
    const cryptoObj =
      (typeof window !== 'undefined' && window.crypto) ||
      ((globalThis as typeof globalThis & { crypto?: Crypto }).crypto);

    if (cryptoObj?.getRandomValues) {
      cryptoObj.getRandomValues(array);
      return 'wh_' + Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }

    return (
      'wh_' +
      Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    );
  };

  const handleGenerateSecret = () => {
    const secret = generateSecret();
    webhookForm.setValue('secret', secret, { shouldDirty: true });
    logger.info('Developer webhook secret generated', {
      component: 'CreatorDeveloper',
      action: 'generate_secret',
    });
  };

  const handleCreateWebhook = async (values: WebhookFormValues) => {
    const secret = values.secret?.trim() ? values.secret.trim() : generateSecret();

    try {
      const { data, error } = await supabase.rpc('developer_create_webhook', {
        name: values.name.trim(),
        url: values.url.trim(),
        secret,
        events: values.events,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Webhook created',
        description: `"${values.name.trim()}" is ready. Save this secret: ${secret}`,
      });

      logger.info('Developer webhook created', {
        component: 'CreatorDeveloper',
        action: 'create_webhook',
        events: values.events,
        url: values.url.trim(),
      });

      webhookForm.reset({
        name: '',
        url: '',
        secret: '',
        events: ['purchase.created'],
      });

      if (data && typeof data === 'object' && 'id' in (data as Record<string, unknown>)) {
        const created = data as DeveloperWebhook;
        setRevealedSecrets((prev) => ({ ...prev, [created.id]: true }));
      }

      await fetchWebhooks();
    } catch (error: any) {
      const message = error?.message || 'Failed to create webhook';
      logger.error(
        'Failed to create developer webhook',
        {
          component: 'CreatorDeveloper',
          action: 'create_webhook',
          error: message,
        },
        error instanceof Error ? error : undefined
      );
      toast({
        title: 'Error creating webhook',
        description: message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDeleteWebhook = async (webhookId: string, name: string) => {
    setDeletingWebhookId(webhookId);
    try {
      const { error } = await supabase.rpc('developer_delete_webhook', {
        webhook_id: webhookId,
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Webhook removed',
        description: `"${name}" will no longer receive events.`,
      });

      logger.info('Developer webhook deleted', {
        component: 'CreatorDeveloper',
        action: 'delete_webhook',
        webhookId,
      });

      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[webhookId];
        return next;
      });

      await fetchWebhooks();
    } catch (error: any) {
      const message = error?.message || 'Failed to delete webhook';
      logger.error(
        'Failed to delete developer webhook',
        {
          component: 'CreatorDeveloper',
          action: 'delete_webhook',
          error: message,
          webhookId,
        },
        error instanceof Error ? error : undefined
      );
      toast({
        title: 'Error deleting webhook',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setDeletingWebhookId(null);
    }
  };

  const toggleSecretVisibility = (id: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copySecretToClipboard = async (secret: string) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
        throw new Error('Clipboard API not available');
      }
      await navigator.clipboard.writeText(secret);
      toast({
        title: 'Copied to clipboard',
        description: 'Webhook secret copied successfully.',
      });
      logger.info('Developer webhook secret copied', {
        component: 'CreatorDeveloper',
        action: 'copy_secret',
      });
    } catch (error: any) {
      const message = error?.message || 'Copy not supported in this browser';
      toast({
        title: 'Unable to copy secret',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const getSecretDisplay = (webhook: DeveloperWebhook) => {
    if (revealedSecrets[webhook.id] && webhook.secret) {
      return webhook.secret;
    }

    if (webhook.secret_preview) {
      return webhook.secret_preview;
    }

    if (webhook.secret) {
      if (webhook.secret.length <= 8) {
        return '••••';
      }
      return `${webhook.secret.slice(0, 4)}••••${webhook.secret.slice(-4)}`;
    }

    return '—';
  };

  useEffect(() => {
    if (user) {
      fetchTokens();
      fetchWebhooks();
      trackPhase4Events.developerCenterAccessed();
    }
  }, [user]);

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
                <CardContent className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-semibold">Create webhook</h3>
                        <p className="text-sm text-muted-foreground">
                          Register an endpoint to receive live event notifications from Pluggd.
                        </p>
                      </div>

                      <Form {...webhookForm}>
                        <form
                          onSubmit={webhookForm.handleSubmit(handleCreateWebhook)}
                          className="space-y-4"
                        >
                          <FormField
                            control={webhookForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display name</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="Zapier Purchases"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={webhookForm.control}
                            name="url"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Endpoint URL</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="https://example.com/webhooks/pluggd"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={webhookForm.control}
                            name="secret"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Signing secret</FormLabel>
                                <div className="flex flex-col gap-2">
                                  <div className="flex gap-2">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="Auto-generated if left blank"
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={handleGenerateSecret}
                                      title="Generate strong secret"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    We'll use this secret to sign every webhook request. Keep it private.
                                  </p>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={webhookForm.control}
                            name="events"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Subscribed events</FormLabel>
                                <div className="space-y-3">
                                  {WEBHOOK_EVENTS.map((event) => {
                                    const checked = field.value?.includes(event.value);
                                    return (
                                      <label
                                        key={event.value}
                                        className="flex items-start gap-3 rounded-md border p-3"
                                      >
                                        <FormControl>
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(isChecked) => {
                                              const value = event.value;
                                              const nextChecked = isChecked === true;
                                              if (nextChecked) {
                                                field.onChange([...(field.value || []), value]);
                                              } else {
                                                field.onChange((field.value || []).filter((item) => item !== value));
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium leading-none">{event.label}</p>
                                          <p className="text-xs text-muted-foreground">{event.description}</p>
                                          <code className="text-[11px] font-mono text-muted-foreground block">
                                            {event.value}
                                          </code>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={webhookForm.formState.isSubmitting}
                          >
                            {webhookForm.formState.isSubmitting ? 'Creating…' : 'Create webhook'}
                          </Button>
                        </form>
                      </Form>
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-lg font-semibold">Existing webhooks</h3>
                          <p className="text-sm text-muted-foreground">
                            View delivery health and manage subscriptions.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={fetchWebhooks}
                          disabled={webhooksLoading}
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${webhooksLoading ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>

                      {webhooksLoading ? (
                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Loading webhooks…
                        </div>
                      ) : webhooks.length === 0 ? (
                        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          You haven't created any webhooks yet. Use the form to add your first endpoint.
                        </div>
                      ) : (
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>URL</TableHead>
                                <TableHead>Events</TableHead>
                                <TableHead>Secret</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead>Last delivery</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {webhooks.map((webhook) => {
                                const secretRevealed = Boolean(revealedSecrets[webhook.id]);
                                const canRevealSecret = Boolean(webhook.secret);
                                const canCopySecret = Boolean(webhook.secret && secretRevealed);
                                return (
                                  <TableRow key={webhook.id}>
                                    <TableCell className="font-medium">{webhook.name}</TableCell>
                                    <TableCell className="max-w-[220px] truncate">
                                      <a
                                        href={webhook.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline"
                                      >
                                        {webhook.url}
                                      </a>
                                    </TableCell>
                                    <TableCell className="min-w-[160px]">
                                      <div className="flex flex-wrap gap-1">
                                        {webhook.events.map((event) => (
                                          <Badge key={event} variant="secondary">
                                            {event}
                                          </Badge>
                                        ))}
                                      </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {getSecretDisplay(webhook)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {formatDateTime(webhook.created_at)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {formatDateTime(webhook.last_triggered_at)}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                      {webhook.status ?? 'Active'}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap text-right">
                                      <div className="flex justify-end gap-1">
                                        {canRevealSecret && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => toggleSecretVisibility(webhook.id)}
                                            title={secretRevealed ? 'Hide secret' : 'Reveal secret'}
                                          >
                                            {secretRevealed ? (
                                              <EyeOff className="h-4 w-4" />
                                            ) : (
                                              <Eye className="h-4 w-4" />
                                            )}
                                          </Button>
                                        )}
                                        {canCopySecret && webhook.secret && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => copySecretToClipboard(webhook.secret as string)}
                                            title="Copy secret"
                                          >
                                            <Copy className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDeleteWebhook(webhook.id, webhook.name)}
                                          disabled={deletingWebhookId === webhook.id}
                                          title="Delete webhook"
                                        >
                                          <Trash2 className={`h-4 w-4 ${deletingWebhookId === webhook.id ? 'animate-pulse' : ''}`} />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
                    Need help wiring things up? Follow the step-by-step guide in our{' '}
                    <a href="/docs/webhooks" className="text-primary hover:underline">
                      webhook documentation
                    </a>
                    .
                  </div>
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