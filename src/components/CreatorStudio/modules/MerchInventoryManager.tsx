import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Package, PackagePlus, PackageSearch, RefreshCw, Layers } from "lucide-react";

type OptionValue = {
  name: string;
  value: string;
};

interface MerchandiseProduct {
  id: string;
  title: string;
  image_url: string | null;
  sku: string | null;
  status: string;
  track_inventory: boolean | null;
  price: number;
  has_variants: boolean | null;
  stock_quantity: number | null;
}

interface MerchVariant {
  id: string;
  product_id: string;
  sku: string;
  option_values: OptionValue[];
  barcode: string | null;
  price_override_cents: number | null;
  inventory_quantity: number | null;
  low_stock_threshold: number | null;
  created_at: string;
  updated_at: string;
}

interface InventoryAdjustment {
  id: string;
  variant_id: string;
  quantity_delta: number;
  reason: string | null;
  reference: string | null;
  created_by: string | null;
  created_at: string;
}

type AdjustmentsByVariant = Record<string, InventoryAdjustment[]>;

type VariantFormMode = "create" | "edit";

interface VariantFormState {
  id?: string;
  sku: string;
  barcode: string;
  optionValues: OptionValue[];
  priceOverride: string;
  inventoryQuantity: string;
  lowStockThreshold: string;
}

interface AdjustmentFormState {
  variantId: string;
  quantityDelta: string;
  reason: string;
  reference: string;
}

const defaultVariantForm = (): VariantFormState => ({
  sku: "",
  barcode: "",
  optionValues: [],
  priceOverride: "",
  inventoryQuantity: "",
  lowStockThreshold: "",
});

export const MerchInventoryManager: React.FC = () => {
  const { toast } = useToast();

  const [loadingProducts, setLoadingProducts] = useState(true);
  const [products, setProducts] = useState<MerchandiseProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetailsLoading, setProductDetailsLoading] = useState(false);
  const [variants, setVariants] = useState<MerchVariant[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentsByVariant>({});

  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [variantFormMode, setVariantFormMode] = useState<VariantFormMode>("create");
  const [variantForm, setVariantForm] = useState<VariantFormState>(defaultVariantForm());

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState<AdjustmentFormState>({
    variantId: "",
    quantityDelta: "",
    reason: "",
    reference: "",
  });

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        products: MerchandiseProduct[];
      }>("creator-merch-variants", {
        body: { action: "list_products" },
      });

      if (error) throw error;
      setProducts(data?.products ?? []);
      if ((data?.products?.length ?? 0) > 0 && !selectedProductId) {
        setSelectedProductId(data?.products?.[0]?.id ?? null);
      }
    } catch (err) {
      console.error("Failed to load merchandise products", err);
      toast({
        title: "Unable to load merchandise",
        description: "Please try refreshing the page or contact support if the problem persists.",
        variant: "destructive",
      });
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadProductDetails = async (productId: string) => {
    setProductDetailsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        product: MerchandiseProduct | null;
        variants: MerchVariant[];
        adjustments: AdjustmentsByVariant;
      }>("creator-merch-variants", {
        body: { action: "get_product", productId },
      });

      if (error) throw error;
      setVariants(data?.variants ?? []);
      setAdjustments(data?.adjustments ?? {});
    } catch (err) {
      console.error("Failed to load product details", err);
      toast({
        title: "Unable to load variants",
        description: "Please retry in a moment.",
        variant: "destructive",
      });
    } finally {
      setProductDetailsLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      void loadProductDetails(selectedProductId);
    } else {
      setVariants([]);
      setAdjustments({});
    }
  }, [selectedProductId]);

  const openCreateVariant = () => {
    setVariantForm(defaultVariantForm());
    setVariantFormMode("create");
    setVariantDialogOpen(true);
  };

  const openEditVariant = (variant: MerchVariant) => {
    setVariantForm({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode ?? "",
      optionValues: variant.option_values ?? [],
      priceOverride: variant.price_override_cents != null
        ? (variant.price_override_cents / 100).toString()
        : "",
      inventoryQuantity: variant.inventory_quantity != null ? String(variant.inventory_quantity) : "",
      lowStockThreshold: variant.low_stock_threshold != null ? String(variant.low_stock_threshold) : "",
    });
    setVariantFormMode("edit");
    setVariantDialogOpen(true);
  };

  const handleVariantOptionChange = (index: number, field: keyof OptionValue, value: string) => {
    setVariantForm((prev) => {
      const next = [...prev.optionValues];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return { ...prev, optionValues: next };
    });
  };

  const addVariantOption = () => {
    setVariantForm((prev) => ({
      ...prev,
      optionValues: [...prev.optionValues, { name: "", value: "" }],
    }));
  };

  const removeVariantOption = (index: number) => {
    setVariantForm((prev) => ({
      ...prev,
      optionValues: prev.optionValues.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmitVariant = async () => {
    if (!selectedProductId) return;
    if (!variantForm.sku.trim()) {
      toast({
        title: "SKU is required",
        description: "Every variant needs a unique SKU to help you track stock accurately.",
        variant: "destructive",
      });
      return;
    }

    const optionValues = variantForm.optionValues.filter((entry) => entry.name || entry.value);
    const payload = {
      sku: variantForm.sku.trim(),
      barcode: variantForm.barcode.trim() || null,
      optionValues,
      priceOverride: variantForm.priceOverride ? Number(variantForm.priceOverride) : null,
      inventoryQuantity: variantForm.inventoryQuantity ? Number(variantForm.inventoryQuantity) : null,
      lowStockThreshold: variantForm.lowStockThreshold ? Number(variantForm.lowStockThreshold) : null,
    };

    try {
      if (variantFormMode === "create") {
        const { error } = await supabase.functions.invoke("creator-merch-variants", {
          body: {
            action: "create_variant",
            productId: selectedProductId,
            ...payload,
          },
        });
        if (error) throw error;
        toast({ title: "Variant created", description: "Inventory is ready to track." });
      } else if (variantForm.id) {
        const { error } = await supabase.functions.invoke("creator-merch-variants", {
          body: {
            action: "update_variant",
            variantId: variantForm.id,
            ...payload,
          },
        });
        if (error) throw error;
        toast({ title: "Variant updated" });
      }

      setVariantDialogOpen(false);
      setVariantForm(defaultVariantForm());
      if (selectedProductId) {
        void loadProductDetails(selectedProductId);
      }
    } catch (err) {
      console.error("Variant mutation failed", err);
      toast({
        title: "Unable to save variant",
        description: "Please double-check the details and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("Delete this variant? Inventory history will remain for audit purposes.")) {
      return;
    }
    try {
      const { error } = await supabase.functions.invoke("creator-merch-variants", {
        body: {
          action: "delete_variant",
          variantId,
        },
      });
      if (error) throw error;
      toast({ title: "Variant deleted" });
      if (selectedProductId) {
        void loadProductDetails(selectedProductId);
      }
    } catch (err) {
      console.error("Failed to delete variant", err);
      toast({
        title: "Unable to delete variant",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const openAdjustDialog = (variantId: string) => {
    setAdjustForm({
      variantId,
      quantityDelta: "",
      reason: "",
      reference: "",
    });
    setAdjustDialogOpen(true);
  };

  const handleAdjustInventory = async () => {
    if (!adjustForm.variantId || !adjustForm.quantityDelta) {
      toast({
        title: "Quantity change required",
        description: "Enter how many units were added or removed (use negative numbers to subtract).",
        variant: "destructive",
      });
      return;
    }
    try {
      const quantityDelta = Number(adjustForm.quantityDelta);
      if (!Number.isFinite(quantityDelta) || quantityDelta === 0) {
        throw new Error("Quantity delta must be a non-zero number.");
      }

      const { error } = await supabase.functions.invoke("creator-merch-variants", {
        body: {
          action: "adjust_inventory",
          variantId: adjustForm.variantId,
          quantityDelta,
          reason: adjustForm.reason || null,
          reference: adjustForm.reference || null,
        },
      });
      if (error) throw error;

      toast({ title: "Inventory updated" });
      setAdjustDialogOpen(false);
      if (selectedProductId) {
        void loadProductDetails(selectedProductId);
      }
    } catch (err) {
      console.error("Failed to adjust inventory", err);
      toast({
        title: "Unable to adjust inventory",
        description: err instanceof Error ? err.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const renderVariantOptions = (values: OptionValue[]) => {
    if (!values || values.length === 0) return "No options";
    return values
      .filter((item) => item?.name && item?.value)
      .map((item) => `${item.name}: ${item.value}`)
      .join(" • ");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Merch variants & inventory</CardTitle>
        <CardDescription>
          Track product variations like sizes and colours, manage SKUs, and keep stock levels accurate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loadingProducts ? (
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading your merchandise…
          </div>
        ) : products.length === 0 ? (
          <Alert>
            <AlertTitle>No merch yet</AlertTitle>
            <AlertDescription>
              Create a merch item first, then you can customise variants and track inventory here.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="merch-product-select">Select a product</Label>
                <Select
                  value={selectedProductId ?? ""}
                  onValueChange={(value) => setSelectedProductId(value)}
                >
                  <SelectTrigger id="merch-product-select">
                    <SelectValue placeholder="Choose a merch product" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => void loadProducts()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh list
                </Button>
              </div>
              {selectedProduct && (
                <div className="rounded-lg border border-dashed p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      <Package className="mr-1 h-3.5 w-3.5" />
                      {selectedProduct.status}
                    </Badge>
                    {selectedProduct.track_inventory && <Badge>Inventory tracked</Badge>}
                    {selectedProduct.has_variants ? (
                      <Badge variant="outline">Variants enabled</Badge>
                    ) : (
                      <Badge variant="outline">Single SKU</Badge>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{selectedProduct.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Base price: £{selectedProduct.price.toFixed(2)} · Stock:{" "}
                    {selectedProduct.stock_quantity != null ? selectedProduct.stock_quantity : "n/a"}
                  </p>
                </div>
              )}
            </div>

            {selectedProduct && (
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Variants</h3>
                    <p className="text-sm text-muted-foreground">
                      Manage SKUs, options, and stock levels for this merch product.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={openCreateVariant} size="sm">
                      <PackagePlus className="mr-2 h-4 w-4" />
                      Add variant
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void loadProductDetails(selectedProduct.id)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh variants
                    </Button>
                  </div>
                </div>

                {productDetailsLoading ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading variants…
                  </div>
                ) : variants.length === 0 ? (
                  <Alert>
                    <AlertTitle>No variants configured</AlertTitle>
                    <AlertDescription>
                      Add the sizes or options you sell so Pluggd can track stock and fulfil orders.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {variants.map((variant) => (
                      <Card key={variant.id} className="border border-muted">
                        <CardContent className="space-y-3 p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{variant.sku}</Badge>
                                {variant.inventory_quantity != null && (
                                  <Badge variant={variant.inventory_quantity <= (variant.low_stock_threshold ?? -1) ? "destructive" : "outline"}>
                                    Stock: {variant.inventory_quantity}
                                  </Badge>
                                )}
                                {variant.price_override_cents != null && (
                                  <Badge variant="outline">
                                    £{(variant.price_override_cents / 100).toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {renderVariantOptions(variant.option_values ?? [])}
                              </p>
                              {variant.barcode && (
                                <p className="text-xs text-muted-foreground">Barcode: {variant.barcode}</p>
                              )}
                              {variant.low_stock_threshold != null && (
                                <p className="text-xs text-muted-foreground">
                                  Low-stock alert at {variant.low_stock_threshold} units
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" onClick={() => openAdjustDialog(variant.id)}>
                                Adjust stock
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditVariant(variant)}>
                                Edit
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteVariant(variant.id)}>
                                Delete
                              </Button>
                            </div>
                          </div>
                          <Separator />
                          <div>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <Layers className="h-4 w-4 text-muted-foreground" />
                              Recent inventory adjustments
                            </div>
                            <div className="mt-2 space-y-2">
                              {(adjustments[variant.id] ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No adjustments logged yet.</p>
                              ) : (
                                (adjustments[variant.id] ?? []).map((adjustment) => (
                                  <div
                                    key={adjustment.id}
                                    className="flex flex-wrap items-center justify-between rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                                  >
                                    <div className="space-y-1">
                                      <p>
                                        <span className="font-semibold">
                                          {adjustment.quantity_delta > 0 ? "+" : ""}
                                          {adjustment.quantity_delta}
                                        </span>{" "}
                                        units {adjustment.quantity_delta > 0 ? "added" : "removed"}
                                      </p>
                                      {adjustment.reason && (
                                        <p className="text-xs text-muted-foreground">
                                          Reason: {adjustment.reason}
                                        </p>
                                      )}
                                      {adjustment.reference && (
                                        <p className="text-xs text-muted-foreground">
                                          Reference: {adjustment.reference}
                                        </p>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(adjustment.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{variantFormMode === "create" ? "Add a variant" : "Edit variant"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="variant-sku">SKU</Label>
              <Input
                id="variant-sku"
                placeholder="Unique identifier (e.g. TEE-BLK-L)"
                value={variantForm.sku}
                onChange={(event) => setVariantForm((prev) => ({ ...prev, sku: event.target.value }))}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="variant-barcode">Barcode (optional)</Label>
                <Input
                  id="variant-barcode"
                  placeholder="UPC / EAN / internal reference"
                  value={variantForm.barcode}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, barcode: event.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="variant-price-override">Price override (£)</Label>
                <Input
                  id="variant-price-override"
                  type="number"
                  step="0.01"
                  placeholder="Leave blank to use base price"
                  value={variantForm.priceOverride}
                  onChange={(event) => setVariantForm((prev) => ({ ...prev, priceOverride: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Options</Label>
                <Button variant="outline" size="sm" onClick={addVariantOption}>
                  Add option
                </Button>
              </div>
              {variantForm.optionValues.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Examples: Size / Large, Colour / Navy. This helps customers pick the right variant.
                </p>
              ) : (
                <div className="space-y-2">
                  {variantForm.optionValues.map((option, index) => (
                    <div key={index} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Input
                        placeholder="Option name (e.g. Size)"
                        value={option.name}
                        onChange={(event) => handleVariantOptionChange(index, "name", event.target.value)}
                      />
                      <Input
                        placeholder="Option value (e.g. Large)"
                        value={option.value}
                        onChange={(event) => handleVariantOptionChange(index, "value", event.target.value)}
                      />
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => removeVariantOption(index)}
                        className="justify-self-start"
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label htmlFor="variant-stock">Initial stock</Label>
                <Input
                  id="variant-stock"
                  type="number"
                  placeholder="0"
                  value={variantForm.inventoryQuantity}
                  onChange={(event) =>
                    setVariantForm((prev) => ({ ...prev, inventoryQuantity: event.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="variant-low-stock">Low-stock alert</Label>
                <Input
                  id="variant-low-stock"
                  type="number"
                  placeholder="Notify me at…"
                  value={variantForm.lowStockThreshold}
                  onChange={(event) =>
                    setVariantForm((prev) => ({ ...prev, lowStockThreshold: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVariantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitVariant}>
              {variantFormMode === "create" ? "Create variant" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust inventory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inventory-delta">Quantity change</Label>
              <Input
                id="inventory-delta"
                type="number"
                placeholder="e.g. 5 or -2"
                value={adjustForm.quantityDelta}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, quantityDelta: event.target.value }))}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Positive numbers add stock, negative numbers remove it.
              </p>
            </div>
            <div>
              <Label htmlFor="inventory-reason">Reason (optional)</Label>
              <Input
                id="inventory-reason"
                placeholder="Restock, damaged, sample order…"
                value={adjustForm.reason}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="inventory-reference">Reference (optional)</Label>
              <Textarea
                id="inventory-reference"
                placeholder="Purchase order number or internal note"
                value={adjustForm.reference}
                onChange={(event) => setAdjustForm((prev) => ({ ...prev, reference: event.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustInventory}>Apply adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardFooter className="flex flex-col items-start gap-2 border-t bg-muted/20 px-6 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <PackageSearch className="h-3.5 w-3.5" />
          All inventory events are logged to help you reconcile deliveries and refunds.
        </div>
        <p>
          Need physical fulfilment?{" "}
          <a className="underline" href="https://pluggd.fm/help" target="_blank" rel="noreferrer">
            Talk to our team
          </a>{" "}
          about connecting to your warehouse or on-demand production partner.
        </p>
      </CardFooter>
    </Card>
  );
};
