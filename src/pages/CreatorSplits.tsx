import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { SplitsManager } from "@/components/SplitsManager";

const CreatorSplitsPage = () => {
  useEffect(() => {
    setMeta(
      "Royalty Splits — Pluggd",
      "Manage revenue splits for your beats, releases, and sample packs with collaborators.",
      "/dashboard/creator/splits"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <SplitsManager />
        </div>
      </main>
    </div>
  );
};

export default CreatorSplitsPage;