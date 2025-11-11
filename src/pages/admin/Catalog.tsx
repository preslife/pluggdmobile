import { AdminCatalogEnhanced } from "@/components/AdminCatalogEnhanced";
import SEOHelmet from "@/components/SEOHelmet";

export default function AdminCatalog() {
  return (
    <>
      <SEOHelmet
        config={{
          title: "Catalog Moderation | Pluggd Admin",
          description: "Audit releases, beats, and sample packs, approve updates, and ensure catalog quality across Pluggd.",
          canonical: "/admin/catalog",
        }}
      />
      <AdminCatalogEnhanced />
    </>
  );
}