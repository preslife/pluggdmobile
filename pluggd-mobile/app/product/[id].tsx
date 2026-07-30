import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic } from '../../src/design/haptics';
import { supabase } from '../../src/lib/supabase';
import { formatGBP } from '../../src/lib/mobileContent';
import { openHostedCheckout, reconcileHostedCheckout, useCommercePolicy } from '../../src/commerce/policy';

const ORANGE = '#ff6600';

type ProductSource = 'store_products' | 'creator_merchandise';

type ProductDetail = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  gallery_images?: string[] | null;
  price: number | null;
  product_type: string | null;
  requires_shipping?: boolean | null;
  stock_quantity?: number | null;
  source: ProductSource;
};

async function loadProductDetail(id: string, source: ProductSource): Promise<ProductDetail | null> {
  if (source === 'creator_merchandise') {
    const { data, error } = await (supabase as any)
      .from('creator_merchandise')
      .select('id,title,description,image_url,gallery_images,price,product_type,requires_shipping,stock_quantity,status')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return { ...data, source };
  }

  const { data, error } = await (supabase as any)
    .from('store_products')
    .select('id,title,description,image_url,price,product_type,stock_quantity,is_active')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return null;
  return { ...data, source };
}

function productKindLabel(product: ProductDetail) {
  return (product.product_type || (product.source === 'creator_merchandise' ? 'Creator merch' : 'Store product')).replace(/_/g, ' ');
}

export default function ProductDetailRoute() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: ProductSource }>();
  const router = useRouter();
  const productSource: ProductSource = source === 'creator_merchandise' ? 'creator_merchandise' : 'store_products';
  const query = useQuery({
    queryKey: ['culture', 'product-detail', productSource, id],
    queryFn: () => loadProductDetail(String(id), productSource),
    enabled: Boolean(id),
  });
  const product = query.data;
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const image = product?.image_url || product?.gallery_images?.[0] || null;
  const productType = String(product?.product_type || '').toLowerCase();
  const isPhysical = Boolean(product) && (
    product?.source === 'creator_merchandise'
      ? product.requires_shipping !== false
      : ['physical', 'merchandise'].includes(productType)
  );
  const policy = useCommercePolicy(product ? {
    kind: 'physical_merch',
    itemId: product.id,
    optionId: product.source,
    classification: isPhysical ? 'physical' : 'digital',
  } : null);

  const maxQuantity = Math.max(1, Math.min(Number(product?.stock_quantity ?? 4), 4));

  const purchase = async () => {
    if (!product || buying || policy.permittedRail !== 'stripe_checkout') return;
    impactHaptic();
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-merch-checkout', {
        body: {
          productId: product.id,
          productSource: product.source,
          quantity,
          storefront: policy.storefront,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          returnUrl: 'pluggd://commerce/success',
        },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      const checkoutUrl = String(response.checkoutUrl ?? response.checkout_url ?? response.url ?? '');
      const sessionId = typeof (response.sessionId ?? response.session_id) === 'string'
        ? String(response.sessionId ?? response.session_id)
        : null;
      const checkout = await openHostedCheckout(checkoutUrl, {
        reconcile: async () => (await reconcileHostedCheckout({
          kind: 'physical_merch',
          sessionId,
          itemId: product.id,
        })).state,
      });
      router.push({
        pathname: '/commerce/success',
        params: {
          kind: 'physical_merch',
          status: checkout.state,
          sessionId: sessionId ?? '',
          itemId: product.id,
        },
      } as any);
    } catch (error) {
      Alert.alert('Checkout unavailable', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBuying(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ORANGE} />
          </View>
        ) : null}

        {!query.isLoading && !product ? (
          <RecoveryState
            eyebrow="SOLD OUT OR ARCHIVED"
            title="This item has left the store"
            body="The creator may have sold through, paused the listing or replaced it. Browse what is currently available."
            icon="storefront"
            primaryLabel="Explore market"
            onPrimary={() => router.replace('/market' as any)}
            secondaryLabel="Go back"
            onSecondary={() => router.back()}
          />
        ) : null}

        {product ? (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#21140D', '#171310', '#0a0806']} style={StyleSheet.absoluteFillObject} />
              {image ? <PluggdImage uri={image} style={styles.heroImage} /> : null}
              <LinearGradient colors={['transparent', 'rgba(10,8,6,0.9)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>{productKindLabel(product)}</Text>
                <Text style={styles.title} numberOfLines={3}>{product.title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {product.price != null ? formatGBP(product.price) : 'Price pending'}
                  {product.stock_quantity != null ? ` · ${product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Sold out'}` : ''}
                </Text>
              </View>
            </View>

            {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

            <View style={styles.actions}>
              {policy.permittedRail === 'stripe_checkout' && isPhysical && Number(product.stock_quantity ?? 1) > 0 ? (
                <>
                  <View style={styles.purchasePanel}>
                    <View>
                      <Text style={styles.availabilityLabel}>QUANTITY</Text>
                      <Text style={styles.availabilityBody}>Maximum {maxQuantity} per order</Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: quantity <= 1 }} disabled={quantity <= 1} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.max(1, value - 1))}>
                        <MaterialIcons name="remove" size={19} color="#FFF" />
                      </Pressable>
                      <Text accessibilityLabel={`Quantity ${quantity}`} style={styles.quantityValue}>{quantity}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: quantity >= maxQuantity }} disabled={quantity >= maxQuantity} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}>
                        <MaterialIcons name="add" size={19} color="#FFF" />
                      </Pressable>
                    </View>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Continue to secure checkout for ${quantity} ${product.title}`} accessibilityState={{ busy: buying }} disabled={buying} style={styles.primaryButton} onPress={purchase}>
                    {buying ? <ActivityIndicator color="#0A0806" /> : <>
                      <Text style={styles.primaryText}>Continue securely</Text>
                      <MaterialIcons name="arrow-forward" size={19} color="#0A0806" />
                    </>}
                  </Pressable>
                  <Text style={styles.checkoutNote}>Shipping, taxes and the final total are shown before payment. Inventory is verified on the server.</Text>
                </>
              ) : (
                <View style={styles.availability}>
                  <Text style={styles.availabilityLabel}>{isPhysical ? 'PURCHASE UNAVAILABLE' : 'BROWSE ONLY'}</Text>
                  <Text style={styles.availabilityTitle}>
                    {!isPhysical ? 'Digital products are preview-only on iPhone.' : policy.loading ? 'Checking purchase availability…' : policy.reason}
                  </Text>
                  <Text style={styles.availabilityBody}>
                    {!isPhysical ? 'Credits cannot be used for this product.' : 'No checkout control is shown until product classification, storefront and inventory are all verified.'}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share product"
                style={styles.secondaryButton}
                onPress={() => Share.share({ message: `PLUGGD store: ${product.title}` })}
              >
                <MaterialIcons name="ios-share" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0806' },
  content: { padding: 16, paddingTop: 54, paddingBottom: 170 },
  backButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: '#171310', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 24 },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 430, borderRadius: 6, overflow: 'hidden', backgroundColor: '#171310', justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroCopy: { padding: 18 },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 38, marginTop: 6 },
  subtitle: { fontFamily: pluggdFonts.satoshiBold, color: '#B3B3B3', fontSize: 14, fontWeight: '800', marginTop: 7 },
  description: { fontFamily: pluggdFonts.satoshiBold, color: '#E4E4E9', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 16 },
  actions: { gap: 10, marginTop: 18 },
  availability: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3B3028', paddingVertical: 16 },
  availabilityLabel: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  availabilityTitle: { color: '#FFF', fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23, marginTop: 6 },
  availabilityBody: { color: '#98918B', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, marginTop: 5 },
  purchasePanel: { minHeight: 72, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#3B3028', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quantityButton: { width: 44, height: 44, borderWidth: 1, borderColor: '#443C36', alignItems: 'center', justifyContent: 'center' },
  quantityValue: { width: 38, color: '#FFF', textAlign: 'center', fontSize: 16, fontFamily: pluggdFonts.displayBold },
  primaryButton: { minHeight: 54, borderRadius: 5, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  checkoutNote: { color: '#77706A', fontFamily: pluggdFonts.satoshiMedium, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  secondaryButton: { width: 52, minHeight: 52, borderRadius: 5, borderWidth: 1, borderColor: '#54463C', alignItems: 'center', justifyContent: 'center' },
});
