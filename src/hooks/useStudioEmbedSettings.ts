import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useCallback, useEffect, useRef, useState } from 'react';

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  addedAt: string;
  note?: string | null;
  phone?: string | null;
}

export interface LegalDocument {
  id: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  size?: number | null;
  type?: string | null;
  signer?: string | null;
  notes?: string | null;
}

export type PartnershipStatus =
  | 'prospect'
  | 'negotiating'
  | 'awaiting-contract'
  | 'signed'
  | 'active'
  | 'completed'
  | 'lost';

export interface PartnershipDeal {
  id: string;
  brand: string;
  contact: string;
  email?: string | null;
  value?: number | null;
  status: PartnershipStatus;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  deliverables?: string[];
  lastUpdated: string;
}

export interface StudioDefaults {
  timezone: string;
  currency: string;
  releasePrice: number | null;
  payoutSchedule: 'weekly' | 'monthly' | 'manual';
  licenseTemplate: string;
  deliveryWindowDays?: number | null;
}

export interface StudioSocials {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}

export interface StudioEmbedSettings {
  website?: string;
  socials?: StudioSocials;
  defaults?: StudioDefaults;
  team?: TeamMember[];
  legalVault?: LegalDocument[];
  partnerships?: PartnershipDeal[];
}

const randomId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2, 12)}`;

const defaultTimezone =
  typeof Intl !== 'undefined' && typeof Intl.DateTimeFormat === 'function'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
    : 'UTC';

const defaultSettings: StudioEmbedSettings = {
  website: '',
  socials: {
    twitter: '',
    instagram: '',
    youtube: '',
    tiktok: '',
    website: ''
  },
  defaults: {
    timezone: defaultTimezone,
    currency: 'USD',
    releasePrice: null,
    payoutSchedule: 'monthly',
    licenseTemplate: '',
    deliveryWindowDays: 7
  },
  team: [],
  legalVault: [],
  partnerships: []
};

const allowedRoles: TeamRole[] = ['owner', 'admin', 'editor', 'viewer'];

const allowedPartnershipStatus: PartnershipStatus[] = [
  'prospect',
  'negotiating',
  'awaiting-contract',
  'signed',
  'active',
  'completed',
  'lost'
];

const sanitizeTeamMember = (candidate: any): TeamMember => {
  const id = typeof candidate?.id === 'string' && candidate.id ? candidate.id : randomId();
  const role = allowedRoles.includes(candidate?.role) ? candidate.role : 'viewer';

  return {
    id,
    name: typeof candidate?.name === 'string' && candidate.name ? candidate.name : candidate?.email ?? 'Collaborator',
    email: typeof candidate?.email === 'string' ? candidate.email : '',
    role,
    addedAt:
      typeof candidate?.addedAt === 'string' && candidate.addedAt
        ? candidate.addedAt
        : new Date().toISOString(),
    note: typeof candidate?.note === 'string' ? candidate.note : undefined,
    phone: typeof candidate?.phone === 'string' ? candidate.phone : undefined
  };
};

const sanitizeLegalDocument = (candidate: any): LegalDocument => ({
  id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : randomId(),
  fileName: typeof candidate?.fileName === 'string' ? candidate.fileName : 'document.pdf',
  storagePath:
    typeof candidate?.storagePath === 'string'
      ? candidate.storagePath
      : typeof candidate?.path === 'string'
      ? candidate.path
      : '',
  uploadedAt:
    typeof candidate?.uploadedAt === 'string' && candidate.uploadedAt
      ? candidate.uploadedAt
      : new Date().toISOString(),
  size: typeof candidate?.size === 'number' ? candidate.size : undefined,
  type: typeof candidate?.type === 'string' ? candidate.type : undefined,
  signer: typeof candidate?.signer === 'string' ? candidate.signer : undefined,
  notes: typeof candidate?.notes === 'string' ? candidate.notes : undefined
});

const sanitizeDeliverables = (input: any): string[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const sanitizePartnership = (candidate: any): PartnershipDeal => ({
  id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : randomId(),
  brand: typeof candidate?.brand === 'string' ? candidate.brand : 'Brand',
  contact: typeof candidate?.contact === 'string' && candidate.contact ? candidate.contact : 'Contact',
  email: typeof candidate?.email === 'string' ? candidate.email : undefined,
  value:
    typeof candidate?.value === 'number'
      ? candidate.value
      : typeof candidate?.value === 'string' && candidate.value
      ? Number(candidate.value)
      : null,
  status: allowedPartnershipStatus.includes(candidate?.status)
    ? candidate.status
    : 'prospect',
  startDate: typeof candidate?.startDate === 'string' ? candidate.startDate : undefined,
  endDate: typeof candidate?.endDate === 'string' ? candidate.endDate : undefined,
  notes: typeof candidate?.notes === 'string' ? candidate.notes : undefined,
  deliverables: sanitizeDeliverables(candidate?.deliverables),
  lastUpdated:
    typeof candidate?.lastUpdated === 'string' && candidate.lastUpdated
      ? candidate.lastUpdated
      : new Date().toISOString()
});

const sanitizeDefaults = (candidate: any): StudioDefaults => ({
  timezone:
    typeof candidate?.timezone === 'string' && candidate.timezone
      ? candidate.timezone
      : defaultSettings.defaults!.timezone,
  currency:
    typeof candidate?.currency === 'string' && candidate.currency
      ? candidate.currency
      : defaultSettings.defaults!.currency,
  releasePrice:
    typeof candidate?.releasePrice === 'number'
      ? candidate.releasePrice
      : typeof candidate?.releasePrice === 'string'
      ? Number(candidate.releasePrice)
      : defaultSettings.defaults!.releasePrice ?? null,
  payoutSchedule:
    candidate?.payoutSchedule === 'weekly' ||
    candidate?.payoutSchedule === 'monthly' ||
    candidate?.payoutSchedule === 'manual'
      ? candidate.payoutSchedule
      : defaultSettings.defaults!.payoutSchedule,
  licenseTemplate:
    typeof candidate?.licenseTemplate === 'string'
      ? candidate.licenseTemplate
      : defaultSettings.defaults!.licenseTemplate,
  deliveryWindowDays:
    typeof candidate?.deliveryWindowDays === 'number'
      ? candidate.deliveryWindowDays
      : typeof candidate?.deliveryWindowDays === 'string'
      ? Number(candidate.deliveryWindowDays)
      : defaultSettings.defaults!.deliveryWindowDays
});

const sanitizeSettings = (candidate: any): StudioEmbedSettings => {
  const value = candidate && typeof candidate === 'object' ? candidate : {};

  const socials = {
    ...defaultSettings.socials,
    ...(value.socials ?? {}),
    ...(value.social ?? {})
  };

  if (typeof value.website === 'string' && value.website && !socials.website) {
    socials.website = value.website;
  }

  return {
    website: typeof value.website === 'string' ? value.website : defaultSettings.website,
    socials,
    defaults: sanitizeDefaults(value.defaults ?? {}),
    team: Array.isArray(value.team) ? value.team.map(sanitizeTeamMember) : [],
    legalVault: Array.isArray(value.legalVault)
      ? value.legalVault.map(sanitizeLegalDocument)
      : [],
    partnerships: Array.isArray(value.partnerships)
      ? value.partnerships.map(sanitizePartnership)
      : []
  };
};

export const useStudioEmbedSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<StudioEmbedSettings>(defaultSettings);
  const settingsRef = useRef<StudioEmbedSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSettings(defaultSettings);
      settingsRef.current = defaultSettings;
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('profiles')
        .select('embed_settings')
        .eq('user_id', user.id)
        .maybeSingle();

      if (queryError) throw queryError;

      const parsed = sanitizeSettings(data?.embed_settings ?? {});
      settingsRef.current = parsed;
      setSettings(parsed);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateSettings = useCallback(
    async (updater: (previous: StudioEmbedSettings) => StudioEmbedSettings) => {
      if (!user?.id) {
        throw new Error('Authentication required to update settings');
      }

      setSaving(true);
      setError(null);

      const previous = settingsRef.current;
      const next = sanitizeSettings(updater(previous));
      settingsRef.current = next;
      setSettings(next);

      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ embed_settings: next })
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }
      } catch (err) {
        settingsRef.current = previous;
        setSettings(previous);
        setError(err as Error);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [user?.id]
  );

  return {
    settings,
    loading,
    saving,
    error,
    refresh,
    updateSettings,
    userId: user?.id ?? null
  };
};

export { defaultSettings as defaultStudioEmbedSettings, randomId as generateStudioId };
