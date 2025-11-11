import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useDomain } from "@/hooks/useDomain";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, Plug, User, Heart, FileText, Settings, LogOut, LayoutDashboard, Building } from "lucide-react";
import pluggdLogo from "@/assets/pluggdt.png";
import { NotificationBell } from "@/components/NotificationBell";
import { AdvancedSearch } from "@/components/AdvancedSearch";
import { MessagingCenter } from "@/components/MessagingCenter";
import { CartSidebar } from "@/components/CartSidebar";
import { HeaderWalletBalance } from "@/components/HeaderWalletBalance";
import { useStickyHeader } from "@/hooks/useScrollAnimation";
import { ThemeToggle } from "@/components/ThemeToggle";

const DomainAwareNavigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isLiveDomain, isHubDomain, isLocalhost, isLiveRoute } = useDomain();
  const navRef = useRef<HTMLElement>(null);

  // Use sticky header behavior
  useStickyHeader(navRef, 50);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const navEl = navRef.current;
    if (!navEl) {
      return;
    }

    const root = document.documentElement;

    const updateHeight = () => {
      const height = navEl.getBoundingClientRect().height;
      if (height > 0) {
        root.style.setProperty("--masthead-h", `${height}px`);
      }
    };

    updateHeight();

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => updateHeight())
      : null;

    resizeObserver?.observe(navEl);

    const handleResize = () => updateHeight();
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleResize);
      root.style.removeProperty("--masthead-h");
    };
  }, []);

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
        .select('user_type, is_creator, full_name, username, is_label')
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

  const getNavItems = () => {
    // Compute mode based on domain and route
    const mode = (isLiveDomain || isLiveRoute) ? 'live' : 'hub';
    
    if (mode === 'live') {
      // Live mode navigation - simplified
      return [
        { name: "Live Home", href: "/live" },
        { name: "Sessions", href: "/live/sessions" },
        { name: "Events", href: "/live/events" },
        { name: "Back to Hub", href: "/" },
      ];
    }

    // Hub mode navigation - context-aware based on authentication
    if (!user) {
      // Non-authenticated users see simplified navigation
      return [
        { name: "Home", href: "/" },
        { name: "Releases", href: "/releases" },
        { name: "Marketplace", href: "/marketplace" },
        { name: "Directory", href: "/directory" },
        { name: "Community", href: "/community" },
        { name: "Live", href: "/live" },
      ];
    }
    
    // Authenticated users see full navigation
    return [
      { name: "Home", href: "/" },
      { name: "Releases", href: "/releases" },
      { name: "Marketplace", href: "/marketplace" },
      { name: "Directory", href: "/directory" },
      { name: "Community", href: "/community" },
      { name: "Live", href: "/live" },
    ];
  };

  const getBrandingConfig = () => {
    if (isLiveDomain || (isLocalhost && isLiveRoute)) {
      return {
        logoText: "Pluggd Live",
        subtitle: "Real-time music collaboration",
        ctaText: "Join the Community",
        ctaHref: isLocalhost ? "/auth" : "https://pluggd.fm/auth",
        backToHub: isLocalhost ? "/" : "https://pluggd.fm/"
      };
    }
    
    return {
      logoText: "Pluggd Hub",
      subtitle: "Your music creation ecosystem",
      ctaText: "Start Creating",
      ctaHref: "/auth",
      backToHub: null
    };
  };

  const navItems = getNavItems();
  const branding = getBrandingConfig();

  // Check if we're on hero section (home page)
  const isHeroSection = location.pathname === '/' || location.pathname === '/live';
  
  return (
    <nav 
      ref={navRef}
      className={cn(
        "fixed top-0 w-full z-50 sticky-header transition-all duration-300 ease-out",
        isHeroSection 
          ? "bg-transparent border-transparent" 
          : "bg-background/95 backdrop-blur-lg border-b border-border"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={isLiveDomain ? "/live" : "/"} className="flex items-center gap-2 flex-shrink-0">
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
            <div className="flex items-center space-x-8">
              {navItems.map((item) => {
                const isActive = item.href.startsWith('/') ? location.pathname === item.href : false;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "text-muted-foreground hover:text-primary transition-smooth hover:scale-105 px-3 py-2 rounded-md hover-glow-primary",
                      isActive && "text-primary font-medium glow-subtle"
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Search and Auth */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Hub mode features */}
            {(isHubDomain || (!isLiveDomain && !isLiveRoute)) && (
              <>
                <AdvancedSearch />
                <CartSidebar />
              </>
            )}
            <ThemeToggle />
            {user ? (
              <>
                {/* Hub mode user features */}
                {(isHubDomain || (!isLiveDomain && !isLiveRoute)) && (
                  <>
                    <HeaderWalletBalance />
                    <MessagingCenter />
                    <NotificationBell />
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover-glow-accent"
                      aria-label="Open account menu"
                    >
                      <Avatar className="h-8 w-8 ring-2 ring-transparent hover:ring-primary/20 transition-all duration-300">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>
                          {user.email?.[0]?.toUpperCase() || <User className="h-4 w-4" />}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 bg-background border-border z-50">
                    {/* Header card */}
                    <div className="px-3 py-3 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url} />
                          <AvatarFallback>{user.email?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium truncate max-w-[140px]">{profile?.full_name || user.email}</div>
                            <span className="text-xs px-2 py-0.5 rounded-full border text-muted-foreground">
                              {isAdmin ? 'Admin' : (profile?.is_creator ? 'Creator' : 'Fan')}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">@{profile?.username || 'you'}</div>
                        </div>
                        <div className="ml-auto text-right">
                          <HeaderWalletBalance />
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Link to={`/u/${profile?.username || 'you'}`} className="text-xs underline text-muted-foreground">View Profile</Link>
                        {profile?.is_creator && (
                          <Link to={`/store`} className="text-xs underline text-muted-foreground text-right">View Storefront</Link>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="py-1">
                      <DropdownMenuItem asChild>
                        <Link to="/inbox" className="flex items-center justify-between">
                          <span>Messages / Inbox</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/orders" className="flex items-center justify-between">
                          <span>Orders & Purchases</span>
                        </Link>
                      </DropdownMenuItem>
                      {profile?.is_creator && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/payouts" className="flex items-center justify-between">
                            <span>Wallet & Payouts</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/notifications" className="flex items-center justify-between">
                          <span>Notifications</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/connections" className="flex items-center justify-between">
                          <span>Connections</span>
                        </Link>
                      </DropdownMenuItem>
                      {/* Label Studio entry if creator or label member */}
                      {(profile?.is_creator || profile?.is_label) && (
                        <DropdownMenuItem asChild>
                          <Link to="/studio/label" className="flex items-center justify-between">
                            <span className="flex items-center"><Building className="mr-2 h-4 w-4" /> Label Studio</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {/* Admin Labels link */}
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin/labels" className="flex items-center justify-between">
                            <span className="flex items-center"><Settings className="mr-2 h-4 w-4" /> Admin Labels</span>
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </div>

                    <DropdownMenuSeparator />
                    {/* Account */}
                    <div className="py-1">
                      <DropdownMenuItem asChild>
                        <Link to={profile?.is_creator ? "/studio" : "/dashboard"} className="flex items-center">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard/settings" className="flex items-center">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      {profile?.is_creator && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/creator/developer" className="flex items-center">
                            <FileText className="mr-2 h-4 w-4" />
                            Developer
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {!profile?.is_creator && (
                        <DropdownMenuItem
                          onClick={async () => {
                            try {
                              await supabase.from('profiles').update({ is_creator: true }).eq('id', user!.id);
                              navigate('/studio');
                            } catch {}
                          }}
                          className="flex items-center"
                        >
                          <User className="mr-2 h-4 w-4" />
                          Become a Creator
                        </DropdownMenuItem>
                      )}
                      {!profile?.is_label && (
                        <DropdownMenuItem asChild>
                          <Link to="/studio/label" className="flex items-center">
                            <Building className="mr-2 h-4 w-4" />
                            Add / Upgrade to Label
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard/admin" className="flex items-center">
                            <Settings className="mr-2 h-4 w-4" />
                            Admin Console
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/help" className="flex items-center">
                          <Heart className="mr-2 h-4 w-4" />
                          Help / Status
                        </Link>
                      </DropdownMenuItem>
                    </div>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="flex items-center text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="hero" className="btn-glow hover-glow-accent">Get Started</Button>
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
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-card rounded-lg mt-2 border border-border">
              {navItems.map((item) => {
                const isActive = item.href.startsWith('/') ? location.pathname === item.href : false;
                
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
                {(isLiveDomain || (isLocalhost && isLiveRoute)) && branding.backToHub && (
                  <>
                    {isLocalhost ? (
                      <Link to={branding.backToHub}>
                        <Button variant="ghost" className="w-full">
                          Back to Hub
                        </Button>
                      </Link>
                    ) : (
                      <a href={branding.backToHub}>
                        <Button variant="ghost" className="w-full">
                          Back to Hub
                        </Button>
                      </a>
                    )}
                  </>
                )}
                {isLocalhost ? (
                  <Link to={branding.ctaHref}>
                    <Button variant={(isLiveDomain || (isLocalhost && isLiveRoute)) ? "hero" : "secondary"} className="w-full">
                      {branding.ctaText}
                    </Button>
                  </Link>
                ) : (
                  <a href={branding.ctaHref}>
                    <Button variant={(isLiveDomain || (isLocalhost && isLiveRoute)) ? "hero" : "secondary"} className="w-full">
                      {branding.ctaText}
                    </Button>
                  </a>
                )}
                {user ? (
                  <>
                    {isHubDomain && (
                      <>
                        <Link to="/favorites">
                          <Button variant="ghost" className="w-full">
                            Favorites
                          </Button>
                        </Link>
                        <Link to="/dashboard">
                          <Button variant="ghost" className="w-full">
                            Dashboard
                          </Button>
                        </Link>
                        <Link to="/contracts">
                          <Button variant="ghost" className="w-full">
                            Contracts
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Link to="/admin">
                            <Button variant="outline" className="w-full">
                              Admin
                            </Button>
                          </Link>
                        )}
                        {!profile?.is_label && (
                          <Link to="/studio/label">
                            <Button variant="ghost" className="w-full">
                              Add / Upgrade to Label
                            </Button>
                          </Link>
                        )}
                        {(profile?.is_creator || profile?.is_label) && (
                          <Link to="/studio/label">
                            <Button variant="ghost" className="w-full">
                              Label Studio
                            </Button>
                          </Link>
                        )}
                        {isAdmin && (
                          <Link to="/admin/labels">
                            <Button variant="ghost" className="w-full">
                              Admin Labels
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                    <Button variant="ghost" className="w-full" onClick={signOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="hero" className="w-full">
                        Get Started
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

export default DomainAwareNavigation;
