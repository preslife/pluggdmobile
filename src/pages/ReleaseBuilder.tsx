
import { EnhancedReleaseBuilder } from "@/components/EnhancedReleaseBuilder";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";
import { buildOgImageUrl } from "@/lib/og";
const ReleaseBuilder = () => {
  useEffect(() => {
    const canonicalPath = "/release/new";
    const description = "Create professional releases with advanced mastering, split tracking, and smart distribution controls.";
    const origin = typeof window !== "undefined" ? window.location.origin : "https://pluggd.fm";
    const ogUrl = buildOgImageUrl({
      title: "Release Builder Preview",
      description,
      type: "store",
      resourceUrl: `${origin}${canonicalPath}`,
    });

    setMeta(
      "Release Builder Preview | Pluggd",
      description,
      canonicalPath,
      ogUrl,
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
