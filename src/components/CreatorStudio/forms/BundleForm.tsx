import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, ShoppingBag, Package, Music, Plus, X, Percent, DollarSign, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import '../modules/catalog-v2.css';

type BundleFormData = {
  title: string;
  description: string;
  bundle_type: string;
  bundle_price: number;
  min_items: number;
  max_items: number;
  allow_customization: boolean;
  is_limited_time: boolean;
  available_from?: Date;
  available_until?: Date;
  stock_quantity: number;
};

type CatalogItem = {
  id: string;
  title: string;
  type: string;
  price: number;
  image_url?: string;
};

const bundleTypes = [
  { value: 'fixed', label: 'Fixed Bundle', description: 'Pre-selected items that cannot be changed' },
  { value: 'dynamic', label: 'Dynamic Bundle', description: 'Customers can choose from available items' },
  { value: 'tiered', label: 'Tiered Bundle', description: 'Different pricing tiers based on quantity' },
];

export const BundleForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<CatalogItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<CatalogItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<BundleFormData>({
    defaultValues: {
      title: '',
      description: '',
      bundle_type: 'fixed',
      bundle_price: 0,
      min_items: 2,
      max_items: 10,
      allow_customization: false,
      is_limited_time: false,
      stock_quantity: 0,
    },
  });

  const watchBundleType = form.watch('bundle_type');
  const watchIsLimitedTime = form.watch('is_limited_time');
  const watchBundlePrice = form.watch('bundle_price');

  const individualTotal = selectedItems.reduce((sum, item) => sum + item.price, 0);
  const discountAmount = individualTotal - watchBundlePrice;
  const discountPercentage = individualTotal > 0 ? ((discountAmount / individualTotal) * 100).toFixed(1) : '0';

  useEffect(() => {
    fetchCatalogItems();
  }, [user]);

  const fetchCatalogItems = async () => {
    if (!user) return;

    try {
      const [releases, beats, packs, merch] = await Promise.all([
        supabase.from('releases').select('id, title, price').eq('user_id', user.id),
        supabase.from('beats').select('id, title, price').eq('user_id', user.id),
        supabase.from('sample_packs').select('id, title, price').eq('user_id', user.id),
        supabase.from('creator_merchandise').select('id, title, price, image_url').eq('user_id', user.id),
      ]);

      const allItems: CatalogItem[] = [
        ...(releases.data || []).map(item => ({ ...item, type: 'release', price: item.price || 0 })),
        ...(beats.data || []).map(item => ({ ...item, type: 'beat', price: item.price || 0 })),
        ...(packs.data || []).map(item => ({ ...item, type: 'pack', price: item.price || 0 })),
        ...(merch.data || []).map(item => ({ ...item, type: 'merch', price: item.price || 0 })),
      ];

      setAvailableItems(allItems);
    } catch (error) {
      console.error('Error fetching catalog items:', error);
    }
  };

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleGalleryImageUpload = (url: string) => {
    setGalleryImages([...galleryImages, url]);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  const addItemToBundle = (item: CatalogItem) => {
    if (!selectedItems.find(i => i.id === item.id)) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const removeItemFromBundle = (itemId: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  const filteredItems = availableItems.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedItems.find(selected => selected.id === item.id)
  );

  const onSubmit = async (data: BundleFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a bundle",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length < 2) {
      toast({
        title: "Error",
        description: "Please select at least 2 items for the bundle",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl) {
      toast({
        title: "Error",
        description: "Please upload a bundle image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const bundleData = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        bundle_type: data.bundle_type,
        bundle_items: selectedItems.map(item => ({
          id: item.id,
          type: item.type,
          title: item.title,
          price: item.price,
        })),
        individual_total: individualTotal,
        bundle_price: data.bundle_price,
        discount_percentage: parseFloat(discountPercentage),
        min_items: data.min_items,
        max_items: data.max_items,
        allow_customization: data.allow_customization,
        image_url: imageUrl,
        gallery_images: galleryImages.length > 0 ? galleryImages : null,
        is_limited_time: data.is_limited_time,
        available_from: data.is_limited_time && data.available_from ? data.available_from.toISOString() : null,
        available_until: data.is_limited_time && data.available_until ? data.available_until.toISOString() : null,
        stock_quantity: data.stock_quantity,
        status: 'draft',
        view_count: 0,
        sales_count: 0,
        revenue_total: 0,
      };

      const { error } = await supabase
        .from('creator_bundles')
        .insert([bundleData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bundle created successfully",
      });

      navigate('/studio/catalog');
    } catch (error) {
      console.error('Error creating bundle:', error);
      toast({
        title: "Error",
        description: "Failed to create bundle",
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
            <ShoppingBag className="w-5 h-5" />
            Create Bundle
          </CardTitle>
          <CardDescription>
            Create a product bundle with special pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="items">Bundle Items</TabsTrigger>
                  <TabsTrigger value="pricing">Pricing</TabsTrigger>
                  <TabsTrigger value="availability">Availability</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: "Title is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bundle Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter bundle title" {...field} />
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
                            placeholder="Describe your bundle..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bundle_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bundle Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bundle type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {bundleTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div>
                                  <div className="font-medium">{type.label}</div>
                                  <div className="text-xs text-muted-foreground">{type.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <FormLabel>Bundle Image</FormLabel>
                    <FileUpload
                      onUploadComplete={handleImageUpload}
                      acceptedFileTypes={['image/*']}
                      maxFileSize={5 * 1024 * 1024}
                      uploadType="image"
                    />
                    {imageUrl && (
                      <div className="mt-2">
                        <img
                          src={imageUrl}
                          alt="Bundle"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <FormLabel>Gallery Images</FormLabel>
                    <FileUpload
                      onUploadComplete={handleGalleryImageUpload}
                      acceptedFileTypes={['image/*']}
                      maxFileSize={5 * 1024 * 1024}
                      uploadType="image"
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

                <TabsContent value="items" className="space-y-4 mt-4">
                  <div>
                    <FormLabel>Search and Add Items</FormLabel>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Search for items to add..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>

                  {searchTerm && (
                    <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                      {filteredItems.length > 0 ? (
                        <div className="space-y-1">
                          {filteredItems.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                              onClick={() => addItemToBundle(item)}
                            >
                              <div className="flex items-center gap-2">
                                {item.type === 'release' && <Music className="w-4 h-4" />}
                                {item.type === 'beat' && <Music className="w-4 h-4" />}
                                {item.type === 'pack' && <Package className="w-4 h-4" />}
                                {item.type === 'merch' && <ShoppingBag className="w-4 h-4" />}
                                <span className="text-sm">{item.title}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.type}
                                </Badge>
                              </div>
                              <span className="text-sm font-medium">${item.price}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-2">No items found</p>
                      )}
                    </div>
                  )}

                  <div>
                    <FormLabel>Selected Items ({selectedItems.length})</FormLabel>
                    {selectedItems.length > 0 ? (
                      <div className="border rounded-lg p-2 mt-2 space-y-2">
                        {selectedItems.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <div className="flex items-center gap-2">
                              {item.type === 'release' && <Music className="w-4 h-4" />}
                              {item.type === 'beat' && <Music className="w-4 h-4" />}
                              {item.type === 'pack' && <Package className="w-4 h-4" />}
                              {item.type === 'merch' && <ShoppingBag className="w-4 h-4" />}
                              <span className="text-sm font-medium">{item.title}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">${item.price}</span>
                              <button
                                type="button"
                                onClick={() => removeItemFromBundle(item.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground mt-2">
                        Search and select items to add to the bundle
                      </div>
                    )}
                  </div>

                  {watchBundleType === 'dynamic' && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="min_items"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Items</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Minimum items customer must select</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_items"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Items</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="2"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormDescription>Maximum items customer can select</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="allow_customization"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Customization</FormLabel>
                          <FormDescription>
                            Let customers swap items in the bundle
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
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4 mt-4">
                  <div className="bg-muted rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Individual Total</span>
                      <span className="font-medium">${individualTotal.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Discount</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <Percent className="w-3 h-3 mr-1" />
                          {discountPercentage}%
                        </Badge>
                        <span className="font-medium text-destructive">-${discountAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="bundle_price"
                    rules={{ required: "Bundle price is required", min: 0 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bundle Price ($)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              className="pl-9"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Set a price lower than the individual total to create a discount
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="availability" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="is_limited_time"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Limited Time Offer</FormLabel>
                          <FormDescription>
                            Set a time period for this bundle availability
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

                  {watchIsLimitedTime && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="available_from"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available From</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="available_until"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Available Until</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0 for unlimited"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Leave as 0 for unlimited availability
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Bundle'}
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