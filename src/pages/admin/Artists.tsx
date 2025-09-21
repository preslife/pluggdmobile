import { AdminArtistManager } from "@/components/AdminArtistManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminArtistsPage = () => {
  useEffect(() => {
    setMeta(
      "Artist Management — Pluggd Admin",
      "Manage artist profiles, bios, images, and featured artists.",
      "/admin/artists"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <AdminArtistManager />
        </div>
      </main>
    </div>
  );
};

export default AdminArtistsPage;