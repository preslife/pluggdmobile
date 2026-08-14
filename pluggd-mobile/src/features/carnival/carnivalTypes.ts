export type CarnivalCampaign = {
  startsAt: string;
  endsAt: string;
};

export type CarnivalSignal = {
  id: string;
  body: string | null;
  city: string | null;
  country: string | null;
  location_label: string | null;
  public_latitude: number | null;
  public_longitude: number | null;
  public_location_precision: string | null;
  activity_tags: string[] | null;
  mood_tags: string[] | null;
  links: unknown;
};

export type CarnivalStory = {
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  articleUrl: string;
};

export type CarnivalSoundboard = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  item_count: number | null;
  like_count: number | null;
  comment_count: number | null;
};

export type CarnivalHubBundle = {
  schemaVersion: 1;
  generatedAt: string;
  sourceCheckedAt: string;
  campaign: CarnivalCampaign;
  hub: {
    id: string;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    heroImageUrl: string;
    updatedAt: string;
  };
  event: {
    id: string;
    slug: string | null;
    title: string;
    description: string | null;
    cover_image_url: string | null;
    starts_at: string;
    ends_at: string | null;
    city: string | null;
    location: string | null;
    ticket_url: string | null;
    rsvp_count: number | null;
  } | null;
  signals: CarnivalSignal[];
  stories: CarnivalStory[];
  soundboards: CarnivalSoundboard[];
  gateways: Array<{ id: 'build' | 'map' | 'sounds' | 'stories'; title: string; subtitle: string }>;
  officialLinks: Array<{ id: string; title: string; url: string }>;
  offline: { title: string; url: string; updatedAt: string };
  disclaimer: string;
};

export type CarnivalRoutePreferences = {
  day: 'Sunday' | 'Monday';
  sound: string;
  pace: 'Easy' | 'Balanced' | 'Full road';
  accessible: boolean;
};

export type SavedCarnivalRoute = CarnivalRoutePreferences & {
  createdAt: string;
  stops: CarnivalSignal[];
};

