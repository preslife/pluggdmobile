import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Upload, Package, DollarSign, Truck, Tag, Image, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import '../modules/catalog-v2.css';

type MerchandiseFormData = {
  title: string;
  description: string;
  category: string;
  product_type: string;
  price: number;
  cost_price: number;
  has_variants: boolean;
  sizes: string[];
  colors: string[];
  materials: string[];
  stock_quantity: number;
  track_inventory: boolean;
  weight_grams: number;
  dimensions: string;
  requires_shipping: boolean;
  shipping_class: string;
  tags: string;
  sku: string;
  barcode: string;
  brand: string;
};

const categories = ['Apparel', 'Accessories', 'Media', 'Other'];
const shippingClasses = ['Standard', 'Express', 'Economy', 'Premium'];
const commonSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
const commonColors = ['Black', 'White', 'Gray', 'Navy', 'Red', 'Blue', 'Green', 'Yellow', 'Pink', 'Purple'];

export const MerchandiseForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customMaterial, setCustomMaterial] = useState('');
  const [materials, setMaterials] = useState<string[]>([]);

  const form = useForm<MerchandiseFormData>({
    defaultValues: {
      title: '',
      description: '',
      category: 'Apparel',
      product_type: '',
      price: 0,
      cost_price: 0,
      has_variants: false,
      sizes: [],
      colors: [],
      materials: [],
      stock_quantity: 0,
      track_inventory: true,
      weight_grams: 0,
      dimensions: '',
      requires_shipping: true,
      shipping_class: 'Standard',
      tags: '',
      sku: '',
      barcode: '',
      brand: '',
    },
  });

  const watchHasVariants = form.watch('has_variants');
  const watchPrice = form.watch('price');
  const watchCostPrice = form.watch('cost_price');
  const profitMargin = watchPrice && watchCostPrice ? ((watchPrice - watchCostPrice) / watchPrice * 100).toFixed(2) : '0';

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleGalleryImageUpload = (url: string) => {
    setGalleryImages((prev) => [...prev, url]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const addMaterial = () => {
    if (customMaterial.trim()) {
      setMaterials([...materials, customMaterial.trim()]);
      setCustomMaterial('');
    }
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: MerchandiseFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create merchandise",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl) {
      toast({
        title: "Error",
        description: "Please upload a main product image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const merchandiseData = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        category: data.category,
        product_type: data.product_type,
        price: data.price,
        cost_price: data.cost_price,
        profit_margin: parseFloat(profitMargin),
        has_variants: data.has_variants,
        sizes: data.has_variants ? selectedSizes : null,
        colors: data.has_variants ? selectedColors : null,
        materials: materials.length > 0 ? materials : null,
        stock_quantity: data.stock_quantity,
        track_inventory: data.track_inventory,
        image_url: imageUrl,
        gallery_images: galleryImages.length > 0 ? galleryImages : null,
        weight_grams: data.weight_grams,
        dimensions: data.dimensions,
        requires_shipping: data.requires_shipping,
        shipping_class: data.shipping_class,
        tags: data.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        sku: data.sku,
        barcode: data.barcode,
        brand: data.brand,
        status: 'draft',
        view_count: 0,
        sales_count: 0,
        revenue_total: 0,
      };

      const { error } = await supabase
        .from('creator_merchandise')
        .insert([merchandiseData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Merchandise created successfully",
      });

      navigate('/studio/catalog');
    } catch (error) {
      console.error('Error creating merchandise:', error);
      toast({
        title: "Error",
        description: "Failed to create merchandise",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="catalog-scope container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create Merchandise
          </CardTitle>
          <CardDescription>
            Add a new merchandise item to your catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                  <TabsTrigger value="media">Media</TabsTrigger>
                  <TabsTrigger value="shipping">Shipping</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: "Title is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    rules={{ required: "Description is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe your product..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="product_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., T-Shirt, Hat, Poster" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="brand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand</FormLabel>
                          <FormControl>
                            <Input placeholder="Your brand name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags</FormLabel>
                          <FormControl>
                            <Input placeholder="tag1, tag2, tag3" {...field} />
                          </FormControl>
                          <FormDescription>Comma-separated tags</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      rules={{ required: "Price is required", min: 0 }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selling Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cost_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cost Price ($)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Profit Margin</FormLabel>
                      <div className="flex items-center gap-2 h-10 px-3 bg-muted rounded-md">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{profitMargin}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="sku"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SKU</FormLabel>
                          <FormControl>
                            <Input placeholder="Stock keeping unit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="barcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barcode</FormLabel>
                          <FormControl>
                            <Input placeholder="Product barcode" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="inventory" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="has_variants"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Product Variants</FormLabel>
                          <FormDescription>
                            Enable if this product has different sizes, colors, or materials
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchHasVariants && (
                    <div className="space-y-4">
                      <div>
                        <FormLabel>Sizes</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {commonSizes.map((size) => (
                            <Badge
                              key={size}
                              variant={selectedSizes.includes(size) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                if (selectedSizes.includes(size)) {
                                  setSelectedSizes(selectedSizes.filter(s => s !== size));
                                } else {
                                  setSelectedSizes([...selectedSizes, size]);
                                }
                              }}
                            >
                              {size}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <FormLabel>Colors</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {commonColors.map((color) => (
                            <Badge
                              key={color}
                              variant={selectedColors.includes(color) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                if (selectedColors.includes(color)) {
                                  setSelectedColors(selectedColors.filter(c => c !== color));
                                } else {
                                  setSelectedColors([...selectedColors, color]);
                                }
                              }}
                            >
                              {color}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <FormLabel>Materials</FormLabel>
                        <div className="flex gap-2 mt-2">
                          <Input
                            placeholder="Add material (e.g., Cotton, Polyester)"
                            value={customMaterial}
                            onChange={(e) => setCustomMaterial(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addMaterial();
                              }
                            }}
                          />
                          <Button type="button" onClick={addMaterial} size="sm">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {materials.map((material, index) => (
                            <Badge key={index} variant="secondary">
                              {material}
                              <button
                                type="button"
                                onClick={() => removeMaterial(index)}
                                className="ml-1"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="stock_quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stock Quantity</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="track_inventory"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 mt-8">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="mt-0">Track inventory</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="media" className="space-y-4 mt-4">
                  <div>
                    <FormLabel>Main Product Image</FormLabel>
                    <FileUpload
                      onUpload={(url) => handleImageUpload(url)}
                      accept="image/*"
                      bucketName="beat-artwork"
                      maxSizeMB={5}
                    />
                    {imageUrl && (
                      <div className="mt-2">
                        <img
                          src={imageUrl}
                          alt="Product"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <FormLabel>Gallery Images</FormLabel>
                    <FileUpload
                      onUpload={(url) => handleGalleryImageUpload(url)}
                      accept="image/*"
                      bucketName="beat-artwork"
                      maxSizeMB={5}
                    />
                    {galleryImages.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {galleryImages.map((img, index) => (
                          <div key={index} className="relative">
                            <img
                              src={img}
                              alt={`Gallery ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="shipping" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="requires_shipping"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Requires Shipping</FormLabel>
                          <FormDescription>
                            Does this product need to be shipped?
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('requires_shipping') && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="weight_grams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight (grams)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="shipping_class"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Shipping Class</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select shipping class" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {shippingClasses.map((cls) => (
                                    <SelectItem key={cls} value={cls}>
                                      {cls}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="dimensions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensions</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="L x W x H (e.g., 10 x 5 x 2 inches)"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Merchandise'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/studio/catalog')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
