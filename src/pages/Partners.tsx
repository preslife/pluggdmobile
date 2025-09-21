import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  Code, 
  Webhook, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Zap, 
  ExternalLink,
  CheckCircle
} from "lucide-react";

const Partners = () => {
  useEffect(() => {
    setMeta(
      "Partner Program — Pluggd",
      "Join the Pluggd partner ecosystem. Integrate with our API, earn referral commissions, and grow together.",
      "/partners"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Partner with Pluggd</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join our partner ecosystem and help creators succeed while growing your own business
            </p>
          </div>

          <div className="grid gap-8">
            {/* Partnership Types */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />
                    API Partners
                  </CardTitle>
                  <CardDescription>
                    Build integrations and tools using our public API
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Full read access to creator data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Real-time webhook events
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Rate-limited access (60 req/min)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Comprehensive documentation
                    </li>
                  </ul>
                  <Button className="w-full" asChild>
                    <a href="/docs">View API Docs</a>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Referral Partners
                  </CardTitle>
                  <CardDescription>
                    Earn commissions by referring creators to Pluggd
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      15% recurring commission
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Custom referral codes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Real-time tracking dashboard
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Monthly payouts via PayPal
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Handshake className="h-5 w-5 text-primary" />
                    Strategic Partners
                  </CardTitle>
                  <CardDescription>
                    Co-marketing and business development opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Joint marketing campaigns
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Cross-platform integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Dedicated partner support
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Custom revenue sharing
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="mailto:partnerships@pluggd.com">Get in Touch</a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* API & Webhooks Section */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Public API v1
                  </CardTitle>
                  <CardDescription>
                    Read-only access to creator data with token-based authentication
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/me</code>
                        <p className="text-xs text-muted-foreground">Creator profile</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/releases</code>
                        <p className="text-xs text-muted-foreground">Published releases</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/beats</code>
                        <p className="text-xs text-muted-foreground">Published beats</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/stats/daily</code>
                        <p className="text-xs text-muted-foreground">Creator analytics</p>
                      </div>
                      <Badge variant="secondary">Public</Badge>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/docs">
                      View Full API Reference
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Real-time Webhooks
                  </CardTitle>
                  <CardDescription>
                    Get instant notifications for creator events
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">purchase.created</code>
                        <p className="text-xs text-muted-foreground">New sale notification</p>
                      </div>
                      <Badge variant="outline">Revenue</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">subscription.updated</code>
                        <p className="text-xs text-muted-foreground">Fan subscription changes</p>
                      </div>
                      <Badge variant="outline">Growth</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">comment.created</code>
                        <p className="text-xs text-muted-foreground">New engagement</p>
                      </div>
                      <Badge variant="outline">Social</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">follower.created</code>
                        <p className="text-xs text-muted-foreground">New follower</p>
                      </div>
                      <Badge variant="outline">Growth</Badge>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/docs/webhooks">
                      Webhook Documentation
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Integration Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Popular Integrations
                </CardTitle>
                <CardDescription>
                  See how partners are using Pluggd's API and webhooks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Analytics Dashboard</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Build custom analytics dashboards using the stats API to track creator performance across multiple platforms.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">API</Badge>
                      <Badge variant="secondary" className="text-xs">Analytics</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Discord Bot</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Notify Discord servers when creators get new subscribers or sales using webhooks.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">Webhooks</Badge>
                      <Badge variant="secondary" className="text-xs">Discord</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Google Sheets Sync</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Automatically sync sales and subscriber data to Google Sheets using Zapier integration.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">Zapier</Badge>
                      <Badge variant="secondary" className="text-xs">Automation</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">CRM Integration</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Sync fan subscription data with CRM systems for targeted marketing campaigns.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">API</Badge>
                      <Badge variant="secondary" className="text-xs">CRM</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Email Automation</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Trigger personalized email sequences when creators reach milestones or get new followers.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">Webhooks</Badge>
                      <Badge variant="secondary" className="text-xs">Email</Badge>
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded">
                    <h4 className="font-medium mb-2">Mobile App</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Build mobile apps that display creator content and statistics using the public API.
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">API</Badge>
                      <Badge variant="secondary" className="text-xs">Mobile</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Partner Benefits
                </CardTitle>
                <CardDescription>
                  What you get when you partner with Pluggd
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Revenue Opportunities</h4>
                        <p className="text-sm text-muted-foreground">
                          Earn through referral commissions, custom integrations, and strategic partnerships
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Access to Creator Ecosystem</h4>
                        <p className="text-sm text-muted-foreground">
                          Connect with thousands of active music creators and producers
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Code className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Technical Support</h4>
                        <p className="text-sm text-muted-foreground">
                          Dedicated developer support and comprehensive documentation
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Handshake className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Co-marketing Opportunities</h4>
                        <p className="text-sm text-muted-foreground">
                          Joint marketing campaigns and cross-promotion with our creator community
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <TrendingUp className="h-5 w-5 text-indigo-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Early Access</h4>
                        <p className="text-sm text-muted-foreground">
                          Get early access to new features and API endpoints before public release
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Webhook className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Real-time Data</h4>
                        <p className="text-sm text-muted-foreground">
                          Access to real-time webhooks and comprehensive analytics data
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Get Started */}
            <Card className="border-primary">
              <CardHeader className="text-center">
                <CardTitle>Ready to Partner with Pluggd?</CardTitle>
                <CardDescription>
                  Join our growing ecosystem of partners and help creators succeed
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <a href="/docs">
                      Explore API Docs
                      <Code className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <a href="mailto:partnerships@pluggd.com">
                      Contact Partnerships
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </div>
                
                <Alert>
                  <AlertDescription>
                    Have questions? Reach out to our partnerships team at{" "}
                    <a href="mailto:partnerships@pluggd.com" className="text-primary hover:underline">
                      partnerships@pluggd.com
                    </a>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Partners;