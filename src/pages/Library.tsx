import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CreditBalance } from '@/components/checkout/CreditBalance';
import DomainAwareNavigation from '@/components/DomainAwareNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useGlobalPlayer } from '@/components/GlobalPlayer/GlobalPlayer';
import { creditSystem } from '@/services/credits/credit-system';
import { setMeta } from '@/lib/seo';
import {
  Music,
  Download,
  Play,
  Pause,
  Search,
  Filter,
  Folder,
  Heart,
  Share2,
  ExternalLink,
  Plus
} from 'lucide-react';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';

const Library = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { state, actions } = useGlobalPlayer();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMeta(
      "Your Library — Pluggd",
      "Access all your purchased beats, tracks, and exclusive content.",
      "/library"
    );
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto px-4 py-8 pt-24 max-w-4xl text-center">
          <Card>
            <CardContent className="py-12">
              <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-2xl font-semibold mb-2">Sign In Required</h2>
              <p className="text-muted-foreground mb-6">
                Please sign in to access your library
              </p>
              <Button asChild>
                <a href="/auth/login?redirect=/library">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      
      <div className="container mx-auto px-4 py-8 pt-24 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Library</h1>
            <p className="text-muted-foreground">
              Access all your purchased beats, tracks, and exclusive content
            </p>
          </div>
          
          <Button asChild>
            <a href="/marketplace">
              <Plus className="h-4 w-4 mr-2" />
              Browse More
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardContent className="text-center py-12">
                <Folder className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Your library is empty</h3>
                <p className="text-muted-foreground mb-4">
                  Start building your collection by purchasing beats and tracks
                </p>
                <Button asChild>
                  <a href="/marketplace">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Explore Marketplace
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <CreditBalance showTransactions={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Library;