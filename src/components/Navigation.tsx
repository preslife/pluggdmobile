import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Plug, Globe } from "lucide-react";
import pluggdLogo from "@/assets/pluggdt.png";
import { NotificationBell } from "@/components/NotificationBell";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { MessagingCenter } from "@/components/MessagingCenter";
import { CartSidebar } from "@/components/CartSidebar";
import { useLocalization, SUPPORTED_LOCALES } from "@/contexts/LocalizationContext";
import { useIntl } from "react-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { settings, updateSettings, getLocaleConfig } = useLocalization();
  const intl = useIntl();

  // Get user profile to determine permissions
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setIsAdmin(false);
      setProfile(null);
      setIsLoadingAdmin(false);
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) {
      setIsLoadingAdmin(false);
      return;
    }
    
    setIsLoadingAdmin(true);
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }
      
      setProfile(profileData);

      // Check if user is admin
      const { data: adminData, error: adminError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (adminError) {
        console.error('Error checking admin role:', adminError);
      }
      
      setIsAdmin(!!adminData);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      setIsAdmin(false);
      setProfile(null);
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  const baseItems = useMemo(() => [
    { name: intl.formatMessage({ id: "navigation.home", defaultMessage: "Home" }), href: "/" },
    { name: intl.formatMessage({ id: "navigation.live", defaultMessage: "Live" }), href: "/live" },
    {
      name: intl.formatMessage({ id: "navigation.store", defaultMessage: "Store" }),
      href: "/store",
      dropdown: [
        { name: intl.formatMessage({ id: "navigation.store.products", defaultMessage: "Products" }), href: "/store" },
        { name: intl.formatMessage({ id: "navigation.store.samplePacks", defaultMessage: "Sample Packs" }), href: "/sample-pack-store" },
      ]
    },
    { name: intl.formatMessage({ id: "navigation.releases", defaultMessage: "Releases" }), href: "/releases" },
    { name: intl.formatMessage({ id: "navigation.beats", defaultMessage: "Beats" }), href: "/marketplace" },
    { name: intl.formatMessage({ id: "navigation.academy", defaultMessage: "Academy" }), href: "/education" },
    {
      name: intl.formatMessage({ id: "navigation.community", defaultMessage: "Community" }),
      href: "/community",
      dropdown: [
        { name: intl.formatMessage({ id: "navigation.community.forum", defaultMessage: "Forum" }), href: "/community" },
        { name: intl.formatMessage({ id: "navigation.community.artists", defaultMessage: "Artists" }), href: "/community?tab=artists" },
        { name: intl.formatMessage({ id: "navigation.community.releases", defaultMessage: "Releases" }), href: "/community?tab=releases" },
        { name: intl.formatMessage({ id: "navigation.community.directory", defaultMessage: "Directory" }), href: "/directory" },
        { name: intl.formatMessage({ id: "navigation.community.blog", defaultMessage: "Blog" }), href: "/blog" },
        { name: intl.formatMessage({ id: "navigation.community.tools", defaultMessage: "Tools" }), href: "/tools" },
        { name: intl.formatMessage({ id: "navigation.community.collaborate", defaultMessage: "Collaborate" }), href: "/collaborate" },
        { name: intl.formatMessage({ id: "navigation.community.terms", defaultMessage: "Terms" }), href: "/terms" },
        { name: intl.formatMessage({ id: "navigation.community.privacy", defaultMessage: "Privacy" }), href: "/privacy" },
        { name: intl.formatMessage({ id: "navigation.community.refunds", defaultMessage: "Refunds" }), href: "/refunds" },
      ]
    },
  ], [intl]);

  const navItems = useMemo(() => {
    if (!user) {
      return baseItems.map((item) => {
        if (item.href === "/community" && item.dropdown) {
          const filteredDropdown = item.dropdown.filter((subItem) => !["/directory", "/collaborate"].includes(subItem.href));
          return { ...item, dropdown: filteredDropdown };
        }
        return item;
      });
    }

    return baseItems;
  }, [baseItems, user]);

  const localeOptions = useMemo(
    () => Object.entries(SUPPORTED_LOCALES).map(([code, config]) => ({ code, name: config.name, flag: config.flag })),
    []
  );

  const handleLocaleChange = (value: string) => {
    if (!Object.prototype.hasOwnProperty.call(SUPPORTED_LOCALES, value)) {
      return;
    }

    const config = getLocaleConfig(value as keyof typeof SUPPORTED_LOCALES);
    updateSettings({
      locale: value as keyof typeof SUPPORTED_LOCALES,
      currency: config.currency,
      timezone: config.timezone,
    });
  };

  return (
    <nav className="fixed top-0 w-full bg-background/95 backdrop-blur-lg border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <Plug className="w-5 h-5 text-primary" aria-hidden="true" />
            <img 
              src={pluggdLogo} 
              alt="Pluggd logo" 
              className="h-6 w-auto"
            />
            <span className="sr-only">Pluggd</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {navItems.map((item) => {
                const isActive = item.href.startsWith('/') ? location.pathname === item.href : false;
                const isExternal = item.href.startsWith('#');
                
                // Handle dropdown items
                if (item.dropdown) {
                  return (
                    <div key={item.name} className="relative group">
                      <button
                        className={cn(
                          "flex items-center gap-1 text-muted-foreground hover:text-primary transition-smooth hover:scale-105",
                          isActive && "text-primary font-medium"
                        )}
                      >
                        {item.name}
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                        <div className="py-1">
                          {item.dropdown.map((subItem) => (
                            <Link
                              key={subItem.name}
                              to={subItem.href}
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                if (isExternal) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "text-muted-foreground hover:text-primary transition-smooth hover:scale-105",
                        isActive && "text-primary font-medium"
                      )}
                    >
                      {item.name}
                    </a>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-primary transition-smooth hover:scale-105",
                      isActive && "text-primary font-medium"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
                <Globe className="h-4 w-4" aria-hidden="true" />
                <Select value={settings.locale} onValueChange={handleLocaleChange}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder={intl.formatMessage({ id: "navigation.locale.label", defaultMessage: "Language" })} />
                  </SelectTrigger>
                  <SelectContent>
                    {localeOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        <span className="mr-2" aria-hidden="true">{option.flag}</span>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Search and Auth */}
          <div className="hidden md:flex items-center space-x-1">
            <AdvancedSearch />
            <CartSidebar />
            <Link to="/live/sessions">
              <Button variant="secondary" size="sm">Join Session</Button>
            </Link>
            {user ? (
              <>
                  <MessagingCenter />
                  <NotificationBell />
                  
                  {/* User Menu Dropdown */}
                  <div className="relative group">
                    <Button variant="ghost" className="flex items-center gap-1">
                      Menu
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <div className="absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <div className="py-1">
                        <Link
                          to="/favorites"
                          className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                        >
                          Favorites
                         </Link>
                         <Link
                           to="/referrals"
                           className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                         >
                           Referrals
                         </Link>
                         <Link
                           to="/dashboard"
                           className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                         >
                           Dashboard
                         </Link>
                         <Link
                           to="/creator/subscriptions"
                           className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                         >
                           Monetization
                         </Link>
                         <Link
                           to="/contracts"
                           className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                         >
                           Contracts
                         </Link>
                        {isAdmin && (
                          <>
                            <hr className="my-1 border-border" />
                            <Link
                              to="/admin"
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                            >
                              Admin Dashboard
                            </Link>
                            <Link
                              to="/admin/payouts"
                              className="block px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                            >
                              Admin Payouts
                            </Link>
                          </>
                        )}
                        <hr className="my-1 border-border" />
                        <button
                          onClick={signOut}
                          className="block w-full text-left px-4 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted transition-smooth"
                        >
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </div>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero">Get Plugged In</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-expanded={isMenuOpen}
              aria-controls="primary-mobile-nav"
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden" id="primary-mobile-nav">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card rounded-lg mt-2 border border-border">
              {navItems.map((item) => {
                const isActive = item.href.startsWith('/') ? location.pathname === item.href : false;
                const isExternal = item.href.startsWith('#');
                
                // Handle dropdown items for mobile
                if (item.dropdown) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="px-3 py-2 text-base font-medium text-muted-foreground">
                        {item.name}
                      </div>
                      <div className="ml-4 space-y-1">
                        {item.dropdown.map((subItem) => (
                          <Link
                            key={subItem.name}
                            to={subItem.href}
                            className="block px-3 py-2 text-sm text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                if (isExternal) {
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth",
                        isActive && "text-primary bg-muted"
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </a>
                  );
                }
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "block px-3 py-2 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-md transition-smooth",
                      isActive && "text-primary bg-muted"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  <Select value={settings.locale} onValueChange={(value) => { handleLocaleChange(value); setIsMenuOpen(false); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={intl.formatMessage({ id: "navigation.locale.label", defaultMessage: "Language" })} />
                    </SelectTrigger>
                    <SelectContent>
                      {localeOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          <span className="mr-2" aria-hidden="true">{option.flag}</span>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Link to="/live/sessions">
                  <Button variant="secondary" className="w-full">Join the Session</Button>
                </Link>
                {user ? (
                  <>
                      <Link to="/favorites">
                        <Button variant="ghost" className="w-full">
                          Favorites
                        </Button>
                       </Link>
                       <Link to="/referrals">
                         <Button variant="ghost" className="w-full">
                           Referrals
                         </Button>
                       </Link>
                       <Link to="/dashboard">
                         <Button variant="ghost" className="w-full">
                           Dashboard
                         </Button>
                       </Link>
                       <Link to="/creator/subscriptions">
                         <Button variant="ghost" className="w-full">
                           Monetization
                         </Button>
                       </Link>
                       <Link to="/studio/plugins">
                         <Button variant="ghost" className="w-full">
                           Plug-ins & Channels
                         </Button>
                       </Link>
                       <Link to="/studio/automations">
                         <Button variant="ghost" className="w-full">
                           Automations
                         </Button>
                       </Link>
                       <Link to="/credits/purchase">
                         <Button variant="ghost" className="w-full">
                           Buy Credits
                         </Button>
                       </Link>
                       <Link to="/contracts">
                         <Button variant="ghost" className="w-full">
                           Contracts
                         </Button>
                       </Link>
                       <div className="border-t my-2" />
                       <Link to="/settings">
                         <Button variant="ghost" className="w-full">
                           Settings
                         </Button>
                       </Link>
                       <Link to="/settings/notifications">
                         <Button variant="ghost" className="w-full">
                           Notifications
                         </Button>
                       </Link>
                     {isAdmin && (
                       <div className="space-y-1">
                         <div className="px-3 py-2 text-base font-medium text-muted-foreground">
                           Admin
                         </div>
                         <div className="ml-4 space-y-1">
                           <Link to="/admin">
                             <Button variant="ghost" className="w-full justify-start">
                               Dashboard
                             </Button>
                           </Link>
                           <Link to="/admin/payouts">
                             <Button variant="ghost" className="w-full justify-start">
                               Payouts
                             </Button>
                           </Link>
                           <Link to="/admin/analytics">
                             <Button variant="ghost" className="w-full justify-start">
                               Analytics
                             </Button>
                           </Link>
                         </div>
                       </div>
                     )}
                    <Button variant="ghost" className="w-full" onClick={signOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button variant="hero" className="w-full">
                        Get Plugged In
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;