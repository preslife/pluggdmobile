/**
 * Market — selected mobile culture-shop system (/market resolves to
 * /store): Sora-led "PLUGGD Store" hierarchy
 * with trust chips, Featured collection panel, What's Next drops,
 * Creator shops, the Digital shelf, Book talent services, From the
 * scene, and the full product grid. BeatPlug stays its own floor at
 * /market/beats.
 */
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
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
import { ed, edFonts } from '../../design/editorial';
import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import { formatGBP, type SamplePackItem } from '../../lib/mobileContent';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
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
  created_at?: string | null;
  source: 'store_products' | 'creator_merchandise';
};

const TRUST_CHIPS = ['Worldwide shipping', 'Secure payments', 'Support creators'] as const;

const SERVICES = [
  { key: 'production', icon: 'multitrack-audio', title: 'Music Production', copy: 'Custom tracks, beat edits and session-ready production.', price: 'From £250' },
  { key: 'mixing', icon: 'tune', title: 'Mixing & Mastering', copy: 'Polished masters and release-ready mix engineering.', price: 'From £120' },
  { key: 'artwork', icon: 'palette', title: 'Artwork & Design', copy: 'Cover art, branding, release assets and campaign visuals.', price: 'From £80' },
  { key: 'djSets', icon: 'headphones', title: 'DJ Sets', copy: 'Live, virtual, radio and event-ready DJ bookings.', price: 'From £200' },
] as const;

function productTitle(product: StoreProductRow) {
  return product.title || product.name || 'Store item';
}

function productImage(product: StoreProductRow) {
  return product.image_url || product.cover_image_url || null;
}

function productPrice(product: StoreProductRow) {
  if (product.price_cents != null) return formatGBP(product.price_cents, { cents: true });
  if (product.price != null) return formatGBP(product.price);
  return 'Free';
}

function productRoute(product: StoreProductRow) {
  return `/product/${product.id}?source=${product.source}`;
}

function productTypeLabel(product: StoreProductRow) {
  return (product.product_type || product.category || 'Store item').replace(/_/g, ' ');
}

function StoreSectionHead({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy?: string }) {
  return (
    <View style={{ gap: 5 }}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow.toUpperCase()}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {copy ? <Text style={styles.sectionCopy}>{copy}</Text> : null}
    </View>
  );
}

function EmptyPanel({ title, copy }: { title: string; copy: string }) {
  return (
    <View style={styles.emptyPanel}>
      <MaterialIcons name="inventory-2" size={20} color="rgba(255,248,237,0.4)" />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyCopy}>{copy}</Text>
    </View>
  );
}

function ProductCard({ product, wide = false }: { product: StoreProductRow; wide?: boolean }) {
  const router = useRouter();
  return (
    <EdPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${productTitle(product)}`}
      onPress={() => router.push(productRoute(product) as any)}
      style={wide ? { width: 220 } : styles.gridCardWrap}
    >
      <View style={styles.productCard}>
        <View style={styles.productArtWrap}>
          {productImage(product) ? (
            <PluggdImage uri={productImage(product)!} style={styles.productArt} />
          ) : (
            <LinearGradient colors={['#2b1c10', '#171009']} style={styles.productArt} />
          )}
        </View>
        <Text style={styles.productType}>{productTypeLabel(product).toUpperCase()}</Text>
        <Text style={styles.productTitle} numberOfLines={2}>{productTitle(product)}</Text>
        <View style={styles.productFootRow}>
          <Text style={styles.productOwner} numberOfLines={1}>
            {product.source === 'store_products' ? 'Official store' : 'Creator shop'}
          </Text>
          <Text style={styles.productPrice}>{productPrice(product)}</Text>
        </View>
      </View>
    </EdPressable>
  );
}

export function MarketStoreScreen() {
  const bottomInset = useBottomChromeInset();
  const router = useRouter();

  const productsQuery = useQuery({
    queryKey: ['store', 'products'],
    queryFn: async () => {
      const [official, merch] = await Promise.all([
        safeList<any>(
          (supabase as any)
            .from('store_products')
            .select('id,title,description,image_url,price,product_type,created_at,is_active,stock_quantity')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(12),
        ),
        safeList<any>(
          (supabase as any)
            .from('creator_merchandise')
            .select('id,title,description,image_url,gallery_images,price,product_type,category,status,created_at,stock_quantity')
            .in('status', ['approved', 'active', 'published', 'live'])
            .order('created_at', { ascending: false })
            .limit(12),
        ),
      ]);
      return [
        ...official.map((item) => ({ ...item, source: 'store_products' as const })),
        ...merch.map((item) => ({ ...item, source: 'creator_merchandise' as const })),
      ] as StoreProductRow[];
    },
    staleTime: 1000 * 60 * 3,
  });

  const packsQuery = useQuery({
    queryKey: ['store', 'sample-packs'],
    queryFn: () =>
      safeList<SamplePackItem>(
        (supabase as any)
          .from('sample_packs')
          .select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
          .order('created_at', { ascending: false })
          .limit(6),
      ),
    staleTime: 1000 * 60 * 3,
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const featured = products[0];
  const dropFocus = products.find((product) => product.id !== featured?.id) || null;
  const creatorShops = products.filter((product) => product.source === 'creator_merchandise');

  const refreshing = productsQuery.isRefetching || packsQuery.isRefetching;
  const refresh = () => {
    void productsQuery.refetch();
    void packsQuery.refetch();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" translucent />
      <DiscoveryHeader />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ed.orange} />}
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomInset,
          paddingHorizontal: 20,
          gap: 30,
        }}
      >
        {/* Hero */}
        <Enter delay={0}>
        <View style={{ gap: 12 }}>
          <Text style={styles.heroKicker}>THE CULTURE SHOP.</Text>
          <Text style={styles.heroTitle}>PLUGGD Store</Text>
          <Text style={styles.heroCopy}>
            Official merch. Creator goods. Exclusive drops. Digital products. Services. Built for the culture.
          </Text>
          <View style={styles.heroCtaRow}>
            <EdPressable accessibilityRole="button" accessibilityLabel="Shop all" onPress={() => router.push('/marketplace' as any)}>
              <View style={styles.heroPrimary}>
                <Text style={styles.heroPrimaryText}>Shop all</Text>
              </View>
            </EdPressable>
            <EdPressable accessibilityRole="button" accessibilityLabel="Open BeatPlug" onPress={() => router.push('/market/beats' as any)}>
              <View style={styles.heroSecondary}>
                <Text style={styles.heroSecondaryText}>BeatPlug</Text>
              </View>
            </EdPressable>
          </View>
          <View style={styles.trustRow}>
            {TRUST_CHIPS.map((chip) => (
              <View key={chip} style={styles.trustChip}>
                <MaterialIcons
                  name={chip === 'Worldwide shipping' ? 'public' : chip === 'Secure payments' ? 'lock-outline' : 'favorite-border'}
                  size={12.5}
                  color="rgba(255,248,237,0.7)"
                />
                <Text style={styles.trustChipText}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>
        </Enter>

        {/* Featured collection */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead eyebrow="Featured collection" title="Worldwide Lookbook" copy="A global uniform for the creators, dreamers and builders shaping what comes next." />
          {productsQuery.isLoading ? (
            <PremiumSkeleton compact label="Loading the culture shop..." />
          ) : featured ? (
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Shop ${productTitle(featured)}`}
              onPress={() => router.push(productRoute(featured) as any)}
            >
              <View style={styles.featuredPanel}>
                {productImage(featured) ? (
                  <PluggdImage uri={productImage(featured)!} style={StyleSheet.absoluteFillObject as any} />
                ) : (
                  <LinearGradient colors={['#31200f', '#12100b']} style={StyleSheet.absoluteFillObject} />
                )}
                <LinearGradient colors={['rgba(10,8,6,0.2)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFillObject} />
                <View style={styles.featuredBody}>
                  <Text style={styles.featuredEyebrow}>FEATURED DROP</Text>
                  <Text style={styles.featuredTitle} numberOfLines={3}>{productTitle(featured).toUpperCase()}</Text>
                  <View style={styles.featuredFootRow}>
                    <Text style={styles.featuredPrice}>{productPrice(featured)}</Text>
                    <View style={styles.shopCollection}>
                      <Text style={styles.shopCollectionText}>Shop collection</Text>
                      <MaterialIcons name="arrow-forward" size={15} color={ed.onOrange} />
                    </View>
                  </View>
                </View>
              </View>
            </EdPressable>
          ) : (
            <EmptyPanel title="No featured merch yet" copy="Approved merch will appear here once it is published." />
          )}
        </View>

        {/* What's Next */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead eyebrow="New drops" title="What's Next" copy="Fresh drops. Limited runs. Don't sleep." />
          {dropFocus ? (
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`View drop ${productTitle(dropFocus)}`}
              onPress={() => router.push(productRoute(dropFocus) as any)}
            >
              <View style={styles.dropFocus}>
                <View style={styles.dropFocusArtWrap}>
                  {productImage(dropFocus) ? (
                    <PluggdImage uri={productImage(dropFocus)!} style={styles.dropFocusArt} />
                  ) : (
                    <LinearGradient colors={['#2b1c10', '#171009']} style={styles.dropFocusArt} />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <Text style={styles.dropFocusEyebrow}>DROP FOCUS</Text>
                  <Text style={styles.dropFocusTitle} numberOfLines={2}>{productTitle(dropFocus)}</Text>
                  <Text style={styles.dropFocusPrice}>{productPrice(dropFocus)}</Text>
                  <View style={styles.viewDrop}>
                    <Text style={styles.viewDropText}>View drop</Text>
                  </View>
                </View>
              </View>
            </EdPressable>
          ) : (
            <EmptyPanel title="Drops coming soon" copy="Limited Store drops will be curated here." />
          )}
        </View>

        {/* Creator shops */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead
            eyebrow="Creator shops"
            title="Official creator storefronts"
            copy="Creator-led shops with approved merch, bundles and direct-to-fan goods."
          />
          {creatorShops.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={232} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
              {creatorShops.slice(0, 6).map((product) => (
                <ProductCard key={`${product.source}-${product.id}`} product={product} wide />
              ))}
            </ScrollView>
          ) : (
            <EmptyPanel
              title="Creator shops are being approved"
              copy="Approved creator merchandise will appear here without duplicating releases or BeatPlug."
            />
          )}
        </View>

        {/* Digital shelf */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead eyebrow="Sample packs & digital goods" title="Digital shelf" />
          {(packsQuery.data ?? []).length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={202} decelerationRate="fast" contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
              {(packsQuery.data ?? []).map((pack) => (
                <EdPressable
                  key={pack.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${pack.title || 'sample pack'}`}
                  onPress={() => router.push(`/sample-pack/${pack.id}` as any)}
                >
                  <View style={{ width: 190, gap: 4 }}>
                    <View style={styles.packArtWrap}>
                      {pack.cover_art_url ? (
                        <PluggdImage uri={pack.cover_art_url} style={styles.packArt} />
                      ) : (
                        <LinearGradient colors={['#2b1c10', '#171009']} style={styles.packArt} />
                      )}
                    </View>
                    <Text style={styles.productType}>SAMPLE PACK</Text>
                    <Text style={styles.productTitle} numberOfLines={1}>{pack.title || 'Sample pack'}</Text>
                    <View style={styles.productFootRow}>
                      <Text style={styles.productOwner} numberOfLines={1}>{pack.genre || 'Digital goods'}</Text>
                      {/* Paid digital packs cannot be bought in the iOS app, so the card
                          must not show a bare price — that reads as a buy affordance and
                          dead-ends at the "Preview only on iPhone" notice. */}
                      <Text style={Number(pack.price ?? 0) > 0 ? styles.productPreviewOnly : styles.productPrice}>
                        {Number(pack.price ?? 0) > 0 ? 'Preview only' : 'Free'}
                      </Text>
                    </View>
                  </View>
                </EdPressable>
              ))}
            </ScrollView>
          ) : (
            <EmptyPanel title="Digital goods coming soon" copy="Sample packs, kits, MIDI collections and digital bundles will appear here." />
          )}
        </View>

        {/* Book talent */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead eyebrow="Services" title="Book talent" />
          <View style={styles.serviceGrid}>
            {SERVICES.map((service) => (
              <EdPressable
                key={service.key}
                accessibilityRole="button"
                accessibilityLabel={`Book ${service.title}`}
                onPress={() => router.push('/search' as any)}
                style={styles.serviceCardWrap}
              >
                <View style={styles.serviceCard}>
                  <MaterialIcons name={service.icon as any} size={20} color={ed.orange} />
                  <Text style={styles.serviceTitle}>{service.title}</Text>
                  <Text style={styles.serviceCopy}>{service.copy}</Text>
                  <View style={styles.serviceFootRow}>
                    <Text style={styles.servicePrice}>{service.price}</Text>
                    <Text style={styles.serviceBook}>Book</Text>
                  </View>
                </View>
              </EdPressable>
            ))}
          </View>
        </View>

        {/* From the scene */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead
            eyebrow="From the scene"
            title="Event merch. Real moments."
            copy="Exclusive gear from the shows, scenes and culture moments fans had to be at."
          />
          <EmptyPanel title="Event merch coming soon" copy="Event-linked products will be curated here." />
        </View>

        {/* Full store grid */}
        <View style={{ gap: 12 }}>
          <StoreSectionHead eyebrow="All store products" title="Browse the full store" />
          {products.length ? (
            <View style={styles.productGrid}>
              {products.slice(0, 10).map((product) => (
                <ProductCard key={`${product.source}-${product.id}`} product={product} />
              ))}
            </View>
          ) : (
            <EmptyPanel title="The shelves are being stocked" copy="Official products and approved creator goods land here as they go live." />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },

  heroKicker: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 2.2, color: ed.orange },
  heroTitle: { fontFamily: 'Sora-ExtraBold', fontSize: 32, lineHeight: 36, letterSpacing: -1.1, color: ed.paper },
  heroCopy: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: 'rgba(255,248,237,0.68)' },
  heroCtaRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  heroPrimary: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPrimaryText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.onOrange },
  heroSecondary: {
    minHeight: 48,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.28)',
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSecondaryText: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.cream },
  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,248,237,0.25)',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  trustChipText: { fontFamily: edFonts.bodyBold, fontSize: 11, color: 'rgba(255,248,237,0.75)' },

  sectionEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2, color: ed.orange },
  sectionTitle: { fontFamily: edFonts.serif, fontSize: 27, lineHeight: 30, color: ed.cream },
  sectionCopy: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, color: 'rgba(255,248,237,0.6)' },

  featuredPanel: { borderRadius: 14, overflow: 'hidden', minHeight: 340, justifyContent: 'flex-end' },
  featuredBody: { padding: 18, gap: 8 },
  featuredEyebrow: { fontFamily: edFonts.mono, fontSize: 10, letterSpacing: 2, color: ed.orange },
  featuredTitle: { fontFamily: edFonts.bodyBlack, fontSize: 32, lineHeight: 33, letterSpacing: -0.8, color: '#ffffff' },
  featuredFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  featuredPrice: { fontFamily: edFonts.bodyBlack, fontSize: 18, color: ed.cream },
  shopCollection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 999,
    backgroundColor: ed.orange,
    paddingHorizontal: 16,
  },
  shopCollectionText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.onOrange },

  dropFocus: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    alignItems: 'center',
  },
  dropFocusArtWrap: { width: 110, height: 110, borderRadius: 10, overflow: 'hidden' },
  dropFocusArt: { width: '100%', height: '100%' },
  dropFocusEyebrow: { fontFamily: edFonts.mono, fontSize: 9, letterSpacing: 1.6, color: ed.orange },
  dropFocusTitle: { fontFamily: edFonts.bodyBold, fontSize: 17, lineHeight: 22, color: ed.cream },
  dropFocusPrice: { fontFamily: edFonts.bodyBlack, fontSize: 14, color: ed.cream },
  viewDrop: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.3)',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  viewDropText: { fontFamily: edFonts.bodyBold, fontSize: 12, color: ed.cream },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCardWrap: { width: '47.5%', flexGrow: 1 },
  productCard: { gap: 3 },
  productArtWrap: { borderRadius: 10, overflow: 'hidden' },
  productArt: { width: '100%', height: 160 },
  productType: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.4, color: ed.orange, marginTop: 6 },
  productTitle: { fontFamily: edFonts.bodyBold, fontSize: 14.5, lineHeight: 19, color: ed.cream },
  productFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 },
  productOwner: { flex: 1, fontFamily: edFonts.bodyMedium, fontSize: 11.5, color: 'rgba(255,248,237,0.55)' },
  productPrice: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.cream },
  productPreviewOnly: { fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 0.4, color: ed.creamMuted },

  packArtWrap: { borderRadius: 10, overflow: 'hidden' },
  packArt: { width: '100%', height: 130 },

  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCardWrap: { width: '47.5%', flexGrow: 1 },
  serviceCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    gap: 6,
    minHeight: 150,
  },
  serviceTitle: { fontFamily: edFonts.bodyBlack, fontSize: 14.5, color: ed.cream, marginTop: 2 },
  serviceCopy: { fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16, color: 'rgba(255,248,237,0.6)', flex: 1 },
  serviceFootRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  servicePrice: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.cream },
  serviceBook: { fontFamily: edFonts.bodyBlack, fontSize: 12.5, color: ed.orange },

  emptyPanel: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,248,237,0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 20,
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: { fontFamily: edFonts.bodyBlack, fontSize: 15.5, color: ed.cream, textAlign: 'center', marginTop: 4 },
  emptyCopy: { fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18, color: 'rgba(255,248,237,0.56)', textAlign: 'center', maxWidth: 300 },
});
