import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

interface StoreProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  product_type: string;
  image_url?: string;
  download_url?: string;
  is_active: boolean;
  stock_quantity?: number;
  tags: string[];
  created_at: string;
  product_images?: ProductImage[];
  product_options?: ProductOption[];
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
}

interface ProductOption {
  id: string;
  product_id: string;
  option_type: string;
  option_value: string;
  price_modifier: number;
  stock_quantity?: number;
  created_at: string;
}

export const AdminProductManager = () => {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [newOption, setNewOption] = useState({ type: '', value: '', price_modifier: 0, stock: 0 });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: 0,
    product_type: "digital_download",
    image_url: "",
    download_url: "",
    is_active: true,
    stock_quantity: null as number | null,
    tags: ""
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async () => {
    try {
      const productData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        stock_quantity: formData.product_type === 'merchandise' ? formData.stock_quantity : null,
        image_url: uploadedImages[0] || formData.image_url
      };

      let result;
      let productId;
      
      if (selectedProduct) {
        result = await supabase
          .from('store_products')
          .update(productData)
          .eq('id', selectedProduct.id)
          .select();
        productId = selectedProduct.id;
      } else {
        result = await supabase
          .from('store_products')
          .insert([productData])
          .select();
        productId = result.data?.[0]?.id;
      }

      if (result.error) throw result.error;

      // Save product images if any
      if (uploadedImages.length > 0 && productId) {
        await Promise.all(uploadedImages.map(async (imageUrl, index) => {
          await supabase
            .from('product_images')
            .upsert({
              product_id: productId,
              image_url: imageUrl,
              display_order: index
            });
        }));
      }

      // Save product options if any (for merchandise)
      if (productOptions.length > 0 && productId) {
        await Promise.all(productOptions.map(async (option) => {
          await supabase
            .from('product_options')
            .upsert({
              product_id: productId,
              option_type: option.option_type,
              option_value: option.option_value,
              price_modifier: option.price_modifier,
              stock_quantity: option.stock_quantity
            });
        }));
      }

      toast({
        title: "Success",
        description: selectedProduct ? "Product updated successfully" : "Product created successfully",
      });

      fetchProducts();
      resetForm();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: "Error",
        description: "Failed to save product",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: StoreProduct) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title,
      description: product.description || "",
      price: product.price,
      product_type: product.product_type,
      image_url: product.image_url || "",
      download_url: product.download_url || "",
      is_active: product.is_active,
      stock_quantity: product.stock_quantity,
      tags: product.tags.join(', ')
    });
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const toggleActive = async (product: StoreProduct) => {
    try {
      const { error } = await supabase
        .from('store_products')
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product ${!product.is_active ? 'activated' : 'deactivated'} successfully`,
      });

      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setFormData({
      title: "",
      description: "",
      price: 0,
      product_type: "digital_download",
      image_url: "",
      download_url: "",
      is_active: true,
      stock_quantity: null,
      tags: ""
    });
    setUploadedImages([]);
    setProductOptions([]);
    setNewOption({ type: '', value: '', price_modifier: 0, stock: 0 });
  };

  // Add common sizes when merchandise is selected
  const addCommonSizes = () => {
    const commonSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const sizeOptions = commonSizes.map(size => ({
      id: `size-${size}-${Date.now()}`,
      product_id: selectedProduct?.id || '',
      option_type: 'size',
      option_value: size,
      price_modifier: 0,
      stock_quantity: 10,
      created_at: new Date().toISOString()
    }));
    setProductOptions(prev => [...prev, ...sizeOptions]);
  };

  if (loading) {
    return <div className="text-center py-8">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Store Products</h2>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedProduct ? 'Edit Product' : 'Create New Product'}
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="options">Options</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Product Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter product title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="price">Price (GBP)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Product description"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Product Type</Label>
                    <Select value={formData.product_type} onValueChange={(value) => setFormData({...formData, product_type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital_download">Digital Download</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="sample_pack">Sample Pack</SelectItem>
                        <SelectItem value="software">Software</SelectItem>
                        <SelectItem value="merchandise">Merchandise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {formData.product_type === 'merchandise' && (
                    <div>
                      <Label htmlFor="stock">Stock Quantity</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={formData.stock_quantity || ""}
                        onChange={(e) => setFormData({...formData, stock_quantity: parseInt(e.target.value) || null})}
                        placeholder="100"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="download">Download URL</Label>
                  <Input
                    id="download"
                    value={formData.download_url}
                    onChange={(e) => setFormData({...formData, download_url: e.target.value})}
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    placeholder="music, download, sample"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="images" className="space-y-4">
                <div>
                  <Label>Product Images (up to 5)</Label>
                  <p className="text-sm text-muted-foreground mb-4">Upload multiple images for your product. The first image will be the main image.</p>
                  
                  {uploadedImages.length < 5 && (
                    <FileUpload
                      accept="image/*"
                      bucketName="beat-artwork"
                      maxSizeMB={10}
                      onUpload={(url, fileName) => {
                        setUploadedImages(prev => [...prev, url]);
                        if (uploadedImages.length === 0) {
                          setFormData({...formData, image_url: url});
                        }
                      }}
                      className="mb-4"
                    />
                  )}
                  
                  {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uploadedImages.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={imageUrl} 
                            alt={`Product image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => {
                              setUploadedImages(prev => prev.filter((_, i) => i !== index));
                              if (index === 0 && uploadedImages.length > 1) {
                                setFormData({...formData, image_url: uploadedImages[1]});
                              } else if (uploadedImages.length === 1) {
                                setFormData({...formData, image_url: ""});
                              }
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          {index === 0 && (
                            <Badge className="absolute bottom-2 left-2">Main Image</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="options" className="space-y-4">
                {formData.product_type === 'merchandise' ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <Label>Product Options (Sizes, Colors, etc.)</Label>
                        <p className="text-sm text-muted-foreground">Add variations for your merchandise like sizes and colors.</p>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={addCommonSizes}
                        disabled={productOptions.some(opt => opt.option_type === 'size')}
                      >
                        Add Common Sizes
                      </Button>
                    </div>
                    
                    <div className="border rounded-lg p-4 space-y-4 mb-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="option_type">Option Type</Label>
                          <Select
                            value={newOption.type}
                            onValueChange={(value) => setNewOption({...newOption, type: value})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="size">Size</SelectItem>
                              <SelectItem value="color">Color</SelectItem>
                              <SelectItem value="material">Material</SelectItem>
                              <SelectItem value="style">Style</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="option_value">Value</Label>
                          <Input
                            id="option_value"
                            value={newOption.value}
                            onChange={(e) => setNewOption({...newOption, value: e.target.value})}
                            placeholder="e.g., Large, Red"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price_modifier">Price +/- (GBP)</Label>
                          <Input
                            id="price_modifier"
                            type="number"
                            step="0.01"
                            value={newOption.price_modifier}
                            onChange={(e) => setNewOption({...newOption, price_modifier: parseFloat(e.target.value) || 0})}
                          />
                        </div>
                        <div>
                          <Label htmlFor="option_stock">Stock</Label>
                          <Input
                            id="option_stock"
                            type="number"
                            value={newOption.stock}
                            onChange={(e) => setNewOption({...newOption, stock: parseInt(e.target.value) || 0})}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          if (newOption.type && newOption.value) {
                            setProductOptions(prev => [...prev, {
                              id: Date.now().toString(),
                              product_id: selectedProduct?.id || '',
                              option_type: newOption.type,
                              option_value: newOption.value,
                              price_modifier: newOption.price_modifier,
                              stock_quantity: newOption.stock,
                              created_at: new Date().toISOString()
                            }]);
                            setNewOption({ type: '', value: '', price_modifier: 0, stock: 0 });
                          }
                        }}
                        disabled={!newOption.type || !newOption.value}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Option
                      </Button>
                    </div>

                    {productOptions.length > 0 && (
                      <div className="space-y-2">
                        <Label>Current Options</Label>
                        {productOptions.map((option, index) => (
                          <div key={option.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Badge variant="outline">{option.option_type}</Badge>
                              <span>{option.option_value}</span>
                              {option.price_modifier !== 0 && (
                                <span className="text-sm text-muted-foreground">
                                  {option.price_modifier > 0 ? '+' : '-'}{formatCurrency(Math.abs(option.price_modifier))}
                                </span>
                              )}
                              <span className="text-sm text-muted-foreground">Stock: {option.stock_quantity}</span>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setProductOptions(prev => prev.filter((_, i) => i !== index))}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Product options are only available for merchandise items.</p>
                    <p>Change the product type to "Merchandise" to add options like sizes and colors.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
            
            {/* Submit Button */}
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveProduct}
                disabled={!formData.title || !formData.product_type}
              >
                {selectedProduct ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      <div className="grid gap-4">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {product.title}
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.description}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(product)}
                  >
                    {product.is_active ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  <span>{formatCurrency(product.price)}</span>
                  <span className="capitalize">{product.product_type.replace('_', ' ')}</span>
                  {product.stock_quantity !== null && (
                    <span>{product.stock_quantity} in stock</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products created yet.</p>
        </div>
      )}
    </div>
  );
};