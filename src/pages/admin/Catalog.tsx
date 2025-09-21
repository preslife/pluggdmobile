import { AdminCatalogEnhanced } from "@/components/AdminCatalogEnhanced";
import SEOHelmet from "@/components/SEOHelmet";

export default function AdminCatalog() {
  return (
    <>
      <SEOHelmet 
        config={{
          title: "Admin Catalog - Pluggd",
          description: "Manage all catalog content including beats, releases, and sample packs.",
          canonical: "/admin/catalog"
        }}
      />
      <AdminCatalogEnhanced />
    </>
  );
}