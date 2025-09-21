
import { SamplePackStore } from "@/components/SamplePackStore";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const SamplePackStorePage = () => {
  useEffect(() => {
    setMeta(
      "Sample Pack Store — Pluggd",
      "Professional sample packs and loops from top producers. Download free samples or purchase premium packs.",
      "/sample-pack-store"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <SamplePackStore />
        </div>
      </main>
    </div>
  );
};

export default SamplePackStorePage;