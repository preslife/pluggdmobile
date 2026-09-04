/**
 * PLUGGD Store — a real-data storefront for official merchandise,
 * creator goods and sample-pack previews. Physical checkout remains
 * owned by the product detail route and its commerce-policy gate.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { supabase } from '../../lib/supabase';
import { formatGBP, type SamplePackItem } from '../../lib/mobileContent';
import { loadPublicCreatorIdentityMap, type PublicCreatorIdentity } from '../culture/publicCreatorIdentity';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { physicalBasketCount, usePhysicalBasketStore } from '../store/physicalBasket';
import { Enter, EdPressable } from './EditorialBits';

type StoreProductRow = {
  id: string;
  title?: string | null;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  price_cents?: number | null;
  price?: number | null;
  product_type?: string | null;
  category?: string | null;
  requires_shipping?: boolean | null;
  stock_quantity?: number | null;
  created_at?: string | null;
  user_id?: string | null;
  creator_identity?: PublicCreatorIdentity | null;
  source: 'store_products' | 'creator_merchandise';
};

type StoreSamplePack = SamplePackItem & {
  creator_identity?: PublicCreatorIdentity | null;
};

type ShelfFilter = 'all' | 'official' | 'creator';

const SHELF_FILTERS: Array<{ key: ShelfFilter; label: string }> = [
  { key: 'all', label: 'All products' },
  { key: 'official', label: 'PLUGGD' },
  { key: 'creator', label: 'Creator shops' },
];

function productTitle(product: StoreProductRow) {
  return product.title || product.name || 'Store item';
}

function productImage(product: StoreProductRow) {
  return product.image_url || product.cover_image_url || null;
}

function productPrice(product: StoreProductRow) {
  if (product.price_cents != null) return formatGBP(product.price_cents, { cents: true });
  if (product.price != null) return formatGBP(product.price);
  return 'Price shown inside';
}

function productRoute(product: StoreProductRow) {
  return `/product/${product.id}?source=${product.source}`;
}

function productTypeLabel(product: StoreProductRow) {
  return (product.product_type || product.category || 'Store item').replace(/_/g, ' ');
}

function creatorIdentityLabel(identity?: PublicCreatorIdentity | null) {
  if (identity?.username) return `@${identity.username}`;
  return identity?.full_name || null;
}

function productOwnerLabel(product: StoreProductRow) {
  if (product.source === 'store_products') return 'PLUGGD';
  return creatorIdentityLabel(product.creator_identity);
}

function StoreSectionHead({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  const styles = useMarketStoreStyles();
  return (
    <View style={{ gap: 5 }}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {copy ? <Text style={styles.sectionCopy}>{copy}</Text> : null}
    </View>
  );
}

function StoreState({ icon, eyebrow, title, copy, actionLabel, onAction }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  eyebrow: string;
  title: string;
  copy: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = usePluggdTheme();
  const styles = useMarketStoreStyles();
  return (
    <View style={styles.emptyPanel}>
      <MaterialIcons name={icon} size={22} color={theme.colors.accentText} />
      <Text style={styles.emptyEyebrow}>{eyebrow}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
      <EdPressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction}>
        <View style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
          <MaterialIcons name="arrow-forward" size={15} color={theme.colors.onAccent} />
        </View>
      </EdPressable>
    </View>
  );
}

function ProductArtwork({ product, style }: { product: StoreProductRow; style: object }) {
  const styles = useMarketStoreStyles();
  if (productImage(product)) return <PluggdImage uri={productImage(product)!} style={style as any} />;

  return (
    <LinearGradient colors={['#342116', '#17100c']} style={[style, styles.artFallback]}>
      <MaterialIcons name="local-mall" size={28} color="rgba(255,248,237,0.56)" />
      <Text style={styles.artFallbackLabel}>{productTypeLabel(product).toUpperCase()}</Text>
    </LinearGradient>
  );
}

function ProductCard({ product }: { product: StoreProductRow }) {
  const styles = useMarketStoreStyles();
  const router = useRouter();
  const soldOut = product.stock_quantity != null && product.stock_quantity <= 0;
  const ownerLabel = productOwnerLabel(product);
  return (
    <EdPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${productTitle(product)}`}
      onPress={() => router.push(productRoute(product) as any)}
      style={styles.gridCardWrap}
    >
      <View style={styles.productCard}>
        <View style={styles.productArtWrap}>
          <ProductArtwork product={product} style={styles.productArt} />
          {soldOut ? <View style={styles.soldOutFlag}><Text style={styles.soldOutText}>SOLD OUT</Text></View> : null}
        </View>
        <Text style={styles.productType}>{productTypeLabel(product).toUpperCase()}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>{productTitle(product)}</Text>
        {ownerLabel ? <Text style={styles.productOwner} numberOfLines={1}>{ownerLabel}</Text> : null}
        <Text style={styles.productPrice}>{productPrice(product)}</Text>
      </View>
    </EdPressable>
  );
}

export function MarketStoreScreen() {
  const theme = usePluggdTheme();
  const styles = useMarketStoreStyles();
  const bottomInset = useBottomChromeInset();
  const router = useRouter();
  const [shelfFilter, setShelfFilter] = useState<ShelfFilter>('all');
  const basketLines = usePhysicalBasketStore((state) => state.lines);
  const basketCount = useMemo(() => physicalBasketCount(basketLines), [basketLines]);

  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: async () => {
      const [official, merch] = await Promise.all([
        (supabase as any)
          .from('store_products')
          .select('id,title,description,image_url,price,product_type,created_at,is_active,stock_quantity,visibility,moderation_status,currency')
          .eq('is_active', true)
          .eq('visibility', 'public')
          .eq('moderation_status', 'approved')
          .eq('currency', 'GBP')
          .in('product_type', ['physical', 'merchandise', 'merch', 'creator_merch'])
          .order('created_at', { ascending: false })
          .limit(24),
        (supabase as any)
          .from('creator_merchandise')
          .select('id,user_id,title,description,image_url,gallery_images,price,product_type,category,requires_shipping,status,created_at,stock_quantity')
          .in('status', ['approved', 'active', 'published', 'live'])
          .eq('requires_shipping', true)
          .order('created_at', { ascending: false })
          .limit(24),
      ]);
      if (official.error && merch.error) throw official.error;
      const products = [
        ...(official.data ?? []).map((item: any) => ({ ...item, source: 'store_products' as const })),
        ...(merch.data ?? []).map((item: any) => ({ ...item, source: 'creator_merchandise' as const })),
      ] as StoreProductRow[];
      const creatorMap = await loadPublicCreatorIdentityMap(products.map((product) => product.user_id));
      return products.map((product) => ({
        ...product,
        creator_identity: product.user_id ? creatorMap.get(product.user_id) ?? null : null,
      }));
    },
    staleTime: 1000 * 60 * 3,
  });

  const packsQuery = useQuery({
    queryKey: ['store', 'sample-packs'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sample_packs')
        .select('id,user_id,owner_id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      const packs = (data ?? []) as StoreSamplePack[];
      const creatorMap = await loadPublicCreatorIdentityMap(packs.map((pack) => pack.user_id || pack.owner_id));
      return packs.map((pack) => {
        const creatorId = pack.user_id || pack.owner_id;
        return {
          ...pack,
          creator_identity: creatorId ? creatorMap.get(creatorId) ?? null : null,
        };
      });
    },
    staleTime: 1000 * 60 * 3,
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const featured = products[0];
  const featuredOwner = featured ? productOwnerLabel(featured) : null;
  const shelfProducts = useMemo(() => {
    const remaining = products.filter((product) => product.id !== featured?.id);
    if (shelfFilter === 'official') return remaining.filter((product) => product.source === 'store_products');
    if (shelfFilter === 'creator') return remaining.filter((product) => product.source === 'creator_merchandise');
    return remaining;
  }, [featured?.id, products, shelfFilter]);

  const refreshing = productsQuery.isRefetching || packsQuery.isRefetching;
  const refresh = () => {
    void productsQuery.refetch();
    void packsQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <DiscoveryHeader backToDiscovery />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentFill} />}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 30,
        }}
      >
        <Enter delay={0}>
          <View style={styles.masthead}>
            <View style={styles.mastheadTopRow}>
              <View style={styles.storeIdentity}>
                <View style={styles.storeMark}><MaterialIcons name="storefront" size={20} color={theme.colors.onAccent} /></View>
                <Text style={styles.storeEdition}>PLUGGD GOODS / CREATOR SHOPS</Text>
              </View>
              <View style={styles.mastheadActions}>
                <EdPressable accessibilityRole="button" accessibilityLabel="Open purchases" onPress={() => router.push('/purchases' as any)}>
                  <View style={styles.ordersButton}>
                    <MaterialIcons name="receipt-long" size={19} color={theme.colors.text} />
                  </View>
                </EdPressable>
                <EdPressable accessibilityRole="button" accessibilityLabel={`Open basket with ${basketCount} items`} onPress={() => router.push('/commerce/basket' as any)}>
                  <View style={styles.basketButton}>
                    <MaterialIcons name="shopping-bag" size={19} color={theme.colors.onAccent} />
                    {basketCount ? <Text style={styles.basketCount}>{basketCount}</Text> : null}
                  </View>
                </EdPressable>
              </View>
            </View>
            <View style={styles.mastheadRule} />
            <Text style={styles.heroTitle}>Wear the culture.{`\n`}Back the makers.</Text>
            <Text style={styles.heroCopy}>Official PLUGGD pieces and goods from independent creators, selected from live store listings.</Text>
            <View style={styles.heroCtaRow}>
              <EdPressable haptic="impact" accessibilityRole="button" accessibilityLabel="Explore BeatPlug" onPress={() => router.push('/market/beats' as any)}>
                <View style={styles.heroPrimary}>
                  <Text style={styles.heroPrimaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Explore BeatPlug</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={theme.colors.onAccent} />
                </View>
              </EdPressable>
              <EdPressable accessibilityRole="button" accessibilityLabel="Browse sample packs" onPress={() => router.push('/sample-packs' as any)}>
                <View style={styles.heroSecondary}><Text style={styles.heroSecondaryText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>Sample packs</Text></View>
              </EdPressable>
            </View>
          </View>
        </Enter>

        <View style={styles.sectionRule} />

        <View style={styles.storeSection}>
          <StoreSectionHead eyebrow="The front window" title="Featured now" />
          {productsQuery.isLoading ? (
            <PremiumSkeleton compact label="Loading the store…" />
          ) : productsQuery.isError ? (
            <StoreState
              icon="wifi-off"
              eyebrow="STORE UNAVAILABLE"
              title="We couldn't load the shelves"
              copy="Check your connection and try the store again."
              actionLabel="Try again"
              onAction={() => void productsQuery.refetch()}
            />
          ) : featured ? (
            <EdPressable haptic="impact" accessibilityRole="button" accessibilityLabel={`Open featured product ${productTitle(featured)}`} onPress={() => router.push(productRoute(featured) as any)}>
              <View style={styles.featuredPanel}>
                <ProductArtwork product={featured} style={StyleSheet.absoluteFillObject} />
                <LinearGradient colors={['rgba(10,8,6,0.08)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.featuredFlag}><Text style={styles.featuredFlagText}>FEATURED</Text></View>
                <View style={styles.featuredBody}>
                  <Text style={styles.featuredEyebrow}>{productTypeLabel(featured).toUpperCase()}</Text>
                  <Text style={styles.featuredTitle} numberOfLines={3}>{productTitle(featured)}</Text>
                  <View style={styles.featuredFootRow}>
                    <View>
                      {featuredOwner ? <Text style={styles.featuredShop}>{featuredOwner}</Text> : null}
                      <Text style={styles.featuredPrice}>{productPrice(featured)}</Text>
                    </View>
                    <View style={styles.shopCollection}>
                      <Text style={styles.shopCollectionText}>View product</Text>
                      <MaterialIcons name="arrow-forward" size={15} color={theme.colors.onAccent} />
                    </View>
                  </View>
                </View>
              </View>
            </EdPressable>
          ) : (
            <StoreState
              icon="inventory-2"
              eyebrow="STORE UPDATE"
              title="The next physical drop is being prepared"
              copy="Sample packs and BeatPlug are still open while new merchandise is published."
              actionLabel="Browse sample packs"
              onAction={() => router.push('/sample-packs' as any)}
            />
          )}
        </View>

        {products.length > 1 ? (
          <View style={styles.storeSection}>
            <StoreSectionHead eyebrow="The shelves" title="Shop merchandise" copy={`${products.length} ${products.length === 1 ? 'product' : 'products'} live now`} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={styles.filterRow}>
              {SHELF_FILTERS.map((filter) => {
                const selected = shelfFilter === filter.key;
                return (
                  <EdPressable
                    key={filter.key}
                    accessibilityRole="tab"
                    accessibilityLabel={`Show ${filter.label}`}
                    accessibilityState={{ selected }}
                    onPress={() => setShelfFilter(filter.key)}
                  >
                    <View style={[styles.filterChip, selected && styles.filterChipSelected]}>
                      <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{filter.label}</Text>
                    </View>
                  </EdPressable>
                );
              })}
            </ScrollView>
            {shelfProducts.length ? (
              <View style={styles.productGrid}>
                {shelfProducts.map((product) => <ProductCard key={`${product.source}-${product.id}`} product={product} />)}
              </View>
            ) : <Text style={styles.filterEmpty}>No products are live on this shelf yet.</Text>}
          </View>
        ) : null}

        <View style={styles.sectionRule} />

        <View style={styles.storeSection}>
          <StoreSectionHead eyebrow="Make something new" title="Sample packs" copy="Preview sounds from PLUGGD creators before opening the full pack." />
          {packsQuery.isLoading ? (
            <PremiumSkeleton compact label="Loading sample packs…" />
          ) : packsQuery.isError ? (
            <View style={styles.inlineState}>
              <Text style={styles.inlineStateText}>Sample packs couldn't load.</Text>
              <EdPressable accessibilityRole="button" accessibilityLabel="Retry sample packs" onPress={() => void packsQuery.refetch()}>
                <Text style={styles.inlineAction}>Try again</Text>
              </EdPressable>
            </View>
          ) : (packsQuery.data ?? []).length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={178} decelerationRate="fast" contentContainerStyle={styles.packRail}>
              {(packsQuery.data ?? []).map((pack) => (
                <EdPressable key={pack.id} accessibilityRole="button" accessibilityLabel={`Open ${pack.title || 'sample pack'}`} onPress={() => router.push(`/sample-pack/${pack.id}` as any)}>
                  <View style={styles.packCard}>
                    <View style={styles.packArtWrap}>
                      {pack.cover_art_url ? (
                        <PluggdImage uri={pack.cover_art_url} style={styles.packArt} />
                      ) : (
                        <LinearGradient colors={['#342116', '#17100c']} style={[styles.packArt, styles.artFallback]}>
                          <MaterialIcons name="graphic-eq" size={28} color="rgba(255,248,237,0.56)" />
                        </LinearGradient>
                      )}
                    </View>
                    <Text style={styles.productType}>SAMPLE PACK</Text>
                    <Text style={styles.packTitle} numberOfLines={2}>{pack.title || 'Sample pack'}</Text>
                    <View style={styles.productFootRow}>
                      <Text style={styles.productOwner} numberOfLines={1}>{creatorIdentityLabel(pack.creator_identity) || pack.genre || 'Sounds'}</Text>
                      <Text style={Number(pack.price ?? 0) > 0 ? styles.productPreviewOnly : styles.productPrice}>
                        {Number(pack.price ?? 0) > 0 ? 'Preview' : 'Free'}
                      </Text>
                    </View>
                  </View>
                </EdPressable>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.inlineState}>
              <MaterialIcons name="graphic-eq" size={20} color={theme.colors.accentText} />
              <Text style={styles.inlineStateText}>New sample packs will appear here when creators publish them.</Text>
            </View>
          )}
          <EdPressable accessibilityRole="button" accessibilityLabel="Open all sample packs" onPress={() => router.push('/sample-packs' as any)}>
            <View style={styles.sectionLink}>
              <Text style={styles.sectionLinkText}>Browse all sample packs</Text>
              <MaterialIcons name="arrow-forward" size={16} color={theme.colors.accentText} />
            </View>
          </EdPressable>
        </View>

        <View style={styles.beatPlugFeature}>
          <View style={styles.beatPlugIcon}><MaterialIcons name="headphones" size={23} color={theme.colors.accentText} /></View>
          <View style={styles.beatPlugCopy}>
            <Text style={styles.beatPlugEyebrow}>BEATS & LICENCES</Text>
            <Text style={styles.beatPlugTitle}>Looking for your next sound?</Text>
            <Text style={styles.beatPlugBody}>Preview real beats and review available licence options in BeatPlug.</Text>
          </View>
          <EdPressable haptic="impact" accessibilityRole="button" accessibilityLabel="Open BeatPlug" onPress={() => router.push('/market/beats' as any)}>
            <View style={styles.beatPlugAction}><MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} /></View>
          </EdPressable>
        </View>
      </ScrollView>
    </View>
  );
}

function useMarketStoreStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  masthead: { gap: 14, paddingTop: 4 },
  mastheadTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  storeIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  storeMark: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  storeEdition: { flex: 1, fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.3, color: theme.colors.textSecondary },
  mastheadActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ordersButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  basketButton: { minWidth: 44, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: theme.colors.accentFill, paddingHorizontal: 9 },
  basketCount: { fontFamily: edFonts.bodyBlack, fontSize: 11, color: theme.colors.onAccent },
  mastheadRule: { height: 3, backgroundColor: theme.colors.accentFill },
  heroTitle: { fontFamily: edFonts.serif, fontSize: 37, lineHeight: 39, letterSpacing: -1.1, color: theme.colors.text },
  heroCopy: { maxWidth: 340, fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: theme.colors.textSecondary },
  heroCtaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 2 },
  heroPrimary: {
    minHeight: 46,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.onAccent },
  heroSecondary: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.text },
  sectionRule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider },
  storeSection: { gap: 14 },
  sectionEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.8, color: theme.colors.accentText },
  sectionTitle: { fontFamily: edFonts.serif, fontSize: 28, lineHeight: 31, color: theme.colors.text },
  sectionCopy: { maxWidth: 330, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },

  featuredPanel: { overflow: 'hidden', minHeight: 370, justifyContent: 'flex-end', borderWidth: 1, borderColor: theme.colors.border },
  featuredFlag: { position: 'absolute', top: 14, left: 14, backgroundColor: theme.colors.accentFill, paddingHorizontal: 9, paddingVertical: 6 },
  featuredFlagText: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.4, color: theme.colors.onAccent },
  featuredBody: { padding: 16, gap: 6 },
  featuredEyebrow: { fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.accentFill },
  featuredTitle: { maxWidth: 300, fontFamily: edFonts.bodyBlack, fontSize: 29, lineHeight: 31, letterSpacing: -0.5, color: theme.colors.mediaText },
  featuredFootRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 7 },
  featuredShop: { fontFamily: edFonts.bodyMedium, fontSize: 11, color: 'rgba(255,248,237,0.56)' },
  featuredPrice: { marginTop: 2, fontFamily: edFonts.bodyBlack, fontSize: 17, color: theme.colors.mediaText },
  shopCollection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 13,
  },
  shopCollectionText: { fontFamily: edFonts.bodyBlack, fontSize: 11.5, color: theme.colors.onAccent },

  filterRow: { gap: 8, paddingRight: 20 },
  filterChip: { minHeight: 44, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 13 },
  filterChipSelected: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  filterChipText: { fontFamily: edFonts.bodyBold, fontSize: 11.5, color: theme.colors.textSecondary },
  filterChipTextSelected: { color: theme.colors.onAccent },
  filterEmpty: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider, paddingVertical: 18, fontFamily: edFonts.bodyMedium, fontSize: 12.5, color: theme.colors.textSecondary },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCardWrap: { width: '47.5%', flexGrow: 1, maxWidth: '48.5%' },
  productCard: { minHeight: 294 },
  productArtWrap: { aspectRatio: 0.86, overflow: 'hidden', backgroundColor: '#17100c' },
  productArt: { width: '100%', height: '100%' },
  artFallback: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  artFallbackLabel: { maxWidth: 120, paddingHorizontal: 8, fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, textAlign: 'center', color: 'rgba(255,248,237,0.52)' },
  soldOutFlag: { position: 'absolute', top: 8, right: 8, backgroundColor: '#0a0806', paddingHorizontal: 7, paddingVertical: 5 },
  soldOutText: { fontFamily: edFonts.mono, fontSize: 8, letterSpacing: 1.1, color: theme.colors.mediaText },
  productType: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.2, color: theme.colors.accentText, marginTop: 8 },
  productTitle: { minHeight: 36, marginTop: 3, fontFamily: edFonts.bodyBold, fontSize: 14, lineHeight: 18, color: theme.colors.text },
  productFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  productOwner: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 10.5, color: theme.colors.textMuted },
  productPrice: { marginTop: 3, fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.text },
  productPreviewOnly: { marginTop: 3, fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 0.4, color: theme.colors.accentText },

  packRail: { gap: 12, paddingRight: 20 },
  packCard: { width: 166 },
  packArtWrap: { width: 166, height: 150, overflow: 'hidden', backgroundColor: '#17100c' },
  packArt: { width: '100%', height: '100%' },
  packTitle: { minHeight: 38, marginTop: 3, fontFamily: edFonts.bodyBold, fontSize: 14, lineHeight: 18, color: theme.colors.text },
  inlineState: { minHeight: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider },
  inlineStateText: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  inlineAction: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.accentText },
  sectionLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  sectionLinkText: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: theme.colors.text },

  beatPlugFeature: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 3, borderTopColor: theme.colors.accentFill, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingVertical: 18 },
  beatPlugIcon: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  beatPlugCopy: { flex: 1, minWidth: 0, gap: 3 },
  beatPlugEyebrow: { fontFamily: edFonts.mono, fontSize: 8.5, letterSpacing: 1.4, color: theme.colors.accentText },
  beatPlugTitle: { fontFamily: edFonts.bodyBlack, fontSize: 15, color: theme.colors.text },
  beatPlugBody: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: theme.colors.textSecondary },
  beatPlugAction: { width: 44, height: 44, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },

  emptyPanel: {
    minHeight: 220,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 24,
    gap: 7,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  emptyEyebrow: { marginTop: 3, fontFamily: edFonts.mono, fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.accentText },
  emptyTitle: { maxWidth: 300, fontFamily: edFonts.serif, fontSize: 25, lineHeight: 28, color: theme.colors.text },
  emptyCopy: { maxWidth: 310, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: theme.colors.textSecondary },
  emptyAction: { minHeight: 44, marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.colors.accentFill, paddingHorizontal: 14 },
  emptyActionText: { fontFamily: edFonts.bodyBlack, fontSize: 12, color: theme.colors.onAccent },
  }), [theme]);
}
