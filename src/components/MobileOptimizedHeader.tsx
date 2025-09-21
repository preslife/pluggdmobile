import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Link } from 'react-router-dom';

interface MobileOptimizedHeaderProps {
  title: string;
  actions?: React.ReactNode;
  showMenu?: boolean;
}

const MobileOptimizedHeader = ({ title, actions, showMenu = true }: MobileOptimizedHeaderProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: 'Studio', href: '/airtrax-studio' },
    { label: 'Store', href: '/store' },
    { label: 'Community', href: '/community' },
    { label: 'Live', href: '/live' },
    { label: 'Education', href: '/education' },
    { label: 'Tools', href: '/tools' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {showMenu && (
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-card">
                <div className="flex flex-col gap-4 mt-8">
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
          
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-lg hidden sm:inline">Pluggd</span>
          </Link>
        </div>

        <div className="flex-1 px-4 md:px-0">
          <h1 className="text-lg font-semibold truncate text-center md:text-left">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>
    </header>
  );
};

export default MobileOptimizedHeader;