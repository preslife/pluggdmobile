import type { ImageSourcePropType } from 'react-native';
import { supabase } from '../../lib/supabase';
import {
  fetchPublishedOpportunities,
  getOpportunityArtwork,
  getOpportunityIdentityCandidates,
  OPPORTUNITIES_CREATOR_HERO,
} from '../opportunities/opportunityService';

export type PublicOpportunityFeature = {
  id: string;
  title: string;
  organiser: string;
  type: string;
  imageUrl: string | null;
  imageCandidates: string[];
  fallbackSource: ImageSourcePropType;
  fundingMax: number | null;
  currency: string | null;
  closesAt: string | null;
  route: string;
};

export type PublicStoreFeature = {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  productType: string;
  price: number;
  currency: string;
  route: string;
};

export type PublicDiscoveryFeatures = {
  opportunities: PublicOpportunityFeature[];
  storeProducts: PublicStoreFeature[];
  totalListedFundingGBP: number;
};

export async function loadPublicDiscoveryFeatures(): Promise<PublicDiscoveryFeatures> {
  const [opportunitiesResult, productsResult] = await Promise.allSettled([
    // Load enough of the verified public inventory for the headline count and
    // funding total to remain meaningful; individual rails still slice the
    // result to the small number of cards they render.
    fetchPublishedOpportunities(100),
    (supabase as any)
      .from('store_products')
      .select('id,title,description,image_url,product_type,price,currency,is_active,visibility,moderation_status,is_featured,featured_rank,published_at')
      .eq('is_active', true)
      .eq('visibility', 'public')
      .eq('moderation_status', 'approved')
      .order('is_featured', { ascending: false })
      .order('featured_rank', { ascending: true })
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  const opportunityRows = opportunitiesResult.status === 'fulfilled' ? opportunitiesResult.value : [];
  const productRows = productsResult.status === 'fulfilled' && !productsResult.value?.error
    ? productsResult.value.data || []
    : [];

  const opportunities = opportunityRows.map((opportunity) => {
    const artwork = getOpportunityArtwork(opportunity);
    const imageCandidates = [
      typeof artwork === 'string' ? artwork : null,
      ...getOpportunityIdentityCandidates(opportunity),
    ].filter((candidate, index, list): candidate is string => Boolean(candidate) && list.indexOf(candidate) === index);
    return {
      id: opportunity.id,
      title: opportunity.title,
      organiser: opportunity.organiser_name || 'Verified opportunity',
      type: opportunity.opportunity_type || 'opportunity',
      imageUrl: typeof artwork === 'string' ? artwork : null,
      imageCandidates,
      fallbackSource: (artwork && typeof artwork !== 'string' ? artwork : OPPORTUNITIES_CREATOR_HERO) as ImageSourcePropType,
      fundingMax: opportunity.funding_max,
      currency: opportunity.currency,
      closesAt: opportunity.closes_at,
      route: `/opportunities/${opportunity.slug || opportunity.id}`,
    };
  });

  return {
    opportunities,
    storeProducts: productRows
      .filter((row: any) => ['physical', 'merchandise', 'merch', 'creator_merch'].includes(String(row.product_type || '').toLowerCase()))
      .map((row: any) => ({
      id: String(row.id),
      title: row.title || 'PLUGGD Store item',
      description: row.description || '',
      imageUrl: row.image_url || null,
      productType: row.product_type || 'product',
      price: Number(row.price || 0),
      currency: row.currency || 'GBP',
      route: `/product/${row.id}`,
      })),
    totalListedFundingGBP: opportunityRows.reduce((total, opportunity) => {
      if (opportunity.currency !== 'GBP' || !Number.isFinite(Number(opportunity.funding_max))) return total;
      return total + Math.max(0, Number(opportunity.funding_max || 0));
    }, 0),
  };
}
