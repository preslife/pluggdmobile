import React, { useMemo, useState } from "react";
import { Plus, Edit, Trash2, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMembershipTiers, MembershipTier, UpsertMembershipTierInput } from "@/hooks/useMembershipTiers";
import { formatCurrency } from "@/lib/utils";

const emptyForm = {
  name: "",
  description: "",
  priceMonthly: "",
  priceYearly: "",
  priceLifetime: "",
  currency: "USD",
  status: "active",
  features: "",
  color: "",
  emoji: "",
};

type TierFormState = typeof emptyForm;

const parseAmount = (value: string) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const prepareTierInput = (form: TierFormState): UpsertMembershipTierInput => ({
  name: form.name,
  description: form.description,
  priceMonthly: parseAmount(form.priceMonthly),
  priceYearly: parseAmount(form.priceYearly),
  priceLifetime: parseAmount(form.priceLifetime),
  currency: form.currency || "USD",
  status: form.status,
  features: form.features
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0),
  color: form.color || null,
  emoji: form.emoji || null,
});

const centsToCurrency = (value: number | null | undefined, currency = "USD") => {
  if (!value) return formatCurrency(0, currency);
  return formatCurrency(value / 100, currency);
};

export const EnhancedMembershipsModule: React.FC = () => {
  const { toast } = useToast();
  const {
    tiers,
    loading,
    mutating,
    error,
    ownerType,
    ownerId,
    requiresLabelSelection,
    createTier,
    updateTier,
    deleteTier,
  } = useMembershipTiers();

  const [formState, setFormState] = useState<TierFormState>(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [editingTier, setEditingTier] = useState<MembershipTier | null>(null);

  const resetForm = () => {
    setFormState(emptyForm);
    setEditingTier(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (tier: MembershipTier) => {
    setEditingTier(tier);
    setFormState({
      name: tier.name,
      description: tier.description ?? "",
      priceMonthly: tier.price_monthly ? (tier.price_monthly / 100).toString() : "",
      priceYearly: tier.price_yearly ? (tier.price_yearly / 100).toString() : "",
      priceLifetime: tier.price_lifetime ? (tier.price_lifetime / 100).toString() : "",
      currency: tier.currency || "USD",
      status: tier.status || "active",
      features: (tier.features || []).join("\n"),
      color: tier.color ?? "",
      emoji: tier.emoji ?? "",
    });
    setShowModal(true);
  };

  const handleSubmitTier = async () => {
    if (!formState.name.trim()) {
      toast({ title: "Tier name required", variant: "destructive" });
      return;
    }

    const payload = prepareTierInput(formState);

    try {
      if (editingTier) {
        await updateTier(editingTier.id, payload);
        toast({ title: "Tier updated" });
      } else {
        await createTier(payload);
        toast({ title: "Tier created" });
      }
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "Membership tier error",
        description: err?.message ?? "Unable to save tier",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTier = async (tier: MembershipTier) => {
    if (!window.confirm(`Delete tier “${tier.name}”? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTier(tier.id);
      toast({ title: "Tier deleted" });
    } catch (err: any) {
      toast({
        title: "Unable to delete tier",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      });
    }
  };

  const totalSubscribers = useMemo(
    () => tiers.reduce((acc, tier) => acc + (tier.current_members ?? 0), 0),
    [tiers]
  );

  const monthlyRevenue = useMemo(
    () =>
      tiers.reduce((acc, tier) => {
        const price = tier.price_monthly ?? 0;
        return acc + price * (tier.current_members ?? 0);
      }, 0),
    [tiers]
  );

  const activeTierCount = useMemo(() => tiers.filter((tier) => tier.status === "active").length, [tiers]);
  const draftTierCount = useMemo(() => tiers.filter((tier) => tier.status === "draft").length, [tiers]);

  if (requiresLabelSelection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select a Label</CardTitle>
          <CardDescription>
            Choose a label in the Studio header to manage its membership tiers.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!ownerType || !ownerId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Memberships unavailable</CardTitle>
          <CardDescription>
            Sign in to manage memberships or switch to the correct workspace.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Memberships &amp; Subscriptions</h1>
          <p className="text-muted-foreground">
            Create tiers, manage supporters, and track recurring revenue.
          </p>
        </div>
        <Button onClick={handleOpenCreate} disabled={mutating}>
          <Plus className="h-4 w-4 mr-2" />
          New tier
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load tiers</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total subscribers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscribers}</div>
            <p className="text-xs text-muted-foreground">Across all active tiers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {centsToCurrency(monthlyRevenue, tiers[0]?.currency ?? "USD")}
            </div>
            <p className="text-xs text-muted-foreground">Estimated recurring income</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active tiers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTierCount}</div>
            <p className="text-xs text-muted-foreground">Currently available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftTierCount}</div>
            <p className="text-xs text-muted-foreground">Prepare tiers before launching</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tiers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tiers">Membership tiers</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
        </TabsList>

        <TabsContent value="tiers" className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[...Array(3).keys()].map((key) => (
                <Card key={key} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 w-1/2 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tiers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-2">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No membership tiers yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first tier to start offering exclusive access to supporters.
                </p>
                <Button onClick={handleOpenCreate} className="mt-3" disabled={mutating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create tier
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {tiers.map((tier) => (
                <Card key={tier.id} className="flex h-full flex-col justify-between">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {tier.emoji && <span className="text-xl">{tier.emoji}</span>}
                          {tier.name}
                        </CardTitle>
                        <CardDescription>{tier.description || "No description provided."}</CardDescription>
                      </div>
                      <Badge variant={tier.status === "active" ? "default" : tier.status === "draft" ? "secondary" : "outline"}>
                        {tier.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <DollarSign className="h-4 w-4" />
                        {centsToCurrency(tier.price_monthly, tier.currency)} / mo
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" /> {tier.current_members} members
                      </div>
                    </div>
                    {tier.features.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium uppercase text-muted-foreground">Perks</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {tier.features.slice(0, 4).map((feature) => (
                            <li key={feature} className="flex items-start gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                              <span>{feature}</span>
                            </li>
                          ))}
                          {tier.features.length > 4 && (
                            <li className="text-xs text-muted-foreground">+{tier.features.length - 4} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => handleOpenEdit(tier)} disabled={mutating}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" className="flex-1" onClick={() => handleDeleteTier(tier)} disabled={mutating}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Subscriber directory</CardTitle>
              <CardDescription>Detailed subscriber analytics will arrive in a future update.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-3 py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10" />
              <p className="text-sm max-w-md">
                We&rsquo;re capturing real membership activity. Soon you&rsquo;ll be able to see individual supporters, billing
                status, and churn right here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {editingTier ? "Edit membership tier" : "Create membership tier"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Define pricing, perks, and presentation for this tier.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tier-name">Name</Label>
                <Input
                  id="tier-name"
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="VIP Supporters"
                />
              </div>
              <div>
                <Label htmlFor="tier-description">Description</Label>
                <Textarea
                  id="tier-description"
                  value={formState.description}
                  onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="What do members receive at this tier?"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="tier-price-monthly">Monthly price (in {formState.currency})</Label>
                  <Input
                    id="tier-price-monthly"
                    type="number"
                    min="0"
                    step="0.5"
                    value={formState.priceMonthly}
                    onChange={(event) => setFormState((prev) => ({ ...prev, priceMonthly: event.target.value }))}
                    placeholder="9.99"
                  />
                </div>
                <div>
                  <Label htmlFor="tier-price-yearly">Yearly price</Label>
                  <Input
                    id="tier-price-yearly"
                    type="number"
                    min="0"
                    step="1"
                    value={formState.priceYearly}
                    onChange={(event) => setFormState((prev) => ({ ...prev, priceYearly: event.target.value }))}
                    placeholder="99"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="tier-features">Perks (one per line)</Label>
                <Textarea
                  id="tier-features"
                  value={formState.features}
                  onChange={(event) => setFormState((prev) => ({ ...prev, features: event.target.value }))}
                  placeholder={"Exclusive drops\nMonthly Q&A\nEarly access to releases"}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="tier-emoji">Emoji</Label>
                  <Input
                    id="tier-emoji"
                    value={formState.emoji}
                    onChange={(event) => setFormState((prev) => ({ ...prev, emoji: event.target.value }))}
                    placeholder="🌟"
                  />
                </div>
                <div>
                  <Label htmlFor="tier-color">Badge color</Label>
                  <Input
                    id="tier-color"
                    value={formState.color}
                    onChange={(event) => setFormState((prev) => ({ ...prev, color: event.target.value }))}
                    placeholder="#7c3aed"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={mutating}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitTier} disabled={mutating}>
                {editingTier ? "Save changes" : "Create tier"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedMembershipsModule;
