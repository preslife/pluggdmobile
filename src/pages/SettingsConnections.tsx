import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { EnhancedConnections } from "@/components/EnhancedConnections";

const SettingsConnectionsPage = () => {
  useEffect(() => {
    setMeta(
      "Connections — Pluggd",
      "Connect your music distribution and social media accounts to streamline your workflow.",
      "/settings/connections"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
            <p className="text-muted-foreground mt-2">
              Connect your accounts to streamline your music distribution and promotion workflow.
            </p>
          </div>
          
          <EnhancedConnections />
        </div>
      </main>
    </div>
  );
};

export default SettingsConnectionsPage;