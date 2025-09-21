import { AdminVideoManager } from "@/components/AdminVideoManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminVideosPage = () => {
  useEffect(() => {
    setMeta(
      "Video Management — Pluggd Admin",
      "Manage video content, associate with artists, and feature videos.",
      "/admin/videos"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <AdminVideoManager />
        </div>
      </main>
    </div>
  );
};

export default AdminVideosPage;