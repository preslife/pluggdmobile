import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic } from '../../src/design/haptics';
import { supabase } from '../../src/lib/supabase';
import { formatGBP } from '../../src/lib/mobileContent';
import { openHostedCheckout, reconcileHostedCheckout, useCommercePolicy } from '../../src/commerce/policy';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { physicalBasketCount, usePhysicalBasketStore } from '../../src/features/store/physicalBasket';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { useAuth } from '../../src/context/AuthProvider';

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
  options: ProductOption[];
};

type ProductOption = {
  id: string;
  option_type: string;
  option_value: string;
  price_modifier: number | null;
  stock_quantity: number | null;
};

type ProductOptionChoice = {
  key: string;
  label: string;
  option: ProductOption;
};

function optionValueTokens(value: string) {
  const tokens = value.split(',').map((token) => token.trim()).filter(Boolean);
  return tokens.length ? tokens : [value.trim()].filter(Boolean);
}

function optionChoiceOrder(type: string, left: ProductOptionChoice, right: ProductOptionChoice) {
  if (type.trim().toLowerCase() !== 'size') return left.label.localeCompare(right.label, undefined, { numeric: true });
  const order = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl'];
  const leftRank = order.indexOf(left.label.toLowerCase());
  const rightRank = order.indexOf(right.label.toLowerCase());
  if (leftRank >= 0 || rightRank >= 0) return (leftRank < 0 ? order.length : leftRank) - (rightRank < 0 ? order.length : rightRank);
  return left.label.localeCompare(right.label, undefined, { numeric: true });
}

async function loadProductDetail(id: string, source: ProductSource): Promise<ProductDetail | null> {
  if (source === 'creator_merchandise') {
    const { data, error } = await (supabase as any)
      .from('creator_merchandise')
      .select('id,title,description,image_url,gallery_images,price,product_type,requires_shipping,stock_quantity,status')
      .eq('id', id)
      .in('status', ['approved', 'active', 'published', 'live'])
      .maybeSingle();
    if (error || !data) return null;
    return { ...data, source, options: [] };
  }

  const [productResult, optionsResult, imagesResult] = await Promise.all([
    (supabase as any)
      .from('store_products')
      .select('id,title,description,image_url,price,product_type,stock_quantity,is_active,visibility,moderation_status,currency')
      .eq('id', id)
      .eq('is_active', true)
      .eq('visibility', 'public')
      .eq('moderation_status', 'approved')
      .maybeSingle(),
    (supabase as any)
      .from('product_options')
      .select('id,option_type,option_value,price_modifier,stock_quantity')
      .eq('product_id', id)
      .order('option_type', { ascending: true })
      .order('option_value', { ascending: true }),
    (supabase as any)
      .from('product_images')
      .select('image_url,display_order')
      .eq('product_id', id)
      .order('display_order', { ascending: true }),
  ]);
  const { data, error } = productResult;
  if (error || !data) return null;
  if (optionsResult.error) throw optionsResult.error;
  if (imagesResult.error) throw imagesResult.error;
  return {
    ...data,
    source,
    options: optionsResult.data ?? [],
    gallery_images: (imagesResult.data ?? []).map((row: { image_url?: string | null }) => row.image_url).filter(Boolean),
  };
}

function productKindLabel(product: ProductDetail) {
  return (product.product_type || (product.source === 'creator_merchandise' ? 'Creator merch' : 'Store product')).replace(/_/g, ' ');
}

export default function ProductDetailRoute() {
  const theme = usePluggdTheme();
  const styles = useProductStyles();
  const bottomInset = useBottomChromeInset();
  const { id, source } = useLocalSearchParams<{ id: string; source?: ProductSource }>();
  const router = useRouter();
  const { user } = useAuth();
  const productSource: ProductSource = source === 'creator_merchandise' ? 'creator_merchandise' : 'store_products';
  const query = useQuery({
    queryKey: ['culture', 'product-detail', productSource, id],
    queryFn: () => loadProductDetail(String(id), productSource),
    enabled: Boolean(id),
  });
  const product = query.data;
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const basketLines = usePhysicalBasketStore((state) => state.lines);
  const addBasketLine = usePhysicalBasketStore((state) => state.addLine);
  const basketCount = useMemo(() => physicalBasketCount(basketLines), [basketLines]);
  const gallery = useMemo(
    () => [...new Set([product?.image_url, ...(product?.gallery_images ?? [])].filter((value): value is string => Boolean(value)))],
    [product?.gallery_images, product?.image_url],
  );
  const image = gallery[activeImageIndex] ?? gallery[0] ?? null;
  const productType = String(product?.product_type || '').toLowerCase();
  const isPhysical = Boolean(product) && (
    product?.source === 'creator_merchandise'
      ? product.requires_shipping === true
      : ['physical', 'merchandise', 'merch', 'creator_merch'].includes(productType)
  );
  const policy = useCommercePolicy(product ? {
    kind: 'physical_merch',
    itemId: product.id,
    optionId: product.source,
    classification: isPhysical ? 'physical' : 'digital',
  } : null);

  const optionGroups = useMemo(() => {
    const groups = (product?.options ?? []).reduce<Record<string, ProductOptionChoice[]>>((result, option) => {
      const type = option.option_type.trim();
      if (!type) return result;
      const choices = optionValueTokens(option.option_value).map((label) => ({
        key: `${option.id}:${label.toLocaleLowerCase('en-GB')}`,
        label,
        option,
      }));
      result[type] = [...(result[type] ?? []), ...choices];
      return result;
    }, {});
    Object.entries(groups).forEach(([type, choices]) => choices.sort((left, right) => optionChoiceOrder(type, left, right)));
    return groups;
  }, [product?.options]);
  const requiredOptionTypes = Object.keys(optionGroups);
  const optionsComplete = requiredOptionTypes.every((type) => Boolean(selectedOptions[type]));
  const selectedOptionRows = requiredOptionTypes
    .map((type) => optionGroups[type].find((choice) => choice.label === selectedOptions[type])?.option)
    .filter((option): option is ProductOption => Boolean(option));
  const selectedStockLimits = selectedOptionRows
    .map((option) => option.stock_quantity)
    .filter((stock): stock is number => stock != null && Number.isFinite(Number(stock)))
    .map(Number);
  const productStock = Number(product?.stock_quantity ?? 4);
  const maxQuantity = Math.max(1, Math.min(productStock, ...selectedStockLimits, 4));
  const displayPrice = Number(product?.price ?? 0) + selectedOptionRows.reduce((total, option) => total + Number(option.price_modifier ?? 0), 0);
  const inStock = Number(product?.stock_quantity ?? 1) > 0;
  const hasPurchasableConfiguration = requiredOptionTypes.every((type) =>
    optionGroups[type].some((choice) => choice.option.stock_quantity !== 0),
  );
  const canAddToBasket = optionsComplete && hasPurchasableConfiguration;
  const canOpenPhysicalFlow = Boolean(product) && isPhysical && inStock && (
    product?.source === 'store_products' || policy.permittedRail === 'stripe_checkout'
  );

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQuantity));
    setAdded(false);
  }, [maxQuantity, selectedOptions]);

  useEffect(() => setActiveImageIndex(0), [product?.id]);

  useEffect(() => {
    let active = true;
    if (!user?.id || !product?.id) {
      setWishlisted(false);
      return () => { active = false; };
    }
    void (supabase as any)
      .from('wishlists')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .maybeSingle()
      .then(({ data }: { data: { id?: string } | null }) => {
        if (active) setWishlisted(Boolean(data?.id));
      });
    return () => { active = false; };
  }, [product?.id, user?.id]);

  const purchase = async () => {
    if (!product || product.source !== 'creator_merchandise' || buying || policy.permittedRail !== 'stripe_checkout') return;
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

  const addToBasket = () => {
    if (!product || product.source !== 'store_products' || !canAddToBasket || Number(product.stock_quantity ?? 1) <= 0) return;
    impactHaptic();
    const result = addBasketLine({
      productId: product.id,
      title: product.title,
      imageUrl: image,
      unitPrice: displayPrice,
      productType: product.product_type || 'physical',
      stockQuantity: Math.min(productStock, ...selectedStockLimits),
      selectedOptions,
    }, quantity);
    if (result === 'line_limit') {
      Alert.alert('Basket is full', 'Check out or remove an item before adding another product.');
      return;
    }
    if (result === 'sold_out') {
      Alert.alert('Item unavailable', 'This option is no longer in stock.');
      return;
    }
    setAdded(true);
  };

  const toggleWishlist = async () => {
    if (!product || wishlistBusy) return;
    if (!user?.id) {
      Alert.alert('Sign in to save this item', 'Your wishlist stays connected to your PLUGGD account.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push({ pathname: '/auth/login', params: { redirect: `/product/${product.id}?source=${product.source}` } } as never) },
      ]);
      return;
    }
    setWishlistBusy(true);
    try {
      const request = wishlisted
        ? (supabase as any).from('wishlists').delete().eq('user_id', user.id).eq('product_id', product.id)
        : (supabase as any).from('wishlists').insert({ user_id: user.id, product_id: product.id, product_title: product.title });
      const { error } = await request;
      if (error) throw error;
      impactHaptic();
      setWishlisted((current) => !current);
    } catch {
      Alert.alert('Wishlist not updated', 'Please check your connection and try again.');
    } finally {
      setWishlistBusy(false);
    }
  };

  const wishlistButton = product ? (
    <Pressable accessibilityRole="button" accessibilityLabel={wishlisted ? `Remove ${product.title} from wishlist` : `Save ${product.title} to wishlist`} accessibilityState={{ busy: wishlistBusy }} disabled={wishlistBusy} style={styles.wishlistButton} onPress={() => void toggleWishlist()}>
      {wishlistBusy ? <ActivityIndicator color={theme.colors.text} /> : <MaterialIcons name={wishlisted ? 'favorite' : 'favorite-border'} size={19} color={theme.colors.text} />}
      <Text style={styles.wishlistButtonText}>{wishlisted ? 'Saved to wishlist' : 'Save to wishlist'}</Text>
    </Pressable>
  ) : null;

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/market' as any))}>
          <MaterialIcons name="chevron-left" size={28} color={theme.colors.text} />
        </Pressable>

        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.accentFill} />
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
            onSecondary={() => (router.canGoBack() ? router.back() : router.replace('/market' as any))}
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
                  {product.price != null ? formatGBP(displayPrice) : 'Price pending'}
                  {product.stock_quantity != null ? ` · ${product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Sold out'}` : ''}
                </Text>
              </View>
            </View>

            {gallery.length > 1 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRail}>
                {gallery.map((uri, index) => (
                  <Pressable key={uri} accessibilityRole="button" accessibilityLabel={`View product image ${index + 1} of ${gallery.length}`} accessibilityState={{ selected: index === activeImageIndex }} onPress={() => setActiveImageIndex(index)} style={[styles.galleryThumb, index === activeImageIndex && styles.galleryThumbActive]}>
                    <PluggdImage uri={uri} style={styles.galleryThumbImage} />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

            <View style={styles.actions}>
              {canOpenPhysicalFlow ? (
                <>
                  {requiredOptionTypes.length ? (
                    <View style={styles.optionsPanel}>
                      {requiredOptionTypes.map((type) => (
                        <View key={type} style={styles.optionGroup}>
                          <Text style={styles.availabilityLabel}>{type.toUpperCase()}</Text>
                          <View style={styles.optionChoices}>
                            {optionGroups[type].map((choice) => {
                              const selected = selectedOptions[type] === choice.label;
                              const soldOut = choice.option.stock_quantity === 0;
                              return (
                                <Pressable
                                  key={choice.key}
                                  accessibilityRole="button"
                                  accessibilityLabel={`${type} ${choice.label}${soldOut ? ', sold out' : ''}`}
                                  accessibilityState={{ selected, disabled: soldOut }}
                                  disabled={soldOut}
                                  style={[styles.optionChoice, selected && styles.optionChoiceSelected, soldOut && styles.optionChoiceDisabled]}
                                  onPress={() => setSelectedOptions((current) => ({ ...current, [type]: choice.label }))}
                                >
                                  <Text style={[styles.optionChoiceText, selected && styles.optionChoiceTextSelected]}>{choice.label}</Text>
                                  {soldOut ? <Text style={styles.optionChoiceStatus}>Not in stock</Text> : null}
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  {!hasPurchasableConfiguration ? (
                    <View style={styles.availability}>
                      <Text style={styles.availabilityLabel}>NOT IN STOCK</Text>
                      <Text style={styles.availabilityTitle}>This item is not available right now.</Text>
                      <Text style={styles.availabilityBody}>Save it to your wishlist and check back when the creator restocks it.</Text>
                      {wishlistButton}
                    </View>
                  ) : null}
                  {hasPurchasableConfiguration ? <><View style={styles.fulfilmentPanel}>
                    <View style={styles.fulfilmentCopy}>
                      <Text style={styles.availabilityLabel}>FULFILMENT</Text>
                      <Text style={styles.fulfilmentTitle}>{product.requires_shipping === false ? 'Collection or delivery confirmed at checkout' : 'Physical delivery'}</Text>
                      <Text style={styles.availabilityBody}>Destination, shipping charges and the final total are shown for review before payment.</Text>
                    </View>
                    <View style={styles.stockBadge}>
                      <MaterialIcons name="inventory-2" size={16} color={theme.colors.accentText} />
                      <Text style={styles.stockText}>{product.stock_quantity == null ? 'Stock checked live' : `${product.stock_quantity} available`}</Text>
                    </View>
                  </View>
                  <View style={styles.purchasePanel}>
                    <View>
                      <Text style={styles.availabilityLabel}>QUANTITY</Text>
                      <Text style={styles.availabilityBody}>Maximum {maxQuantity} per order</Text>
                    </View>
                    <View style={styles.quantityControl}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Decrease quantity" accessibilityState={{ disabled: quantity <= 1 }} disabled={quantity <= 1} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.max(1, value - 1))}>
                        <MaterialIcons name="remove" size={19} color={theme.colors.text} />
                      </Pressable>
                      <Text accessibilityLabel={`Quantity ${quantity}`} style={styles.quantityValue}>{quantity}</Text>
                      <Pressable accessibilityRole="button" accessibilityLabel="Increase quantity" accessibilityState={{ disabled: quantity >= maxQuantity }} disabled={quantity >= maxQuantity} style={styles.quantityButton} onPress={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}>
                        <MaterialIcons name="add" size={19} color={theme.colors.text} />
                      </Pressable>
                    </View>
                  </View>
                  {product.source === 'store_products' ? (<>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Add ${quantity} ${product.title} to basket`} accessibilityState={{ disabled: !canAddToBasket }} disabled={!canAddToBasket} style={[styles.primaryButton, !canAddToBasket && styles.primaryButtonDisabled]} onPress={addToBasket}>
                      <Text style={styles.primaryText}>{added ? 'Added to basket' : 'Add to basket'}</Text>
                      <MaterialIcons name={added ? 'check' : 'shopping-bag'} size={19} color={theme.colors.onAccent} />
                    </Pressable>
                    <Pressable accessibilityRole="button" accessibilityLabel={`View basket with ${basketCount} items`} style={styles.basketButton} onPress={() => router.push('/commerce/basket' as any)}>
                      <Text style={styles.basketButtonText}>View basket{basketCount ? ` (${basketCount})` : ''}</Text>
                      <MaterialIcons name="arrow-forward" size={18} color={theme.colors.text} />
                    </Pressable>
                    <Text style={styles.checkoutNote}>Pricing, selected options and availability are confirmed before secure checkout.</Text>
                  </>) : (<>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Continue to secure checkout for ${quantity} ${product.title}`} accessibilityState={{ busy: buying }} disabled={buying} style={styles.primaryButton} onPress={purchase}>
                      {buying ? <ActivityIndicator color={theme.colors.onAccent} /> : <>
                        <Text style={styles.primaryText}>Continue securely</Text>
                        <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
                      </>}
                    </Pressable>
                    <Text style={styles.checkoutNote}>Shipping charges and the final total are shown before payment. Availability is confirmed before checkout.</Text>
                  </>)}</> : null}
                </>
              ) : (
                <View style={styles.availability}>
                  <Text style={styles.availabilityLabel}>{isPhysical && Number(product.stock_quantity ?? 1) <= 0 ? 'SOLD OUT' : isPhysical ? 'CHECKOUT STATUS' : 'BROWSE ONLY'}</Text>
                  <Text style={styles.availabilityTitle}>
                    {!isPhysical
                      ? 'Digital products are preview-only on iPhone.'
                      : Number(product.stock_quantity ?? 1) <= 0
                        ? 'This item is currently sold out.'
                        : policy.loading
                          ? 'Checking availability…'
                          : 'Checkout is temporarily unavailable.'}
                  </Text>
                  <Text style={styles.availabilityBody}>
                    {!isPhysical
                      ? 'Credits cannot be used for this product.'
                      : Number(product.stock_quantity ?? 1) <= 0
                        ? 'Return to the Store to see what is available now.'
                        : 'Try again in a moment. Your basket and account have not been charged.'}
                  </Text>
                  {isPhysical && Number(product.stock_quantity ?? 1) > 0 && !policy.loading ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Retry checkout availability" style={styles.retryButton} onPress={() => void policy.refresh()}>
                      <MaterialIcons name="refresh" size={18} color={theme.colors.onAccent} />
                      <Text style={styles.retryButtonText}>Try again</Text>
                    </Pressable>
                  ) : null}
                  {isPhysical && Number(product.stock_quantity ?? 1) <= 0 ? wishlistButton : null}
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share product"
                style={styles.secondaryButton}
                onPress={() => Share.share({ message: `PLUGGD store: ${product.title}` })}
              >
                <MaterialIcons name="ios-share" size={20} color={theme.colors.text} />
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function useProductStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: 16, paddingTop: 54, paddingBottom: 170 },
  backButton: { width: 44, height: 44, borderRadius: 5, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 24 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 430, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.colors.artworkBase, justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroCopy: { padding: 18 },
  galleryRail: { gap: 9, paddingTop: 10, paddingRight: 10 },
  galleryThumb: { width: 66, height: 78, borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  galleryThumbActive: { borderWidth: 2, borderColor: theme.colors.accentFill },
  galleryThumbImage: { width: '100%', height: '100%' },
  eyebrow: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: theme.colors.mediaText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 38, marginTop: 6 },
  subtitle: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.mediaTextMuted, fontSize: 14, fontWeight: '800', marginTop: 7 },
  description: { fontFamily: pluggdFonts.satoshiBold, color: theme.colors.textSecondary, fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 16 },
  actions: { gap: 10, marginTop: 18 },
  availability: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, paddingVertical: 16 },
  availabilityLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  availabilityTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23, marginTop: 6 },
  availabilityBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, marginTop: 5 },
  retryButton: { minHeight: 44, alignSelf: 'flex-start', marginTop: 12, paddingHorizontal: 14, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', gap: 7 },
  retryButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  purchasePanel: { minHeight: 72, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fulfilmentPanel: { minHeight: 92, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  fulfilmentCopy: { flex: 1, minWidth: 0 },
  fulfilmentTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, marginTop: 5 },
  stockBadge: { maxWidth: 112, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 4, paddingHorizontal: 9, paddingVertical: 8, alignItems: 'center', gap: 4 },
  stockText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, lineHeight: 13, textAlign: 'center' },
  optionsPanel: { borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 16, gap: 18 },
  optionGroup: { gap: 9 },
  optionChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChoice: { minHeight: 52, minWidth: 62, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, gap: 2 },
  optionChoiceSelected: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  optionChoiceDisabled: { opacity: 0.35 },
  optionChoiceText: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, textTransform: 'capitalize' },
  optionChoiceTextSelected: { color: theme.colors.onAccent },
  optionChoiceStatus: { color: theme.colors.textMuted, fontSize: 8, fontFamily: pluggdFonts.satoshiBold },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quantityButton: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  quantityValue: { width: 38, color: theme.colors.text, textAlign: 'center', fontSize: 16, fontFamily: pluggdFonts.displayBold },
  primaryButton: { minHeight: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  basketButton: { minHeight: 52, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  basketButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  wishlistButton: { minHeight: 48, alignSelf: 'stretch', marginTop: 12, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wishlistButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  checkoutNote: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  secondaryButton: { width: 52, minHeight: 52, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  }), [theme]);
}
