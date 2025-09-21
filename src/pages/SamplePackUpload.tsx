import { EnhancedSamplePackUploader } from "@/components/EnhancedSamplePackUploader";

import { setMeta } from "@/lib/seo";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SamplePackUpload = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setMeta(
      "Upload Sample Pack — Pluggd",
      "Upload and sell your sample packs on the Pluggd marketplace.",
      "/sample-pack/upload"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <EnhancedSamplePackUploader 
            onSuccess={() => {
              navigate('/sample-pack-store');
            }}
          />
        </div>
      </main>
    </div>
  );
};

export default SamplePackUpload;