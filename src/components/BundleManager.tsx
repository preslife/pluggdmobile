import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, Plus, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Explicit type definitions to avoid TypeScript depth issues
interface BeatData {
  id: string;
  title: string;
  price: number;
}

interface ReleaseData {
  id: string;
  title: string;
  price: number;
}

interface BundleItem {
  id: string;
  type: 'beat' | 'release';
  title: string;
  price: number;
}

interface Bundle {
  id: string;
  title: string;
  description: string;
  price: number;
  discount_percentage: number;
  items: BundleItem[];
  created_at: string;
  bundle?: any;
}

export const BundleManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [availableItems, setAvailableItems] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    discount_percentage: 10,
    selectedItems: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadBundles();
      loadAvailableItems();
    }
  }, [user]);

  const loadBundles = async () => {
    try {
      const { data, error } = await supabase
        .from('store_products')
        .select(`
          *,
          store_product_items (
            item_id,
            item_type,
            qty
          )
        `)
        .eq('product_type', 'bundle')
        .eq('is_active', true);

      if (error) throw error;

      const bundlesWithItems = await Promise.all(
        (data || []).map(async (bundle) => {
          const items = await Promise.all(
            bundle.store_product_items.map(async (item: any) => {
              const supabaseAny: any = supabase;
              if (item.item_type === 'beat') {
                const response = await supabaseAny
                  .from('beats')
                  .select('id, title, price')
                  .eq('id', item.item_id)
                  .single();
                return response.data ? { ...response.data, type: 'beat' as const } : null;
              } else {
                const response = await supabaseAny
                  .from('releases')
                  .select('id, title, price')
                  .eq('id', item.item_id)
                  .single();
                return response.data ? { ...response.data, type: 'release' as const } : null;
              }
            })
          );

          return {
            ...bundle,
            discount_percentage: 10, // Default value
            items: items.filter(Boolean) as BundleItem[]
          };
        })
      );

      setBundles(bundlesWithItems);
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast({
        title: "Error",
        description: "Failed to load bundles",
        variant: "destructive"
      });
    }
  };

  const loadAvailableItems = async (): Promise<void> => {
    try {
      // Use explicit any to bypass complex type inference
      const supabaseAny: any = supabase;
      
      const beatsResponse = await supabaseAny
        .from('beats')
        .select('id, title, price')
        .eq('user_id', user!.id)
        .eq('is_public', true);
      
      const releasesResponse = await supabaseAny
        .from('releases')
        .select('id, title, price')
        .eq('user_id', user!.id);

      const beats: BeatData[] = beatsResponse.data || [];
      const releases: ReleaseData[] = releasesResponse.data || [];

      const allItems: BundleItem[] = [
        ...beats.map(beat => ({ ...beat, type: 'beat' as const })),
        ...releases.map(release => ({ ...release, type: 'release' as const }))
      ];

      setAvailableItems(allItems);
    } catch (error) {
      console.error('Error loading available items:', error);
    }
  };

  const calculateBundlePrice = () => {
    const selectedItemsData = availableItems.filter(item => 
      formData.selectedItems.includes(item.id)
    );
    const totalPrice = selectedItemsData.reduce((sum, item) => sum + (item.price || 0), 0);
    const discountAmount = totalPrice * (formData.discount_percentage / 100);
    return Math.max(0, totalPrice - discountAmount);
  };

  const handleSaveBundle = async () => {
    if (!user || formData.selectedItems.length === 0) return;

    setLoading(true);
    try {
      const bundlePrice = calculateBundlePrice();

      // Create or update bundle
      const bundleData = {
        title: formData.title,
        description: formData.description,
        price: bundlePrice,
        product_type: 'bundle',
        is_active: true,
        tags: ['bundle'],
        bundle: true
      };

      let bundleId: string;

      if (editingBundle) {
        const { error } = await supabase
          .from('store_products')
          .update(bundleData)
          .eq('id', editingBundle.id);

        if (error) throw error;
        bundleId = editingBundle.id;

        // Delete existing bundle items
        await supabase
          .from('store_product_items')
          .delete()
          .eq('bundle_product_id', bundleId);
      } else {
        const { data, error } = await supabase
          .from('store_products')
          .insert(bundleData)
          .select()
          .single();

        if (error) throw error;
        bundleId = data.id;
      }

      // Add bundle items
      const bundleItems = formData.selectedItems.map(itemId => {
        const item = availableItems.find(i => i.id === itemId);
        return {
          bundle_product_id: bundleId,
          item_id: itemId,
          item_type: item?.type || 'beat',
          qty: 1
        };
      });

      const { error: itemsError } = await supabase
        .from('store_product_items')
        .insert(bundleItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: editingBundle ? "Bundle updated successfully" : "Bundle created successfully"
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        discount_percentage: 10,
        selectedItems: []
      });
      setEditingBundle(null);
      loadBundles();
    } catch (error) {
      console.error('Error saving bundle:', error);
      toast({
        title: "Error",
        description: "Failed to save bundle",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBundle = async (bundleId: string) => {
    try {
      await supabase
        .from('store_product_items')
        .delete()
        .eq('bundle_product_id', bundleId);

      const { error } = await supabase
        .from('store_products')
        .delete()
        .eq('id', bundleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bundle deleted successfully"
      });

      loadBundles();
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast({
        title: "Error",
        description: "Failed to delete bundle",
        variant: "destructive"
      });
    }
  };

  const handleEditBundle = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setFormData({
      title: bundle.title,
      description: bundle.description,
      discount_percentage: bundle.discount_percentage,
      selectedItems: bundle.items.map(item => item.id)
    });
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bundle Manager</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Bundle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBundle ? "Edit Bundle" : "Create New Bundle"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Bundle title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Bundle description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Discount Percentage</label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Select Items</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 border rounded cursor-pointer ${
                        formData.selectedItems.includes(item.id)
                          ? "border-primary bg-primary/10"
                          : "border-border"
                      }`}
                      onClick={() => {
                        const isSelected = formData.selectedItems.includes(item.id);
                        setFormData({
                          ...formData,
                          selectedItems: isSelected
                            ? formData.selectedItems.filter(id => id !== item.id)
                            : [...formData.selectedItems, item.id]
                        });
                      }}
                    >
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.type} - £{item.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {formData.selectedItems.length > 0 && (
                <div className="p-3 bg-muted rounded">
                  <div className="text-sm font-medium">Bundle Price: £{calculateBundlePrice().toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formData.discount_percentage}% discount applied
                  </div>
                </div>
              )}
              <Button
                onClick={handleSaveBundle}
                disabled={loading || !formData.title || formData.selectedItems.length === 0}
                className="w-full"
              >
                {loading ? "Saving..." : editingBundle ? "Update Bundle" : "Create Bundle"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {bundles.map((bundle) => (
          <Card key={bundle.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {bundle.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditBundle(bundle)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteBundle(bundle.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{bundle.description}</p>
              <div className="flex items-center gap-4 mb-3">
                <Badge variant="secondary">£{bundle.price}</Badge>
                <Badge variant="outline">{bundle.discount_percentage}% off</Badge>
                <Badge variant="outline">{bundle.items.length} items</Badge>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-1">
                <div className="text-sm font-medium">Includes:</div>
                {bundle.items.map((item) => (
                  <div key={item.id} className="text-sm text-muted-foreground">
                    • {item.title} ({item.type}) - £{item.price}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};