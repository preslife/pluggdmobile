import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, Mail, CreditCard, Heart, Package, Code, DollarSign, MessageSquare } from "lucide-react";
import { trackPhase4Events } from "@/lib/analytics";

const Help = () => {
  useEffect(() => {
    setMeta(
      "Help & Support — Pluggd",
      "Get help with Credits, Tips, Bundles, Embeds, Subscriptions, and more.",
      "/help"
    );
    trackPhase4Events.helpPageViewed();
  }, []);

  const faqs = [
    {
      icon: CreditCard,
      title: "Credits System",
      description: "How Credits work and why they're better than traditional payments",
      content: "Credits are Pluggd's virtual currency that makes tipping and purchasing seamless. Buy Credits once, use them anywhere on the platform for instant transactions."
    },
    {
      icon: Heart,
      title: "Tips & Support",
      description: "Supporting your favorite creators with tips",
      content: "Tip creators instantly using Credits or card. 100% of your tip goes directly to the creator (minus standard payment processing fees)."
    },
    {
      icon: Package,
      title: "Bundles & PWYW",
      description: "How bundles and Pay What You Want pricing works",
      content: "Creators can bundle releases together or offer Pay What You Want pricing. Set your own price above the minimum to support artists more."
    },
    {
      icon: Code,
      title: "Embeds",
      description: "Embedding players on your website",
      content: "Copy embed codes from your Creator Dashboard to add customizable players to any website. Track plays and clicks from embedded content."
    },
    {
      icon: DollarSign,
      title: "Cash-out & Payouts",
      description: "Getting paid through Stripe Connect",
      content: "Connect your Stripe account to cash out earnings. Payments are processed securely and you can withdraw funds directly to your bank account."
    },
    {
      icon: MessageSquare,
      title: "PLUG Inbox",
      description: "Managing your unified social inbox",
      content: "PLUG consolidates messages from Instagram, Twitter, and Discord into one inbox. Post once to reach all your platforms simultaneously."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-4">Help & Support</h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about using Pluggd
            </p>
          </div>

          <div className="flex justify-center">
            <Button size="lg" asChild>
              <a href="/help/contact">
                <Mail className="h-5 w-5 mr-2" />
                Contact Support
              </a>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {faqs.map((faq, index) => {
              const IconComponent = faq.icon;
              return (
                <Card key={index} className="h-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <IconComponent className="h-6 w-6 text-primary" />
                      {faq.title}
                    </CardTitle>
                    <CardDescription>{faq.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{faq.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Help;