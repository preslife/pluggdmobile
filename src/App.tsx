
import React, { lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Wallet from "./pages/Wallet";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { ComingSoon } from "@/components/ComingSoon";
import { OnboardingFlow, useOnboarding } from "@/components/OnboardingFlow";
import { MobileBottomTabBar } from "@/components/navigation/MobileBottomTabBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { DomainProvider, useDomain } from "@/hooks/useDomain";
import { AuthProvider } from "@/hooks/useAuth";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import Index from "./pages/Index";
import Collaborate from "./pages/Collaborate";
import Directory from "./pages/Directory";
import Community from "./pages/Community";
import Blog from "./pages/Blog";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Library from "./pages/Library";
import Charts from "./pages/Charts";
import Radio from "./pages/Radio";
import Tools from "./pages/Tools";
import Education from "./pages/Education";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Label from "./pages/Label";
import Artist from "./pages/Artist";
import Release from "./pages/Release";
import Releases from "./pages/Releases";
import ReleaseDetail from "./pages/ReleaseDetail";
import ReleaseBuilder from "./pages/ReleaseBuilder";
import PlaylistPage from "./pages/Playlist";
import Store from "./pages/Store";
import StoreSuccess from "./pages/StoreSuccess";
import GiftClaim from "./pages/GiftClaim";
import AccountOrders from "./pages/AccountOrders";
import Admin from "./pages/Admin";
import BetaProgram from "./pages/BetaProgram";
import Roadmap from "./pages/Roadmap";
import BeatDetail from "./pages/BeatDetail";
import ProductDetail from "./pages/ProductDetail";
import MyReleases from "./pages/MyReleases";
import ProductRedirect from "./components/ProductRedirect";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Subscription from "./pages/Subscription";
import Contracts from "./pages/Contracts";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refunds from "./pages/Refunds";
import TestPage from "./pages/TestPage";
import AdminPayoutsPage from "./pages/AdminPayouts";
import ReferralPage from "./pages/ReferralPage";
import Footer from "./components/Footer";
import Settings from "./pages/Settings";
import PluginsChannels from "./pages/PluginsChannels";
import CreditsPurchase from "./pages/CreditsPurchase";
import AdminAnalytics from "./pages/AdminAnalytics";
import { SettingsNotificationsPage } from "./pages/SettingsNotifications";
import CreatorAutomations from "./pages/CreatorAutomations";
import DashboardRouter from "./components/DashboardRouter";

// Lazy load additional pages
const Partners = lazy(() => import("./pages/Partners"));
const Docs = lazy(() => import("./pages/Docs"));
const DocsWebhooks = lazy(() => import("./pages/DocsWebhooks"));
const DocsIntegrations = lazy(() => import("./pages/DocsIntegrations"));
import LiveFooter from "./components/LiveFooter";

import Gamification from "./pages/Gamification";
import XBEATSTUDIO from "./pages/XBEATSTUDIO";
import AirTraxStudio from "./pages/AirTraxStudio";
import LiveIndex from "./pages/live/Index";
import LiveSessions from "./pages/live/Sessions";
import LiveBattles from "./pages/live/Battles";
import LiveEvent from "./pages/live/Event";
import SessionRoom from "./pages/live/SessionRoom";
import BrandConsistencyProvider from "./components/BrandConsistencyProvider";
import Challenges from "./pages/Challenges";
import ContestDetail from "./pages/ContestDetail";
import SamplePackUpload from "./pages/SamplePackUpload";
import SamplePackStorePage from "./pages/SamplePackStore";
import { EnhancedCreatorProfile } from "./components/EnhancedCreatorProfile";
import { FullBrandConsistency } from "./components/FullBrandConsistency";
import UserProfile from "./pages/UserProfile";
import CreatorSetup from "./pages/CreatorSetup";
import { UsernameBasedProfile } from "./components/UsernameBasedProfile";
import { CreatorRouteHandler } from "./components/CreatorRouteHandler";
import CreatorSubscriptions from "./pages/CreatorSubscriptions";
import FanHome from "./pages/FanHome";
import EmbedBeat from "./pages/EmbedBeat";
import EmbedRelease from "./pages/EmbedRelease";
import EmbedPreview from "./pages/EmbedPreview";
import CreatorSplitsPage from "./pages/CreatorSplits";
import CreatorEarningsPage from "./pages/CreatorEarnings";
import CreatorAnalyticsPage from "./pages/CreatorAnalytics";
import CreatorGrowthPage from "./pages/CreatorGrowth";
import SettingsConnectionsPage from "./pages/SettingsConnections";
import LabelInvite from "./pages/LabelInvite";
import SettingsFavNicknamesPage from "./pages/SettingsFavNicknames";
import SearchPage from "./pages/SearchPage";
import SmartLinkPage from "./pages/SmartLinkPage";
import CreatorImport from "./pages/CreatorImport";
import CreatorVerification from "./pages/CreatorVerification";
import CreatorDeveloper from "./pages/CreatorDeveloper";
import CreatorEmbeds from "./pages/CreatorEmbeds";
import Help from "./pages/Help";
import HelpContact from "./pages/HelpContact";
import InboxPage from "./pages/Inbox";
import { OnboardingChecklist } from "./components/OnboardingChecklist";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { GlobalPlayer } from "./components/GlobalPlayer/GlobalPlayer";
import { ScrollAnimationProvider } from "./components/ScrollAnimationProvider";
import { LocalizationProvider } from "./contexts/LocalizationContext";
import { WalletProvider } from "./hooks/useWallet";
import { SubscriptionProvider } from "./hooks/useSubscription";
import CreatorDashboardPage from "./pages/CreatorDashboard";
import { ThemeProvider } from "@/contexts/ThemeContext";
import CreatorStudioPage from "./pages/CreatorStudio";
import LabelStudioLayout from "./components/LabelStudio/LabelStudioLayout";
import LabelStudioRedirect from "./components/LabelStudio/LabelStudioRedirect";
import LabelRosterModule from "./components/LabelStudio/LabelRosterModule";
import LabelCatalogModule from "./components/LabelStudio/LabelCatalogModule";
import LabelStorefrontModule from "./components/LabelStudio/LabelStorefrontModule";
import LabelAnalyticsModule from "./components/LabelStudio/LabelAnalyticsModule";
import LabelFinancialsModule from "./components/LabelStudio/LabelFinancialsModule";
import LabelSettingsModule from "./components/LabelStudio/LabelSettingsModule";
import AdminCatalog from "./pages/admin/Catalog";
import AdminUsersPage from "./pages/admin/Users";
import AdminRolesPage from "./pages/admin/Roles";
import AdminCatalogModerationPage from "./pages/admin/CatalogModeration";
import AdminSecurity from "./pages/admin/Security";
import AdminCoursesPage from "./pages/admin/Courses";
import AdminArtistsPage from "./pages/admin/Artists";
import AdminBlogPage from "./pages/admin/Blog";
import AdminProductsPage from "./pages/admin/Products";
import AdminQuizzesPage from "./pages/admin/Quizzes";
import AdminVideosPage from "./pages/admin/Videos";
import AdminBundlesPage from "./pages/admin/Bundles";
import AdminDistributionPage from "./pages/admin/Distribution";
import AdminLabelsPage from "./pages/admin/Labels";
import { NotificationCenter } from "@/components/NotificationCenter";
import AdminLayout from "./components/admin/AdminLayout";

// Lazy load Events pages
const EventsPage = lazy(() => import("./pages/Events"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const AdminEventsPage = lazy(() => import("./pages/admin/Events"));

const queryClient = new QueryClient();

// Toggle this to control coming soon mode for pluggd.fm domain
const COMING_SOON_MODE = true;

const AppContent = () => {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLiveDomain, isHubDomain, isLocalhost, redirectToProperDomain } = useDomain();
  
  // Initialize referral tracking
  useReferralTracking();

  // Enhanced dual-domain routing - MUST call useEffect before any early returns
  useEffect(() => {
    const currentPath = location.pathname;
    const isLivePath = currentPath.startsWith("/live");
    
    // If on live domain but trying to access hub-only routes
    if (isLiveDomain && !isLivePath && currentPath !== "/auth") {
      redirectToProperDomain(currentPath);
      return;
    }
    
    // If on hub domain but trying to access live routes through direct navigation
    if (isHubDomain && isLivePath) {
      redirectToProperDomain(currentPath);
      return;
    }
    
    // Auto-redirect live domain to /live if on root
    if (isLiveDomain && currentPath === "/") {
      navigate("/live", { replace: true });
    }
  }, [location.pathname, navigate, isLiveDomain, isHubDomain, redirectToProperDomain]);

  // Show coming soon page only on exact production domain - AFTER all hooks are called
  if (COMING_SOON_MODE && window.location.host === 'pluggd.fm') {
    return <ComingSoon />;
  }
  
  return (
    <>
      <DomainAwareNavigation />
      <div className="pt-masthead md:pt-[calc(var(--masthead-h)+1rem)]">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/gamification" element={<ProtectedRoute><Gamification /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
        <Route path="/charts" element={<Charts />} />
        <Route path="/radio" element={<Radio />} />
        <Route path="/collaborate" element={<ProtectedRoute><Collaborate /></ProtectedRoute>} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/community" element={<Community />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/xbeatstudio" element={<XBEATSTUDIO />} />
        <Route path="/airtrax-studio" element={<ProtectedRoute><AirTraxStudio /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/contests/:id" element={<ContestDetail />} />
        <Route path="/sample-pack/upload" element={<ProtectedRoute><SamplePackUpload /></ProtectedRoute>} />
        <Route path="/sample-pack-store" element={<SamplePackStorePage />} />
        
        <Route path="/education" element={<Education />} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/label" element={<Label />} />
        <Route path="/label/:slug" element={<Label />} />
        <Route path="/labels/invite/:token" element={<LabelInvite />} />
        <Route path="/artist/:id" element={<Artist />} />
        
        {/* Fan and Embed Routes */}
        <Route path="/home" element={<FanHome />} />
        <Route path="/embed/beat/:id" element={<EmbedBeat />} />
        <Route path="/embed/release/:slug" element={<EmbedRelease />} />
        <Route path="/embed/:type/:id" element={<EmbedPreview />} />

        {/* Username-based profile routes */}
        <Route path="/u/:username" element={<UsernameBasedProfile />} />
        <Route path="/creator/:username" element={<CreatorRouteHandler />} />
        
        <Route path="/releases" element={<Releases />} />
<Route path="/release/new" element={<ProtectedRoute><ReleaseBuilder /></ProtectedRoute>} />
<Route path="/my-releases" element={<ProtectedRoute><MyReleases /></ProtectedRoute>} />
<Route path="/release/:id" element={<ReleaseDetail />} />
        <Route path="/playlist/:id" element={<PlaylistPage />} />
        <Route path="/store" element={<Store />} />
        <Route path="/store/success" element={<ProtectedRoute><StoreSuccess /></ProtectedRoute>} />
        <Route path="/gift/claim" element={<GiftClaim />} />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <AccountOrders />
            </ProtectedRoute>
          }
        />
        <Route path="/account/orders" element={<Navigate to="/orders" replace />} />
        <Route path="/product/:id" element={<ProductRedirect />} />
        <Route path="/store/product/:id" element={<ProductDetail />} />
        <Route path="/admin/*" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>} >
          <Route index element={<Admin />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="catalog" element={<AdminCatalog />} />
          <Route path="catalog/moderation" element={<AdminCatalogModerationPage />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="payouts" element={<AdminPayoutsPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="artists" element={<AdminArtistsPage />} />
          <Route path="blog" element={<AdminBlogPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="quizzes" element={<AdminQuizzesPage />} />
          <Route path="videos" element={<AdminVideosPage />} />
          <Route path="bundles" element={<AdminBundlesPage />} />
          <Route path="distribution" element={<AdminDistributionPage />} />
          <Route path="labels" element={<AdminLabelsPage />} />
          <Route path="events" element={<AdminEventsPage />} />
          <Route path="analytics" element={<AdminAnalytics />} />
        </Route>
        <Route path="/beta-program" element={<BetaProgram />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/beat/:id" element={<BeatDetail />} />
        <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
        <Route path="/referrals" element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
        <Route path="/dashboard/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/creator/setup" element={<ProtectedRoute><CreatorSetup /></ProtectedRoute>} />
        <Route path="/creator/subscriptions" element={<ProtectedRoute><CreatorSubscriptions /></ProtectedRoute>} />
        
        {/* Producer and Creator Dashboard Routes */}
        <Route path="/producer" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/creator/dashboard" element={<ProtectedRoute><CreatorDashboardPage /></ProtectedRoute>} />
        <Route path="/studio/*" element={<ProtectedRoute><CreatorStudioPage /></ProtectedRoute>} />
        <Route
          path="/studio/label"
          element={
            <ProtectedRoute>
              <LabelStudioRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/studio/label/:slug/*"
          element={
            <ProtectedRoute>
              <LabelStudioLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="roster" replace />} />
          <Route path="roster" element={<ProtectedRoute><LabelRosterModule /></ProtectedRoute>} />
          <Route path="catalog" element={<ProtectedRoute><LabelCatalogModule /></ProtectedRoute>} />
          <Route path="storefront" element={<ProtectedRoute><LabelStorefrontModule /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute><LabelAnalyticsModule /></ProtectedRoute>} />
          <Route path="financials" element={<ProtectedRoute><LabelFinancialsModule /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute><LabelSettingsModule /></ProtectedRoute>} />
        </Route>
        <Route path="/dashboard/creator/splits" element={<ProtectedRoute><CreatorSplitsPage /></ProtectedRoute>} />
        <Route path="/dashboard/creator/earnings" element={<ProtectedRoute><CreatorEarningsPage /></ProtectedRoute>} />
        <Route path="/dashboard/creator/analytics" element={<ProtectedRoute><CreatorAnalyticsPage /></ProtectedRoute>} />
        <Route path="/dashboard/creator/growth" element={<ProtectedRoute><CreatorGrowthPage /></ProtectedRoute>} />
        <Route path="/dashboard/creator/import" element={<ProtectedRoute><CreatorImport /></ProtectedRoute>} />
        <Route path="/dashboard/creator/verify" element={<ProtectedRoute><CreatorVerification /></ProtectedRoute>} />
        <Route path="/dashboard/creator/developer" element={<ProtectedRoute><CreatorDeveloper /></ProtectedRoute>} />
        <Route path="/dashboard/creator/embeds" element={<ProtectedRoute><CreatorEmbeds /></ProtectedRoute>} />
        
        {/* Credits & Payments */}
        <Route path="/credits/purchase" element={<ProtectedRoute><CreditsPurchase /></ProtectedRoute>} />
        
        <Route path="/help" element={<Help />} />
        <Route path="/help/contact" element={<HelpContact />} />
        {/* Dropdown-linked pages (lightweight placeholders if full pages not built yet) */}
        <Route path="/notifications" element={<ProtectedRoute><NotificationCenter /></ProtectedRoute>} />
        <Route path="/dashboard/orders" element={<ProtectedRoute><div className="min-h-screen pt-24 px-4"><h1 className="text-2xl font-bold">Orders & Purchases</h1><p className="text-muted-foreground">Coming soon</p></div></ProtectedRoute>} />
        <Route path="/dashboard/payouts" element={<ProtectedRoute><div className="min-h-screen pt-24 px-4"><h1 className="text-2xl font-bold">Wallet & Payouts</h1><p className="text-muted-foreground">Coming soon</p></div></ProtectedRoute>} />
        <Route path="/dashboard/connections" element={<ProtectedRoute><div className="min-h-screen pt-24 px-4"><h1 className="text-2xl font-bold">Connections</h1><p className="text-muted-foreground">Coming soon</p></div></ProtectedRoute>} />
        <Route path="/dashboard/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/dashboard/settings/developer" element={<ProtectedRoute><div className="min-h-screen pt-24 px-4"><h1 className="text-2xl font-bold">Developer Settings</h1><p className="text-muted-foreground">Moved here from menu</p></div></ProtectedRoute>} />
        <Route path="/settings/connections" element={<ProtectedRoute><SettingsConnectionsPage /></ProtectedRoute>} />
        <Route path="/settings/fav-nicknames" element={<ProtectedRoute><SettingsFavNicknamesPage /></ProtectedRoute>} />
        <Route path="/settings/notifications" element={<ProtectedRoute><SettingsNotificationsPage /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/r/:slug" element={<SmartLinkPage />} />
        <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/refunds" element={<Refunds />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/docs/webhooks" element={<DocsWebhooks />} />
        <Route path="/docs/integrations" element={<DocsIntegrations />} />

        {/* Live microsite routes */}
        <Route path="/live" element={<LiveIndex />} />
        <Route path="/live/sessions" element={<LiveSessions />} />
        <Route path="/live/battles" element={<LiveBattles />} />
        <Route path="/live/event/:id" element={<LiveEvent />} />
        <Route path="/live/sessions/:id" element={<SessionRoom />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {(isLiveDomain || location.pathname.startsWith('/live')) ? <LiveFooter /> : <Footer />}
      <MobileBottomTabBar />
      <OnboardingFlow isOpen={showOnboarding} onComplete={completeOnboarding} />
      </div>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrandConsistencyProvider>
        <FullBrandConsistency />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SubscriptionProvider>
              <LocalizationProvider>
                <WalletProvider>
                  <DomainProvider>
                    <ThemeProvider>
                      <ScrollAnimationProvider>
                        <GlobalPlayer>
                          <AppContent />
                          <PWAInstallPrompt />
                        </GlobalPlayer>
                      </ScrollAnimationProvider>
                    </ThemeProvider>
                  </DomainProvider>
                </WalletProvider>
              </LocalizationProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </BrandConsistencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
