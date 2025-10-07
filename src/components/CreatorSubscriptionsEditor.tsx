import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useMembershipTiers } from "@/hooks/useMembershipTiers";
import { formatCurrency } from "@/lib/utils";
import { Edit, Plus, Trash2 } from "lucide-react";

interface FormState {
  name: string;
  priceMonthly: string;
  description: string;
  features: string;
  active: boolean;
}

const defaultFormState: FormState = {
  name: "",
  priceMonthly: "4.99",
  description: "",
  features: "",
  active: true,
};

const centsFromFormValue = (value: string): number | null => {
  const numeric = Number.parseFloat(value);
  if (Number.isNaN(numeric) || numeric < 0) {
    return null;
  }
  return Math.round(numeric * 100);
};

const formatFeatures = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const CreatorSubscriptionsEditor = () => {
  const { toast } = useToast();
  const {
    tiers,
    loading,
    mutating,
    error,
    requiresLabelSelection,
    createTier,
    updateTier,
    deleteTier,
    refresh,
  } = useMembershipTiers();

  const [isCreating, setIsCreating] = useState(false);
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);

  const editingTier = useMemo(
    () => tiers.find((tier) => tier.id === editingTierId) ?? null,
    [tiers, editingTierId]
  );

  useEffect(() => {
    if (!editingTier) return;
    setFormState({
      name: editingTier.name,
      priceMonthly: editingTier.price_monthly
        ? (editingTier.price_monthly / 100).toFixed(2)
        : "0.00",
      description: editingTier.description ?? "",
      features: editingTier.features.join("\n"),
      active: editingTier.status === "active",
    });
  }, [editingTier]);

  const resetForm = () => {
    setFormState(defaultFormState);
    setEditingTierId(null);
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setEditingTierId(null);
    setFormState(defaultFormState);
    setIsCreating(true);
  };

  const handleEdit = (tierId: string) => {
    setEditingTierId(tierId);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formState.name.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a tier name before saving.",
        variant: "destructive",
      });
      return;
    }

    const priceCents = centsFromFormValue(formState.priceMonthly);
    if (priceCents === null) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid monthly price.",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      priceMonthly: priceCents / 100,
      status: formState.active ? "active" : "draft",
      features: formatFeatures(formState.features),
    } as const;

    try {
      if (editingTierId) {
        await updateTier(editingTierId, payload);
        toast({ title: "Tier updated", description: "Your membership tier has been saved." });
      } else {
        await createTier(payload);
        toast({ title: "Tier created", description: "Your membership tier is now available." });
      }
      resetForm();
      await refresh();
    } catch (err: any) {
      toast({
        title: "Unable to save tier",
        description: err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm("Are you sure you want to delete this membership tier?")) {
      return;
    }

    try {
      await deleteTier(tierId);
      toast({ title: "Tier deleted", description: "The membership tier was removed." });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Unable to delete tier",
        description: err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  const toggleTierStatus = async (tierId: string, active: boolean) => {
    try {
      await updateTier(tierId, { status: active ? "active" : "draft" });
      await refresh();
    } catch (err: any) {
      toast({
        title: "Unable to update tier",
        description: err?.message ?? "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  if (requiresLabelSelection) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Select a label in the studio sidebar to manage its membership tiers.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const activeTiers = tiers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Membership tiers</h2>
          <p className="text-muted-foreground">
            Configure the options your fans can subscribe to and keep pricing in sync with Stripe.
          </p>
        </div>
        {!isCreating && (
          <Button onClick={handleCreateClick} disabled={mutating}>
            <Plus className="mr-2 h-4 w-4" />
            Add tier
          </Button>
        )}
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTier ? "Edit membership tier" : "Create membership tier"}</CardTitle>
            <CardDescription>
              Define the pricing and benefits for this tier. Stripe products and prices are generated automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tier-name">Tier name*</Label>
                <Input
                  id="tier-name"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, name: event.target.value }))
                  }
                  placeholder="Superfan"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier-price">Monthly price (USD)*</Label>
                <Input
                  id="tier-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.priceMonthly}
                  onChange={(event) =>
                    setFormState((state) => ({ ...state, priceMonthly: event.target.value }))
                  }
                  placeholder="4.99"
                />
                <p className="text-xs text-muted-foreground">
                  Displayed to fans as {formatCurrency(Number.parseFloat(formState.priceMonthly) || 0)} per month.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier-description">Description</Label>
              <Textarea
                id="tier-description"
                rows={3}
                value={formState.description}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, description: event.target.value }))
                }
                placeholder="Tell fans what makes this tier special."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tier-features">Perks (one per line)</Label>
              <Textarea
                id="tier-features"
                rows={4}
                value={formState.features}
                onChange={(event) =>
                  setFormState((state) => ({ ...state, features: event.target.value }))
                }
                placeholder={"Early access to releases\nMonthly Q&A stream\nExclusive Discord role"}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="tier-active"
                checked={formState.active}
                onCheckedChange={(checked) =>
                  setFormState((state) => ({ ...state, active: checked }))
                }
              />
              <Label htmlFor="tier-active">Published (visible to fans)</Label>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={mutating}>
                {editingTier ? "Save changes" : "Create tier"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={mutating}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const price = tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime ?? 0;
          const cadence = tier.price_monthly
            ? "month"
            : tier.price_yearly
              ? "year"
              : tier.price_lifetime
                ? "lifetime"
                : null;

          return (
            <Card key={tier.id} className={tier.status !== "active" ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{tier.name}</CardTitle>
                    <CardDescription>
                      {price
                        ? `${formatCurrency(price / 100)}${cadence ? `/${cadence}` : ""}`
                        : "Free tier"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={tier.status === "active"}
                      onCheckedChange={(checked) => toggleTierStatus(tier.id, checked)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(tier.id)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(tier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Status: {tier.status}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {tier.description && <p>{tier.description}</p>}
                {tier.features.length > 0 ? (
                  <ul className="space-y-1 text-muted-foreground">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 text-primary">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No perks listed yet.</p>
                )}
                <div className="text-xs text-muted-foreground">
                  Stripe product: {tier.stripe_product_id ?? "pending"}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {activeTiers === 0 && !isCreating && (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="mb-2 text-lg font-medium">No membership tiers yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create a tier to start accepting fan subscriptions.
            </p>
            <Button onClick={handleCreateClick}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first tier
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
