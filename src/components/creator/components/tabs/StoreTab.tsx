import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingBag,
  ShoppingCart,
  Package,
  Layers,
  Sparkles,
  Plus,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface VisitorStatus {
  isOwner: boolean;
  isFollowing: boolean;
  isSubscribed: boolean;
}

interface StoreTabProps {
  profile: {
    user_id: string;
  };
  stats: any;
  visitorStatus: VisitorStatus | null;
  count?: number;
}

interface ProductRecord {
  id: string;
  creator_id: string;
  name: string;
  description?: string | null;
  product_type?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  image_url?: string | null;
  download_url?: string | null;
  inventory_count?: number | null;
  is_featured?: boolean | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
}

const productTableFallbacks = ['products', 'store_products'] as const;

const isMissingRelationError = (error: any, tableName: string) => {
  if (!error) return false;
  const normalizedTable = tableName.toLowerCase();
  const candidates = [
    (error.message || '').toString().toLowerCase(),
    (error.details || '').toString().toLowerCase(),
    (error.hint || '').toString().toLowerCase()
  ];

  return (
    error.code === '42P01' ||
    candidates.some((text) => text.includes('does not exist') && text.includes(normalizedTable))
  );
};

export const StoreTab = ({ profile, visitorStatus, count }: StoreTabProps) => {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const isOwner = Boolean(visitorStatus?.isOwner);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.user_id, isOwner]);

  const loadProducts = async () => {
    setLoading(true);
    let fetched: ProductRecord[] = [];

    for (const tableName of productTableFallbacks) {
      try {
        let query = supabase
          .from(tableName)
          .select('*')
          .eq('creator_id', profile.user_id)
          .order('created_at', { ascending: false });

        if (!isOwner) {
          query = query.eq('status', 'active');
        }

        const { data, error } = await query;

        if (error) {
          if (isMissingRelationError(error, tableName)) {
            continue;
          }
          throw error;
        }

        fetched = (data || []) as ProductRecord[];
        break;
      } catch (error: any) {
        if (isMissingRelationError(error, tableName)) {
          continue;
        }
        console.error('Error loading products:', error);
        break;
      }
    }

    setProducts(fetched);
    setLoading(false);
  };

  const productTypes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((product) => {
      if (product.product_type) {
        set.add(product.product_type);
      }
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (showFeaturedOnly && !product.is_featured) {
        return false;
      }

      if (filterType !== 'all') {
        const type = product.product_type || 'other';
        if (type !== filterType) {
          return false;
        }
      }

      return true;
    });
  }, [products, filterType, showFeaturedOnly]);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-dashed">
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading products…</span>
              </div>
              <div className="h-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="border rounded-lg bg-muted/30 p-8 text-center space-y-4">
        <ShoppingBag className="w-12 h-12 mx-auto text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">{isOwner ? 'Add products to your store' : 'Store coming soon'}</h3>
          <p className="text-sm text-muted-foreground">
            {isOwner
              ? 'Upload digital goods, merch, or services to start selling to your fans.'
              : 'This creator is curating their store. Check back soon for exclusive drops.'}
          </p>
        </div>
        {isOwner && (
          <Button asChild size="sm">
            <Link to="/store">
              <Plus className="w-4 h-4 mr-2" />
              Manage Store
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ShoppingBag className="h-4 w-4" />
            <span>
              {count ?? filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
            </span>
          </div>
          <h2 className="text-2xl font-bold">Creator Store</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="capitalize"
          >
            All
          </Button>
          {productTypes.map((type) => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(type)}
              className="capitalize"
            >
              <Layers className="w-4 h-4 mr-1" />
              {type.replace(/_/g, ' ')}
            </Button>
          ))}
          <Button
            variant={showFeaturedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFeaturedOnly((prev) => !prev)}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Featured
          </Button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => {
          const currency = (product.currency || 'USD').toUpperCase();
          const price = formatCurrency((product.price_cents || 0) / 100, currency, 'en-US');
          const productStatus = product.status || 'draft';
          const isActive = productStatus === 'active';
          const productTypeLabel = (product.product_type || 'other').replace(/_/g, ' ');

          return (
            <Card key={product.id} className="flex flex-col">
              <div className="relative h-44 bg-muted rounded-t-lg overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                    <Package className="h-10 w-10" />
                  </div>
                )}

                {product.is_featured && (
                  <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </Badge>
                )}

                {!isActive && isOwner && (
                  <Badge variant="secondary" className="absolute top-2 right-2 capitalize">
                    {productStatus}
                  </Badge>
                )}
              </div>

              <CardHeader className="space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-semibold line-clamp-2">
                    {product.name}
                  </CardTitle>
                  <Badge variant="outline" className="capitalize whitespace-nowrap">
                    {productTypeLabel}
                  </Badge>
                </div>
                <div className="text-sm font-medium">{price}</div>
              </CardHeader>

              <CardContent className="flex flex-col gap-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {product.description || 'Exclusive creator offering'}
                </p>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {typeof product.inventory_count === 'number' && (
                    <span>Inventory: {product.inventory_count}</span>
                  )}
                </div>

                <div className="mt-auto flex items-center justify-between gap-2">
                  <Button asChild size="sm" className="flex-1">
                    <Link to={`/store/product/${product.id}`}>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View details
                    </Link>
                  </Button>
                  {product.download_url && (
                    <Button asChild size="icon" variant="outline" className="shrink-0">
                      <a href={product.download_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StoreTab;
