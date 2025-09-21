import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Webhook, Code, Zap, Shield } from "lucide-react";

const DocsWebhooks = () => {
  useEffect(() => {
    setMeta(
      "Webhooks Documentation — Pluggd",
      "Learn how to integrate Pluggd webhooks with your applications, including Zapier and Make.com",
      "/docs/webhooks"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Webhooks Documentation</h1>
            <p className="text-muted-foreground">
              Receive real-time notifications when events happen in your Pluggd account
            </p>
          </div>

          <div className="grid gap-6">
            {/* Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Overview
                </CardTitle>
                <CardDescription>
                  Webhooks allow you to receive instant notifications when specific events occur in your Pluggd account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  When an event occurs (like a new purchase or subscriber), Pluggd sends an HTTP POST request 
                  to your configured endpoint with details about the event. This enables real-time integrations 
                  with your own applications or third-party services like Zapier and Make.com.
                </p>
                
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    All webhook payloads are signed with HMAC-SHA256 for security verification.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Available Events */}
            <Card>
              <CardHeader>
                <CardTitle>Available Events</CardTitle>
                <CardDescription>Events you can subscribe to in your webhook configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">purchase.created</code>
                      <Badge variant="secondary">Revenue</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Triggered when someone purchases your beat or release
                    </p>
                  </div>
                  
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">subscription.updated</code>
                      <Badge variant="secondary">Subscribers</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Triggered when a fan subscribes to or cancels their subscription to your content
                    </p>
                  </div>
                  
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">comment.created</code>
                      <Badge variant="secondary">Engagement</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Triggered when someone comments on your post or release
                    </p>
                  </div>
                  
                  <div className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <code className="font-mono text-sm bg-muted px-2 py-1 rounded">follower.created</code>
                      <Badge variant="secondary">Growth</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Triggered when someone follows your profile
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Zapier Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Zapier Integration
                </CardTitle>
                <CardDescription>Connect Pluggd to thousands of apps with no coding required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Example: Send new purchases to Google Sheets</h4>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Create a new Zap in Zapier</li>
                      <li>Set trigger to "Webhooks by Zapier" → "Catch Hook"</li>
                      <li>Copy the webhook URL from Zapier</li>
                      <li>In Pluggd Developer page, add this URL and select "purchase.created" event</li>
                      <li>Set action to "Google Sheets" → "Create Spreadsheet Row"</li>
                      <li>Map the fields from the webhook data to your spreadsheet columns</li>
                    </ol>
                  </div>
                  
                  <div className="bg-muted p-4 rounded">
                    <h5 className="font-medium mb-2">Sample Zapier-friendly payload:</h5>
                    <pre className="text-xs overflow-x-auto"><code>{`{
  "event": "purchase.created",
  "created_at": "2024-01-15T10:30:00Z",
  "data": {
    "purchase_id": "abc123",
    "buyer_email": "fan@example.com",
    "item_title": "Hard Trap Beat",
    "amount": 29.99,
    "currency": "USD",
    "license_type": "premium"
  }
}`}</code></pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Make.com Integration */}
            <Card>
              <CardHeader>
                <CardTitle>Make.com Integration</CardTitle>
                <CardDescription>Create powerful automations with Make.com (formerly Integromat)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Example: Ping Discord on new subscriber</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Create a new scenario in Make.com</li>
                    <li>Add "Webhooks" → "Custom Webhook" as trigger</li>
                    <li>Copy the webhook URL from Make.com</li>
                    <li>In Pluggd Developer page, add this URL and select "subscription.updated" event</li>
                    <li>Add "Discord" → "Send a Message" as action</li>
                    <li>Configure Discord message with subscriber details</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Verification
                </CardTitle>
                <CardDescription>How to verify webhook authenticity</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Signature Verification</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Each webhook includes an <code>X-Pluggd-Signature</code> header containing an HMAC-SHA256 hash 
                    of the payload using your endpoint's secret key.
                  </p>
                  
                  <div className="bg-muted p-4 rounded">
                    <h5 className="font-medium mb-2">Verification example (JavaScript/Node.js):</h5>
                    <pre className="text-xs overflow-x-auto"><code>{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

// Usage in Express.js
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const signature = req.get('X-Pluggd-Signature');
  const payload = req.body;
  
  if (verifyWebhook(payload, signature, process.env.WEBHOOK_SECRET)) {
    // Process the webhook
    console.log('Verified webhook:', JSON.parse(payload));
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Getting Started
                </CardTitle>
                <CardDescription>Set up your first webhook in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li>
                    <strong>Go to Developer Settings:</strong> Visit your{" "}
                    <a href="/dashboard/creator/developer" className="text-primary hover:underline">
                      Creator Developer page
                    </a>
                  </li>
                  <li>
                    <strong>Add Webhook Endpoint:</strong> Enter your endpoint URL and generate a secret
                  </li>
                  <li>
                    <strong>Select Events:</strong> Choose which events you want to receive
                  </li>
                  <li>
                    <strong>Test Integration:</strong> Use a service like webhook.site to test your setup
                  </li>
                  <li>
                    <strong>Monitor Deliveries:</strong> Check the delivery log to ensure webhooks are working
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DocsWebhooks;