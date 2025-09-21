import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Plus } from 'lucide-react';

interface StoreTabProps {
  profile: any;
  stats: any;
  visitorStatus: any;
  count?: number;
}

export const StoreTab = ({ visitorStatus }: StoreTabProps) => (
  <div className="text-center py-12">
    <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
    <h3 className="text-xl font-semibold mb-2">Store Coming Soon</h3>
    <p className="text-muted-foreground mb-4">
      {visitorStatus?.isOwner 
        ? "Set up your store to sell merchandise and sample packs"
        : "This creator's store is coming soon"
      }
    </p>
    {visitorStatus?.isOwner && (
      <Button>
        <Plus className="w-4 h-4 mr-2" />
        Set Up Store
      </Button>
    )}
  </div>
);

export default StoreTab;