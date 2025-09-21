import { AdminProductManager } from "@/components/AdminProductManager";
import { useEffect } from "react";
import { setMeta } from "@/lib/seo";

const AdminProductsPage = () => {
  useEffect(() => {
    setMeta(
      "Product Management — Pluggd Admin",
      "Manage store products, merchandise, pricing, and inventory.",
      "/admin/products"
    );
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          <AdminProductManager />
        </div>
      </main>
    </div>
  );
};

export default AdminProductsPage;