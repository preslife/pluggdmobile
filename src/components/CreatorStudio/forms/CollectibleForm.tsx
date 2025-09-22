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
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  CalendarIcon, TrendingUp, Sparkles, Lock, Globe,
  FileText, Image, Plus, X, Shield, Zap, Package,
  Coins, Key, Clock, Award
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileUpload } from '@/components/FileUpload';
import '../modules/catalog-v2.css';

type CollectibleFormData = {
  title: string;
  description: string;
  price: number;
  collectible_type: string;
  rarity_level: string;
  edition_type: string;
  total_supply: number;
  has_physical_item: boolean;
  physical_description: string;
  requires_shipping: boolean;
  provides_access: string[];
  expiry_date?: Date;
  is_transferable: boolean;
  is_minted: boolean;
  blockchain: string;
  contract_address: string;
  token_standard: string;
};

const collectibleTypes = [
  { value: 'nft', label: 'NFT', icon: Coins },
  { value: 'digital_art', label: 'Digital Art', icon: Image },
  { value: 'trading_card', label: 'Trading Card', icon: Award },
  { value: 'limited_edition', label: 'Limited Edition', icon: Sparkles },
];

const rarityLevels = [
  { value: 'common', label: 'Common', color: 'text-gray-500' },
  { value: 'rare', label: 'Rare', color: 'text-blue-500' },
  { value: 'epic', label: 'Epic', color: 'text-purple-500' },
  { value: 'legendary', label: 'Legendary', color: 'text-yellow-500' },
];

const editionTypes = [
  'First Edition',
  'Limited Edition',
  'Open Edition',
  'Exclusive Edition',
  'Anniversary Edition',
];

const blockchains = [
  'Ethereum',
  'Polygon',
  'Solana',
  'Tezos',
  'Flow',
  'BSC',
];

const tokenStandards = [
  'ERC-721',
  'ERC-1155',
  'SPL',
];

const accessTypes = [
  { id: 'exclusive_content', label: 'Exclusive Content', icon: Lock },
  { id: 'community_access', label: 'Community Access', icon: Globe },
  { id: 'early_releases', label: 'Early Releases', icon: Zap },
  { id: 'meet_greet', label: 'Meet & Greet', icon: Sparkles },
  { id: 'merchandise_discount', label: 'Merchandise Discounts', icon: Package },
  { id: 'voting_rights', label: 'Voting Rights', icon: Shield },
];

export const CollectibleForm = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [digitalAssets, setDigitalAssets] = useState<string[]>([]);
  const [unlockableContent, setUnlockableContent] = useState('');
  const [metadata, setMetadata] = useState<{ trait: string; value: string }[]>([]);
  const [newTrait, setNewTrait] = useState({ trait: '', value: '' });
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);

  const form = useForm<CollectibleFormData>({
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      collectible_type: 'nft',
      rarity_level: 'common',
      edition_type: 'Limited Edition',
      total_supply: 100,
      has_physical_item: false,
      physical_description: '',
      requires_shipping: false,
      provides_access: [],
      is_transferable: true,
      is_minted: false,
      blockchain: 'Ethereum',
      contract_address: '',
      token_standard: 'ERC-721',
    },
  });

  const watchCollectibleType = form.watch('collectible_type');
  const watchHasPhysical = form.watch('has_physical_item');
  const watchIsMinted = form.watch('is_minted');
  const watchTotalSupply = form.watch('total_supply');
  const currentSupply = 0; // This would be calculated based on sales

  const handleImageUpload = (url: string) => {
    setImageUrl(url);
  };

  const handleDigitalAssetUpload = (url: string) => {
    setDigitalAssets((prev) => [...prev, url]);
  };

  const removeDigitalAsset = (index: number) => {
    setDigitalAssets(digitalAssets.filter((_, i) => i !== index));
  };

  const addMetadataTrait = () => {
    if (newTrait.trait && newTrait.value) {
      setMetadata([...metadata, newTrait]);
      setNewTrait({ trait: '', value: '' });
    }
  };

  const removeMetadataTrait = (index: number) => {
    setMetadata(metadata.filter((_, i) => i !== index));
  };

  const toggleAccess = (accessId: string) => {
    if (selectedAccess.includes(accessId)) {
      setSelectedAccess(selectedAccess.filter(id => id !== accessId));
    } else {
      setSelectedAccess([...selectedAccess, accessId]);
    }
  };

  const onSubmit = async (data: CollectibleFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a collectible",
        variant: "destructive",
      });
      return;
    }

    if (!imageUrl) {
      toast({
        title: "Error",
        description: "Please upload a main image for the collectible",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const blockchainData = data.is_minted ? {
        blockchain: data.blockchain,
        contract_address: data.contract_address,
        token_standard: data.token_standard,
      } : null;

      const collectibleData = {
        user_id: user.id,
        title: data.title,
        description: data.description,
        price: data.price,
        collectible_type: data.collectible_type,
        rarity_level: data.rarity_level,
        edition_type: data.edition_type,
        total_supply: data.total_supply,
        current_supply: currentSupply,
        image_url: imageUrl,
        digital_assets: digitalAssets.length > 0 ? digitalAssets : null,
        unlockable_content: unlockableContent || null,
        metadata: metadata.length > 0 ? metadata : null,
        has_physical_item: data.has_physical_item,
        physical_description: data.has_physical_item ? data.physical_description : null,
        requires_shipping: data.has_physical_item ? data.requires_shipping : false,
        provides_access: selectedAccess.length > 0 ? selectedAccess : null,
        expiry_date: data.expiry_date ? data.expiry_date.toISOString() : null,
        is_transferable: data.is_transferable,
        is_minted: data.is_minted,
        blockchain_data: blockchainData,
        token_id: null, // Will be set when minted
        contract_address: data.is_minted ? data.contract_address : null,
        status: 'draft',
        view_count: 0,
        sales_count: 0,
        revenue_total: 0,
      };

      const { error } = await supabase
        .from('creator_collectibles')
        .insert([collectibleData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Collectible created successfully",
      });

      navigate('/studio/catalog');
    } catch (error) {
      console.error('Error creating collectible:', error);
      toast({
        title: "Error",
        description: "Failed to create collectible",
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
            <TrendingUp className="w-5 h-5" />
            Create Collectible
          </CardTitle>
          <CardDescription>
            Create a digital collectible or NFT for your fans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="rarity">Rarity & Supply</TabsTrigger>
                  <TabsTrigger value="assets">Digital Assets</TabsTrigger>
                  <TabsTrigger value="utility">Utility & Access</TabsTrigger>
                  <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="title"
                    rules={{ required: "Title is required" }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collectible Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter collectible title" {...field} />
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
                            placeholder="Describe your collectible..."
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
                    name="collectible_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collectible Type</FormLabel>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {collectibleTypes.map((type) => {
                            const Icon = type.icon;
                            return (
                              <div
                                key={type.value}
                                onClick={() => field.onChange(type.value)}
                                className={cn(
                                  "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                                  field.value === type.value
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-primary/50"
                                )}
                              >
                                <Icon className="w-5 h-5" />
                                <span className="font-medium">{type.label}</span>
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    rules={{ required: "Price is required", min: 0 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
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

                  <div>
                    <FormLabel>Main Image</FormLabel>
                    <FileUpload
                      onUpload={(url) => handleImageUpload(url)}
                      accept="image/*"
                      bucketName="beat-artwork"
                      maxSizeMB={10}
                    />
                    {imageUrl && (
                      <div className="mt-2">
                        <img
                          src={imageUrl}
                          alt="Collectible"
                          className="w-32 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="rarity" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="rarity_level"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rarity Level</FormLabel>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                          {rarityLevels.map((level) => (
                            <div
                              key={level.value}
                              onClick={() => field.onChange(level.value)}
                              className={cn(
                                "p-3 rounded-lg border-2 cursor-pointer transition-colors text-center",
                                field.value === level.value
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:border-primary/50"
                              )}
                            >
                              <span className={cn("font-bold text-lg", level.color)}>
                                {level.label}
                              </span>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="edition_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edition Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select edition type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {editionTypes.map((edition) => (
                              <SelectItem key={edition} value={edition}>
                                {edition}
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
                    name="total_supply"
                    rules={{ required: "Total supply is required", min: 1 }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Supply</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Total number of editions available
                        </FormDescription>
                        <div className="mt-2 p-3 bg-muted rounded-lg">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Available</span>
                            <span className="font-medium">{watchTotalSupply - currentSupply} / {watchTotalSupply}</span>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="has_physical_item"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Includes Physical Item</FormLabel>
                          <FormDescription>
                            This collectible includes a physical component
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

                  {watchHasPhysical && (
                    <>
                      <FormField
                        control={form.control}
                        name="physical_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Physical Item Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe the physical item..."
                                className="min-h-[80px]"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="requires_shipping"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel>Requires shipping</FormLabel>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </TabsContent>

                <TabsContent value="assets" className="space-y-4 mt-4">
                  <div>
                    <FormLabel>Digital Assets</FormLabel>
                    <FormDescription>
                      Upload high-resolution files, 3D models, or other digital assets
                    </FormDescription>
                    <FileUpload
                      onUpload={(url) => handleDigitalAssetUpload(url)}
                      accept="image/*,video/*,model/*"
                      bucketName="beat-artwork"
                      maxSizeMB={50}
                    />
                    {digitalAssets.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {digitalAssets.map((asset, index) => (
                          <div key={index} className="relative group">
                            <div className="p-2 bg-muted rounded-lg flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              <span className="text-sm">Asset {index + 1}</span>
                              <button
                                type="button"
                                onClick={() => removeDigitalAsset(index)}
                                className="ml-2 text-destructive hover:text-destructive/80"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <FormLabel>Unlockable Content</FormLabel>
                    <FormDescription>
                      Content that becomes available after purchase (links, codes, exclusive content)
                    </FormDescription>
                    <Textarea
                      placeholder="Enter unlockable content..."
                      className="min-h-[100px] mt-2"
                      value={unlockableContent}
                      onChange={(e) => setUnlockableContent(e.target.value)}
                    />
                  </div>

                  <div>
                    <FormLabel>Metadata Traits</FormLabel>
                    <FormDescription>
                      Add attributes and properties for your collectible
                    </FormDescription>
                    <div className="flex gap-2 mt-2">
                      <Input
                        placeholder="Trait (e.g., Background)"
                        value={newTrait.trait}
                        onChange={(e) => setNewTrait({ ...newTrait, trait: e.target.value })}
                      />
                      <Input
                        placeholder="Value (e.g., Blue)"
                        value={newTrait.value}
                        onChange={(e) => setNewTrait({ ...newTrait, value: e.target.value })}
                      />
                      <Button type="button" onClick={addMetadataTrait} size="sm">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {metadata.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {metadata.map((trait, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <div className="flex gap-2">
                              <Badge variant="outline">{trait.trait}</Badge>
                              <span className="text-sm">{trait.value}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMetadataTrait(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="utility" className="space-y-4 mt-4">
                  <div>
                    <FormLabel>Holder Benefits</FormLabel>
                    <FormDescription>
                      Select the benefits and access this collectible provides
                    </FormDescription>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {accessTypes.map((access) => {
                        const Icon = access.icon;
                        const isSelected = selectedAccess.includes(access.id);
                        return (
                          <div
                            key={access.id}
                            onClick={() => toggleAccess(access.id)}
                            className={cn(
                              "flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{access.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="expiry_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Benefits Expiry Date (Optional)</FormLabel>
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
                                  <span>No expiry date</span>
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
                        <FormDescription>
                          Leave empty for permanent benefits
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_transferable"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Transferable</FormLabel>
                          <FormDescription>
                            Allow holders to transfer or resell this collectible
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

                <TabsContent value="blockchain" className="space-y-4 mt-4">
                  <FormField
                    control={form.control}
                    name="is_minted"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Minted on Blockchain</FormLabel>
                          <FormDescription>
                            This collectible is already minted as an NFT
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

                  {watchIsMinted && (
                    <>
                      <FormField
                        control={form.control}
                        name="blockchain"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Blockchain</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select blockchain" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {blockchains.map((chain) => (
                                  <SelectItem key={chain} value={chain}>
                                    {chain}
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
                        name="contract_address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contract Address</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="0x..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="token_standard"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Standard</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select token standard" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {tokenStandards.map((standard) => (
                                  <SelectItem key={standard} value={standard}>
                                    {standard}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {!watchIsMinted && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Off-Chain Collectible</p>
                          <p className="text-sm text-muted-foreground">
                            This collectible will be managed through our platform. You can mint it on-chain later if desired.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="flex gap-4">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Collectible'}
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
