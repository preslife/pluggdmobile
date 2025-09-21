import { AdminBlogManager } from "@/components/AdminBlogManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminBlogPage = () => {
  useEffect(() => {
    setMeta(
      "Blog Management — Pluggd Admin",
      "Create, edit, and manage blog posts with rich content and media.",
      "/admin/blog"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <AdminBlogManager />
        </div>
      </main>
    </div>
  );
};

export default AdminBlogPage;