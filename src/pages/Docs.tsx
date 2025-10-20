import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Code, 
  Webhook, 
  Key, 
  Book, 
  ExternalLink, 
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";

const Docs = () => {
  useEffect(() => {
    setMeta(
      "API Documentation — Pluggd",
      "Complete API reference, webhook guides, and integration examples for Pluggd developers",
      "/docs"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Developer Documentation</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to integrate with Pluggd's API and build amazing creator tools
            </p>
          </div>

          <div className="grid gap-8">
            {/* Quick Start */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Start
                </CardTitle>
                <CardDescription>
                  Get up and running with the Pluggd API in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">1</div>
                      <h4 className="font-medium">Get API Token</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Visit your Developer page to create an API token
                    </p>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">2</div>
                      <h4 className="font-medium">Make API Call</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Use the token to authenticate API requests
                    </p>
                  </div>
                  <div className="p-4 border rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">3</div>
                      <h4 className="font-medium">Build Amazing Things</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create tools and integrations for creators
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded">
                  <h5 className="font-medium mb-2">Example API Request:</h5>
                  <pre className="text-sm overflow-x-auto"><code>{`curl -H "Authorization: Bearer pk_your_token_here" \\
     https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/api-v1/me`}</code></pre>
                </div>
              </CardContent>
            </Card>

            {/* Documentation Sections */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* API Reference */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    API Reference
                  </CardTitle>
                  <CardDescription>
                    Complete reference for all API endpoints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/me</code>
                        <p className="text-xs text-muted-foreground">Get creator profile</p>
                      </div>
                      <Badge variant="secondary">Basic</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/releases</code>
                        <p className="text-xs text-muted-foreground">List published releases</p>
                      </div>
                      <Badge variant="secondary">Content</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/beats</code>
                        <p className="text-xs text-muted-foreground">List published beats</p>
                      </div>
                      <Badge variant="secondary">Content</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/stats/daily</code>
                        <p className="text-xs text-muted-foreground">Get analytics data</p>
                      </div>
                      <Badge variant="secondary">Analytics</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">GET /api/v1/smartlinks</code>
                        <p className="text-xs text-muted-foreground">List smartlinks</p>
                      </div>
                      <Badge variant="secondary">Links</Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h5 className="font-medium mb-2">Authentication</h5>
                    <div className="bg-muted p-3 rounded">
                      <code className="text-sm">Authorization: Bearer pk_your_token_here</code>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h5 className="font-medium mb-2">Rate Limits</h5>
                    <p className="text-sm text-muted-foreground">
                      60 requests per minute per token. Rate limit headers included in responses.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Webhooks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Webhooks
                  </CardTitle>
                  <CardDescription>
                    Real-time event notifications for your applications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">purchase.created</code>
                        <p className="text-xs text-muted-foreground">New purchase made</p>
                      </div>
                      <Badge variant="outline">Revenue</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">subscription.updated</code>
                        <p className="text-xs text-muted-foreground">Fan subscription change</p>
                      </div>
                      <Badge variant="outline">Growth</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">comment.created</code>
                        <p className="text-xs text-muted-foreground">New comment posted</p>
                      </div>
                      <Badge variant="outline">Engagement</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <code className="font-mono text-sm">follower.created</code>
                        <p className="text-xs text-muted-foreground">New follower gained</p>
                      </div>
                      <Badge variant="outline">Growth</Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <h5 className="font-medium mb-2">Security</h5>
                    <p className="text-sm text-muted-foreground">
                      All webhooks are signed with HMAC-SHA256 using your endpoint secret.
                    </p>
                  </div>
                  
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/docs/webhooks">
                      Full Webhook Guide
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Code Examples */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5" />
                  Code Examples
                </CardTitle>
                <CardDescription>
                  Ready-to-use code snippets in popular languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">JavaScript/Node.js</h4>
                    <div className="bg-muted p-4 rounded">
                      <pre className="text-sm overflow-x-auto"><code>{`// Fetch creator profile
const response = await fetch(
  'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/api-v1/me',
  {
    headers: {
      'Authorization': 'Bearer pk_your_token_here'
    }
  }
);

const profile = await response.json();
console.log(profile);`}</code></pre>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Python</h4>
                    <div className="bg-muted p-4 rounded">
                      <pre className="text-sm overflow-x-auto"><code>{`import requests

headers = {
    'Authorization': 'Bearer pk_your_token_here'
}

response = requests.get(
    'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/api-v1/me',
    headers=headers
)

profile = response.json()
print(profile)`}</code></pre>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Webhook Verification (Node.js)</h4>
                  <div className="bg-muted p-4 rounded">
                    <pre className="text-sm overflow-x-auto"><code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return signature === \`sha256=\${expectedSignature}\`;
}

app.post('/webhook', (req, res) => {
  const signature = req.get('X-Pluggd-Signature');
  
  if (verifyWebhook(req.body, signature, process.env.WEBHOOK_SECRET)) {
    // Process webhook
    console.log('Event:', req.body.event);
    res.status(200).send('OK');
  } else {
    res.status(401).send('Unauthorized');
  }
});`}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Getting Started */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Authentication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Create API tokens in your Developer settings. Include the token in the Authorization header for all requests.
                  </p>
                  <Button className="w-full" asChild>
                    <a href="/dashboard/creator/developer">
                      Create API Token
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    All API calls are secured with token authentication. Webhooks use HMAC signatures for verification.
                  </p>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/docs/webhooks#security">
                      Security Guide
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Rate Limits
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    60 requests per minute per token. Rate limit information is included in response headers.
                  </p>
                  <div className="text-xs font-mono bg-muted p-2 rounded">
                    X-RateLimit-Remaining: 59
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resources */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Resources</CardTitle>
                <CardDescription>
                  More tools and guides to help you build with Pluggd
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
                    <a href="/partners">
                      <Webhook className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Partner Program</div>
                        <div className="text-xs text-muted-foreground">Join our partner ecosystem</div>
                      </div>
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
                    <a href="/docs/webhooks">
                      <Book className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Webhook Guide</div>
                        <div className="text-xs text-muted-foreground">Zapier & Make.com examples</div>
                      </div>
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
                    <a href="/postman/pluggd-api.postman_collection.json" download>
                      <Zap className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Postman Collection</div>
                        <div className="text-xs text-muted-foreground">Download API reference workspace</div>
                      </div>
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-start space-y-2" asChild>
                    <a href="mailto:developers@pluggd.com">
                      <ExternalLink className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">Developer Support</div>
                        <div className="text-xs text-muted-foreground">Get help from our team</div>
                      </div>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Docs;