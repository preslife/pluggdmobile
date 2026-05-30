import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic } from '../../src/design/haptics';
import { supabase } from '../../src/lib/supabase';
import { formatGBP } from '../../src/lib/mobileContent';

const ORANGE = '#FF5A00';

type ProductSource = 'store_products' | 'creator_merchandise';

type ProductDetail = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  gallery_images?: string[] | null;
  price: number | null;
  product_type: string | null;
  stock_quantity?: number | null;
  source: ProductSource;
};

async function loadProductDetail(id: string, source: ProductSource): Promise<ProductDetail | null> {
  if (source === 'creator_merchandise') {
    const { data, error } = await (supabase as any)
      .from('creator_merchandise')
      .select('id,title,description,image_url,gallery_images,price,product_type,stock_quantity,status')
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
  const image = product?.image_url || product?.gallery_images?.[0] || null;

  const purchase = () => {
    impactHaptic();
    Alert.alert(
      'Checkout coming soon',
      'Save this product or check back later for purchase options.',
      [
        { text: 'Open Wallet', onPress: () => router.push('/wallet' as any) },
        { text: 'OK', style: 'cancel' },
      ],
    );
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
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Product unavailable</Text>
            <Text style={styles.emptyText}>This store item is unavailable or has been removed.</Text>
          </View>
        ) : null}

        {product ? (
          <>
            <View style={styles.hero}>
              <LinearGradient colors={['#21140D', '#12121A', '#08080C']} style={StyleSheet.absoluteFillObject} />
              {image ? <PluggdImage uri={image} style={styles.heroImage} /> : null}
              <LinearGradient colors={['transparent', 'rgba(8,8,12,0.9)']} style={StyleSheet.absoluteFillObject} />
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
              <Pressable accessibilityRole="button" accessibilityLabel="Product purchase status" style={styles.primaryButton} onPress={purchase}>
                <Text style={styles.primaryText}>Purchase status</Text>
              </Pressable>
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
  screen: { flex: 1, backgroundColor: '#08080C' },
  content: { padding: 16, paddingTop: 54, paddingBottom: 170 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  loading: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 420, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 24 },
  emptyText: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  hero: { height: 430, borderRadius: 24, overflow: 'hidden', backgroundColor: '#12121A', borderWidth: 1, borderColor: '#262626', justifyContent: 'flex-end' },
  heroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  heroCopy: { padding: 18 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 34, lineHeight: 38, marginTop: 6 },
  subtitle: { color: '#B3B3B3', fontSize: 14, fontWeight: '800', marginTop: 7 },
  description: { color: '#E4E4E9', fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 25, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#08080C', fontFamily: 'Satoshi-Black', fontSize: 15 },
  secondaryButton: { width: 52, minHeight: 50, borderRadius: 25, backgroundColor: '#151515', borderWidth: 1, borderColor: '#262626', alignItems: 'center', justifyContent: 'center' },
});
