import { supabase } from '../../lib/supabase';

export type StudioStoreProduct = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  productType: string;
  visibility: 'public' | 'hidden' | 'archived';
  isActive: boolean;
  moderationStatus: string;
  stockQuantity: number | null;
  salesCount: number;
  submissionStatus: string | null;
};

export type StudioMembershipTier = {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  priceMonthly: number | null;
  priceYearly: number | null;
  currency: string;
  currentMembers: number;
  maxMembers: number | null;
  syncStatus: string;
};

export type StudioSamplePack = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  pricePence: number;
  genre: string;
  sampleCount: number;
  downloads: number;
  approvalStatus: string;
  isActive: boolean;
};

export type StudioCommerceWorkspace = {
  userId: string;
  profileId: string;
  products: StudioStoreProduct[];
  memberships: StudioMembershipTier[];
  packs: StudioSamplePack[];
};

async function currentOwner() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error('Sign in with a creator account to manage commerce.');
  const { data: profile, error: profileError } = await (supabase as any)
    .from('profiles')
    .select('id,user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile?.id || profile.user_id !== userId) throw new Error('Complete your creator profile before managing commerce.');
  return { userId, profileId: profile.id as string };
}

function mapProduct(row: any, submissions: Map<string, string>): StudioStoreProduct {
  return {
    id: String(row.id),
    title: row.title || 'Untitled product',
    description: row.description || '',
    imageUrl: row.image_url || null,
    price: Number(row.price || 0),
    currency: row.currency || 'GBP',
    productType: row.product_type || 'product',
    visibility: row.visibility || 'hidden',
    isActive: Boolean(row.is_active),
    moderationStatus: row.moderation_status || 'pending',
    stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
    salesCount: Number(row.sales_count || 0),
    submissionStatus: submissions.get(String(row.id)) || null,
  };
}

function mapMembership(row: any): StudioMembershipTier {
  return {
    id: String(row.id),
    name: row.name || 'Untitled tier',
    description: row.description || '',
    status: row.status || 'draft',
    priceMonthly: row.price_monthly == null ? null : Number(row.price_monthly),
    priceYearly: row.price_yearly == null ? null : Number(row.price_yearly),
    currency: row.currency || 'GBP',
    currentMembers: Number(row.current_members || 0),
    maxMembers: row.max_members == null ? null : Number(row.max_members),
    syncStatus: row.stripe_sync_status || 'pending',
  };
}

function mapPack(row: any): StudioSamplePack {
  return {
    id: String(row.id),
    title: row.title || 'Untitled pack',
    description: row.description || '',
    imageUrl: row.cover_art_url || null,
    pricePence: Number(row.price_pence ?? Math.round(Number(row.price || 0) * 100)),
    genre: row.genre || '',
    sampleCount: Number(row.sample_count || 0),
    downloads: Number(row.total_downloads || 0),
    approvalStatus: row.approval_status || 'pending',
    isActive: Boolean(row.is_active),
  };
}

export async function loadStudioCommerceWorkspace(): Promise<StudioCommerceWorkspace> {
  const { userId, profileId } = await currentOwner();
  const [productsResult, submissionsResult, membershipsResult, packsResult] = await Promise.all([
    (supabase as any).from('store_products').select('id,title,description,price,product_type,image_url,is_active,stock_quantity,currency,visibility,sales_count,moderation_status,creator_id,owner_type,updated_at').eq('creator_id', userId).order('updated_at', { ascending: false }).limit(100),
    (supabase as any).from('store_submissions').select('id,product_id,status,creator_id,updated_at').eq('creator_id', userId).eq('product_source', 'store_product').order('updated_at', { ascending: false }).limit(100),
    (supabase as any).from('membership_tiers').select('id,owner_type,owner_id,name,description,status,price_monthly,price_yearly,currency,current_members,max_members,stripe_sync_status,tier_order').eq('owner_type', 'profile').eq('owner_id', profileId).order('tier_order', { ascending: true }).limit(100),
    (supabase as any).from('sample_packs').select('id,user_id,title,description,cover_art_url,price,price_pence,genre,sample_count,total_downloads,approval_status,is_active,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(100),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (submissionsResult.error) throw submissionsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;
  if (packsResult.error) throw packsResult.error;
  const submissions = new Map<string, string>();
  for (const row of submissionsResult.data || []) {
    if (row.creator_id !== userId || submissions.has(String(row.product_id))) continue;
    submissions.set(String(row.product_id), String(row.status));
  }
  return {
    userId,
    profileId,
    products: (productsResult.data || []).map((row: any) => mapProduct(row, submissions)),
    memberships: (membershipsResult.data || []).map(mapMembership),
    packs: (packsResult.data || []).map(mapPack),
  };
}

export async function submitStoreProductForReview(productId: string) {
  const { userId } = await currentOwner();
  const { data: product, error: productError } = await (supabase as any)
    .from('store_products')
    .select('id,creator_id,owner_type,visibility')
    .eq('id', productId)
    .eq('creator_id', userId)
    .single();
  if (productError) throw productError;
  if (product.creator_id !== userId || product.owner_type !== 'creator') throw new Error('Product ownership could not be confirmed.');
  const { data: existing, error: existingError } = await (supabase as any)
    .from('store_submissions')
    .select('id,creator_id,status')
    .eq('creator_id', userId)
    .eq('product_source', 'store_product')
    .eq('product_id', productId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (['submitted', 'under_review', 'approved'].includes(existing?.status)) {
    throw new Error(existing.status === 'approved' ? 'This product is already approved.' : 'This product is already in review.');
  }
  const mutation = existing?.id
    ? (supabase as any).from('store_submissions').update({ status: 'submitted', updated_at: new Date().toISOString() }).eq('id', existing.id).eq('creator_id', userId)
    : (supabase as any).from('store_submissions').insert({ creator_id: userId, product_source: 'store_product', product_id: productId, submission_type: 'main_store', status: 'submitted' });
  const { data, error } = await mutation.select('id,creator_id,product_id,status').single();
  if (error) throw error;
  if (data.creator_id !== userId || data.product_id !== productId || data.status !== 'submitted') throw new Error('Store submission was not confirmed.');
}

export async function hideStoreProduct(productId: string) {
  const { userId } = await currentOwner();
  const { data, error } = await (supabase as any)
    .from('store_products')
    .update({ visibility: 'hidden', is_active: false, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .eq('creator_id', userId)
    .select('id,creator_id,visibility,is_active')
    .single();
  if (error) throw error;
  if (data.creator_id !== userId || data.visibility !== 'hidden' || data.is_active !== false) throw new Error('Product visibility change was not confirmed.');
}

export async function setMembershipTierActive(tierId: string, profileId: string, active: boolean) {
  const owner = await currentOwner();
  if (owner.profileId !== profileId) throw new Error('Membership owner could not be confirmed.');
  const status = active ? 'active' : 'paused';
  const { data, error } = await (supabase as any)
    .from('membership_tiers')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tierId)
    .eq('owner_type', 'profile')
    .eq('owner_id', profileId)
    .select('id,owner_type,owner_id,status')
    .single();
  if (error) throw error;
  if (data.owner_id !== profileId || data.status !== status) throw new Error('Membership status change was not confirmed.');
}

export async function setSamplePackActive(packId: string, active: boolean) {
  const { userId } = await currentOwner();
  const { data: existing, error: loadError } = await (supabase as any)
    .from('sample_packs')
    .select('id,user_id,approval_status')
    .eq('id', packId)
    .eq('user_id', userId)
    .single();
  if (loadError) throw loadError;
  if (existing.user_id !== userId) throw new Error('Pack ownership could not be confirmed.');
  if (active && existing.approval_status !== 'approved') throw new Error('This pack must be approved before it can go live.');
  const { data, error } = await (supabase as any)
    .from('sample_packs')
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq('id', packId)
    .eq('user_id', userId)
    .select('id,user_id,is_active')
    .single();
  if (error) throw error;
  if (data.user_id !== userId || data.is_active !== active) throw new Error('Pack availability change was not confirmed.');
}
