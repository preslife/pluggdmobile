
import { CreatorDashboard } from "@/components/CreatorDashboard";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const CreatorDashboardPage = () => {
  useEffect(() => {
    setMeta(
      "Creator Dashboard — Pluggd",
      "Manage your sample packs, track earnings, and grow your music business.",
      "/creator/dashboard"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <CreatorDashboard />
        </div>
      </main>
    </div>
  );
};

export default CreatorDashboardPage;