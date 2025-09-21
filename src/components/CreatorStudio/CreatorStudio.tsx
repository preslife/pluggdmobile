import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CreatorStudioLayout } from "./CreatorStudioLayout";
import { CreatorStudioDashboard } from "./CreatorStudioDashboard";
import {
  CatalogModule,
  PluginsModule,
  LiveModule,
  AnalyticsModule,
  CoursesModule,
  MembershipsModule,
  CrowdfundingModule,
  CollaborationsModule,
  CRMModule,
  StorefrontModule,
  FinancialsModule,
  SettingsModule,
  PartnershipsModule,
} from "./modules";

export const CreatorStudio: React.FC = () => {
  return (
    <CreatorStudioLayout>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<CreatorStudioDashboard />} />
        
        {/* Catalog Routes */}
        <Route path="/catalog/*" element={<CatalogModule />} />
        
        {/* Plugins/Channels Routes */}
        <Route path="/plugins/*" element={<PluginsModule />} />
        
        {/* Live Routes */}
        <Route path="/live/*" element={<LiveModule />} />
        
        {/* Courses Routes */}
        <Route path="/courses/*" element={<CoursesModule />} />
        
        {/* Memberships Routes */}
        <Route path="/memberships/*" element={<MembershipsModule />} />
        
        {/* Crowdfunding Routes */}
        <Route path="/crowdfunding/*" element={<CrowdfundingModule />} />
        
        {/* Collaborations Routes */}
        <Route path="/collaborations/*" element={<CollaborationsModule />} />
        
        {/* Analytics Routes */}
        <Route path="/analytics/*" element={<AnalyticsModule />} />
        
        {/* CRM Routes */}
        <Route path="/crm/*" element={<CRMModule />} />
        
        {/* Storefront Routes */}
        <Route path="/storefront/*" element={<StorefrontModule />} />
        
        {/* Financials Routes */}
        <Route path="/financials/*" element={<FinancialsModule />} />
        
        {/* Settings Routes */}
        <Route path="/settings/*" element={<SettingsModule />} />
        
        {/* Partnerships Routes */}
        <Route path="/partnerships/*" element={<PartnershipsModule />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/studio" replace />} />
      </Routes>
    </CreatorStudioLayout>
  );
};