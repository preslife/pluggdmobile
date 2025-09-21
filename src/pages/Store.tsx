import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Download, Package, Music, Book, Album, Filter, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { PaymentButton } from "@/components/PaymentButton";
import { StoreFilters } from "@/components/StoreFilters";
import { SimpleWishlistButton } from "@/components/SimpleWishlistButton";
import { CartSidebar } from "@/components/CartSidebar";
import { useCart } from "@/hooks/useCart";
import storeHeroBg from "@/assets/store-hero-new.jpg";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";
import { setMeta } from "@/lib/seo";
import { SamplePackPreview } from "@/components/SamplePackPreview";
import { UnifiedCatalog } from "@/components/UnifiedCatalog";

interface StoreProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  product_type: string;
  image_url: string;
  download_url: string;
  is_active: boolean;
  stock_quantity: number;
  tags: string[];
  metadata?: {
    samples?: any[];
    genre?: string;
    bpm?: string;
  };
}

const Store = () => {
  const { user } = useAuth();
  const { subscription, usage, getTierLimits } = useSubscription();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<StoreProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    priceRange: [0, 500] as [number, number],
    genres: [] as string[],
    inStock: false
  });
  const { toast } = useToast();

  useEffect(() => {
    setMeta(
      "Pluggd Store — Sample Packs, Merch, Courses",
      "Shop sample packs, courses, and merch built for creators.",
      "/store"
    );
  }, []);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [products, filters, selectedCategory]);

  const applyFilters = () => {
    let filtered = [...products];

    // Category filter
    if (selectedCategory !== 'all') {
      if (selectedCategory === 'digital_download') {
        filtered = filtered.filter(product => 
          product.product_type === 'digital_download' || product.product_type === 'software'
        );
      } else {
        filtered = filtered.filter(product => product.product_type === selectedCategory);
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchLower) ||
        product.description.toLowerCase().includes(searchLower) ||
        product.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    // Price range filter
    filtered = filtered.filter(product =>
      product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]
    );

    // Genre filter
    if (filters.genres.length > 0) {
      filtered = filtered.filter(product =>
        product.tags?.some(tag => filters.genres.includes(tag))
      );
    }

    // Stock filter
    if (filters.inStock) {
      filtered = filtered.filter(product =>
        product.product_type !== 'merchandise' || 
        (product.stock_quantity !== null && product.stock_quantity > 0)
      );
    }

    setFilteredProducts(filtered);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'digital_download': return <Download className="w-4 h-4" />;
      case 'course': return <Book className="w-4 h-4" />;
      case 'merchandise': return <Package className="w-4 h-4" />;
      case 'sample_pack': return <Music className="w-4 h-4" />;
      case 'software': return <Album className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getProductTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleAddToCart = (product: StoreProduct) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }
    
    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      image_url: product.image_url
    });
    
    toast({
      title: "Added to Cart",
      description: "Product added to your cart",
    });
  };

  const categories = [
    { id: 'all', label: 'All Products', icon: <Package className="w-4 h-4" /> },
    { id: 'merchandise', label: 'Merchandise', icon: <Package className="w-4 h-4" /> },
    { id: 'software', label: 'Music', icon: <Album className="w-4 h-4" /> },
    { id: 'course', label: 'Courses', icon: <Book className="w-4 h-4" /> },
    { id: 'sample_pack', label: 'Sample Packs', icon: <Music className="w-4 h-4" /> },
    { id: 'digital_download', label: 'Downloads', icon: <Download className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      
      {/* Hero Section - Inspired by modern e-commerce */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img 
            src={storeHeroBg}
            alt="Music Studio Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/60"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/lovable-uploads/0bd18373-2a96-4dcd-8b49-4f9f1b477acf.png" 
              alt="Pluggd Logo" 
              className="h-16 md:h-20 w-auto mr-4"
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
            FUEL YOUR SOUND.
            <span className="block text-primary mt-2">DEFINE YOUR STYLE.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed">
            Browse chart-ready beats, rare sample packs, and creator-made gear — all handpicked to power your next drop.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8 py-3 text-lg font-medium">
              BROWSE PRODUCTS
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-black px-8 py-3 text-lg font-medium"
              onClick={() => navigate('/marketplace')}
            >
              <Music className="w-5 h-5 mr-2" />
              BEAT STORE
            </Button>
            <CartSidebar />
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-muted/50 py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">50+</div>
              <div className="text-sm text-muted-foreground">Premium Beats</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">25+</div>
              <div className="text-sm text-muted-foreground">Sample Packs</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">10+</div>
              <div className="text-sm text-muted-foreground">Courses</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-2xl font-bold text-primary mb-1">24/7</div>
              <div className="text-sm text-muted-foreground">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex gap-6">
            {/* Filters Sidebar */}
            <div className="w-80 flex-shrink-0">
              <StoreFilters
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={() => setFilters({
                  search: '',
                  category: 'all',
                  priceRange: [0, 500],
                  genres: [],
                  inStock: false
                })}
                isOpen={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
              />
            </div>

            {/* Unified Catalog */}
            <div className="flex-1">
              <UnifiedCatalog 
                showFeaturedOnly={false}
                className="min-h-[600px]"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Store;