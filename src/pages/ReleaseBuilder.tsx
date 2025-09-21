
import { EnhancedReleaseBuilder } from "@/components/EnhancedReleaseBuilder";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
const ReleaseBuilder = () => {
  useEffect(() => {
    setMeta(
      "Release Builder — Pluggd",
      "Create professional releases with advanced tools and distribution options.",
      "/release/new"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main>
        <EnhancedReleaseBuilder />
      </main>
    </div>
  );
};

export default ReleaseBuilder;
