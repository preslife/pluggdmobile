import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { PlugAutomationList } from "@/components/PlugAutomationList";

const CreatorAutomationsPage = () => {
  useEffect(() => {
    setMeta(
      "PLUG Automations — Pluggd",
      "Automate your content and engagement with smart scheduling tools.",
      "/dashboard/creator/plug/automations"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-6xl mx-auto">
          <PlugAutomationList />
        </div>
      </main>
    </div>
  );
};

export default CreatorAutomationsPage;