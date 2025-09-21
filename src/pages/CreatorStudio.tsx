import React, { useEffect } from "react";
import { CreatorStudio } from "@/components/CreatorStudio/CreatorStudio";
import { setMeta } from "@/lib/seo";

const CreatorStudioPage = () => {
  useEffect(() => {
    setMeta(
      "Creator Studio — Pluggd",
      "Professional creator dashboard with comprehensive tools for managing your music business, catalog, analytics, and more.",
      "/studio"
    );
  }, []);

  return <CreatorStudio />;
};

export default CreatorStudioPage;