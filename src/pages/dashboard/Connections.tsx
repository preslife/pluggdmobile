import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { EnhancedConnections } from "@/components/EnhancedConnections";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { setMeta } from "@/lib/seo";
import { Share2 } from "lucide-react";

const ConnectionsPage = () => {
  const { user } = useAuth();

  useEffect(() => {
    setMeta(
      "Connections — Pluggd",
      "Manage integrations for distribution, social posting, and marketing automation.",
      "/dashboard/connections"
    );
  }, []);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28">
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                Connections & integrations
              </CardTitle>
              <CardDescription>
                Link distribution partners, sync your CRM, and connect automation tools to keep everything in sync.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Authorise providers once to unlock hands-off distribution and marketing. We will refresh tokens, surface sync
                errors, and let you test exports directly from this dashboard.
              </p>
            </CardContent>
          </Card>
        </div>

        <EnhancedConnections />
      </main>
    </div>
  );
};

export default ConnectionsPage;
