import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageSquare, Code, Key, Settings, ExternalLink } from "lucide-react";

const DocsIntegrationsPage = () => {
  useEffect(() => {
    setMeta(
      "Integrations Documentation — Pluggd",
      "Learn how to set up Mailchimp email marketing and Discord community perks for your creator account.",
      "/docs/integrations"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Integration Setup Guides</h1>
            <p className="text-muted-foreground mt-2">
              Step-by-step instructions for connecting Mailchimp and Discord to grow your audience and reward your community.
            </p>
          </div>

          {/* Mailchimp Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Mailchimp Email Marketing
              </CardTitle>
              <CardDescription>
                Sync your Pluggd audience to Mailchimp for email marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Prerequisites</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Active Mailchimp account (free plan works)</li>
                  <li>• At least one Audience (List) created in Mailchimp</li>
                  <li>• Creator account on Pluggd with active subscription tiers</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Setup Steps</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">1. Connect Your Mailchimp Account</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Go to Settings → Connections and click "Connect Mailchimp". You'll be redirected to authorize Pluggd to access your Mailchimp account.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">2. Select Your Audience</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose which Mailchimp audience you want to sync your Pluggd followers, subscribers, and buyers to.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">3. Configure Auto-Sync</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enable auto-sync to automatically add new followers and subscribers to your Mailchimp audience daily.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">4. Export Your Current Audience</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Export Now" to immediately sync your existing audience with the following tags:
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">pluggd_follower</Badge>
                      <Badge variant="outline">pluggd_subscriber</Badge>
                      <Badge variant="outline">pluggd_buyer</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">What Gets Synced</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">Followers</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Users who follow your profile
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">Active Subscribers</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Users with active subscription tiers
                    </div>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <div className="font-medium text-sm">Buyers</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Users who purchased your content
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discord Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Discord Community Perks
              </CardTitle>
              <CardDescription>
                Automatically grant Discord roles to subscribers based on their tier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Prerequisites</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Discord server where you have "Manage Roles" permission</li>
                  <li>• Created roles for each subscription tier</li>
                  <li>• Bot permissions set up correctly</li>
                </ul>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Setup Steps</h3>
                <div className="space-y-4">
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">1. Add Pluggd Bot to Your Server</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Click "Add Bot to Server" and authorize the Pluggd bot with "Manage Roles" permission.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">2. Get Your Server ID</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then right-click your server name and select "Copy Server ID".
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">3. Create and Configure Roles</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create Discord roles for each subscription tier. Make sure the Pluggd bot role is positioned above the subscriber roles in your server's role hierarchy.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">4. Map Roles to Tiers</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      For each role, right-click and "Copy Role ID", then paste it in the corresponding subscription tier mapping in Pluggd settings.
                    </p>
                  </div>
                  
                  <div className="border-l-4 border-primary pl-4">
                    <div className="font-medium">5. Test the Integration</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Have a fan connect their Discord account and subscribe to test that roles are granted automatically.
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">How It Works</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    • When a fan subscribes to your tier, they automatically get the corresponding Discord role
                  </p>
                  <p>
                    • When they cancel or their subscription expires, the role is automatically removed
                  </p>
                  <p>
                    • Fans must connect their Discord account in their Pluggd profile for this to work
                  </p>
                  <p>
                    • Role changes happen within minutes of subscription changes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Troubleshooting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">Mailchimp Export Fails</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check that you've selected an audience and that your Mailchimp account has sufficient limits for the number of contacts being imported.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">Discord Roles Not Working</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ensure the Pluggd bot role is above subscriber roles in your server hierarchy, and that fans have connected their Discord accounts.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium">Can't Find Discord IDs</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make sure Developer Mode is enabled in Discord settings. This allows you to right-click and copy IDs for servers and roles.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Related Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Related Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <a href="/docs/webhooks" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span className="font-medium">Webhook Events</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Learn about subscription events and webhooks
                  </p>
                </a>
                
                <a href="/creator/developer" className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    <span className="font-medium">API Access</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate API tokens for custom integrations
                  </p>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DocsIntegrationsPage;