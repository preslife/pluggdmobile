import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, ArrowLeft, Package, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { formatCurrency } from "@/lib/utils";

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
}

interface ProductImage {
  id: string;
  image_url: string;
  display_order: number;
}

interface ProductOption {
  id: string;
  option_type: string;
  option_value: string;
  price_modifier: number;
  stock_quantity: number;
}

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<{[key: string]: string}>({});
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      // Fetch product details
      const { data: productData, error: productError } = await supabase
        .from('store_products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch product images
      const { data: imagesData, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('display_order');

      if (imagesError) throw imagesError;
      setProductImages(imagesData || []);

      // Fetch product options
      const { data: optionsData, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', id)
        .order('option_type, option_value');

      if (optionsError) throw optionsError;
      setProductOptions(optionsData || []);

    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    
    let total = product.price;
    Object.values(selectedOptions).forEach(optionValue => {
      const option = productOptions.find(opt => opt.option_value === optionValue);
      if (option && option.price_modifier) {
        total += option.price_modifier;
      }
    });
    
    return total * quantity;
  };

  const getOptionsByType = (type: string) => {
    return productOptions.filter(opt => opt.option_type === type);
  };

  const getUniqueOptionTypes = () => {
    return [...new Set(productOptions.map(opt => opt.option_type))];
  };

  const handleAddToCart = () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    if (!product) return;

    // Check if all required options are selected
    const requiredTypes = getUniqueOptionTypes();
    const missingOptions = requiredTypes.filter(type => !selectedOptions[type]);
    
    if (missingOptions.length > 0) {
      toast({
        title: "Please select options",
        description: `Please select: ${missingOptions.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    addItem({
      productId: product.id,
      title: product.title,
      price: calculateTotalPrice() / quantity, // Price per item
      image_url: product.image_url,
      selectedOptions,
      quantity
    });

    toast({
      title: "Added to Cart",
      description: `${product.title} added to your cart`,
    });
  };

  const allImages = [
    ...(product?.image_url ? [{ id: 'main', image_url: product.image_url, display_order: -1 }] : []),
    ...productImages
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p>Loading product details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <DomainAwareNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Product not found</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/store')}
              className="mt-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Store
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DomainAwareNavigation />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/store')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Store
        </Button>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              {allImages.length > 0 ? (
                <img 
                  src={allImages[currentImage]?.image_url} 
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setCurrentImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      currentImage === index ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img 
                      src={image.image_url} 
                      alt={`${product.title} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {product.product_type.replace('_', ' ')}
                </Badge>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">(4.8)</span>
                </div>
              </div>
              <h1 className="text-3xl font-bold mb-4">{product.title}</h1>
              <p className="text-muted-foreground text-lg">{product.description}</p>
            </div>

            {product.tags && product.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Product Options */}
            {getUniqueOptionTypes().length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {getUniqueOptionTypes().map(optionType => (
                    <div key={optionType}>
                      <label className="text-sm font-medium capitalize mb-2 block">
                        {optionType}
                      </label>
                      <Select
                        value={selectedOptions[optionType] || ""}
                        onValueChange={(value) => setSelectedOptions(prev => ({
                          ...prev,
                          [optionType]: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${optionType}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {getOptionsByType(optionType).map(option => (
                            <SelectItem key={option.id} value={option.option_value}>
                              {option.option_value}
                              {option.price_modifier !== 0 && (
                                <span className="ml-2 text-sm text-muted-foreground">
                                  {option.price_modifier > 0 ? '+' : ''}{formatCurrency(option.price_modifier)}
                                </span>
                              )}
                              {option.stock_quantity !== null && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({option.stock_quantity} left)
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quantity and Price */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Quantity</label>
                <Select value={quantity.toString()} onValueChange={(value) => setQuantity(parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(10)].map((_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(calculateTotalPrice())}
                </div>

              {product.stock_quantity !== null && (
                <p className="text-sm text-muted-foreground">
                  {product.stock_quantity > 0 
                    ? `${product.stock_quantity} in stock` 
                    : 'Out of stock'
                  }
                </p>
              )}
            </div>

            {/* Add to Cart Button */}
            <Button 
              onClick={handleAddToCart}
              className="w-full h-12 text-lg"
              disabled={product.stock_quantity === 0}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Add to Cart - {formatCurrency(calculateTotalPrice())}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;