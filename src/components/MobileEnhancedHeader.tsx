import { useState, useEffect } from "react";
import { Menu, Search, Bell, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { getAcademyBasePath } from '@/lib/academyRoutes';
import { FeatureFlag, isFeatureEnabled } from '@/config/featureFlags';

const MobileEnhancedHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationCount, setNotificationCount] = useState(3);
  const { user } = useAuth();

  useEffect(() => {
    // Close menu when window is resized to desktop size
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const academyHref = getAcademyBasePath();
  const academyLabel = isFeatureEnabled(FeatureFlag.LMS) ? "Learn" : "Education";

  const navigationItems = [
    { label: "Home", href: "/" },
    { label: "Releases", href: "/releases" },
    { label: "Community", href: "/community" },
    { label: "Tools", href: "/tools" },
    { label: "Store", href: "/store" },
    { label: academyLabel, href: academyHref },
  ];

  return (
    <header className="md:hidden bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/70 rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-lg">Pluggd</span>
        </Link>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Search Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications */}
          {user && (
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                >
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Badge>
              )}
            </Button>
          )}

          {/* Profile/Auth */}
          {user ? (
            <Button variant="ghost" size="sm" className="p-2">
              <User className="h-5 w-5" />
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="text-xs px-3">
                Sign In
              </Button>
            </Link>
          )}

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      {isSearchOpen && (
        <div className="px-4 pb-3 border-t">
          <Input
            placeholder="Search releases, artists, packs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            autoFocus
          />
        </div>
      )}

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg animate-fade-in">
          <nav className="py-4">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            
            {/* User Actions */}
            {user && (
              <>
                <div className="border-t my-2"></div>
                <Link
                  to="/dashboard"
                  className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="block px-4 py-3 text-sm hover:bg-muted transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default MobileEnhancedHeader;
