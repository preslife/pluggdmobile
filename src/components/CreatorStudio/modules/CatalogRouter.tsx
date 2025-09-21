import React from "react";
import { Routes, Route } from "react-router-dom";
import { CatalogModule } from "./CatalogModule";
import { MerchandiseForm } from "../forms/MerchandiseForm";
import { BundleForm } from "../forms/BundleForm";
import { CollectibleForm } from "../forms/CollectibleForm";

export const CatalogRouter: React.FC = () => {
  return (
    <Routes>
      {/* Main catalog view */}
      <Route path="/" element={<CatalogModule />} />

      {/* Form routes for creating new items */}
      <Route path="/merch/new" element={<MerchandiseForm />} />
      <Route path="/bundles/new" element={<BundleForm />} />
      <Route path="/collectibles/new" element={<CollectibleForm />} />

      {/* You can add edit routes later */}
      {/* <Route path="/merch/:id/edit" element={<MerchandiseForm />} /> */}
      {/* <Route path="/bundles/:id/edit" element={<BundleForm />} /> */}
      {/* <Route path="/collectibles/:id/edit" element={<CollectibleForm />} /> */}
    </Routes>
  );
};