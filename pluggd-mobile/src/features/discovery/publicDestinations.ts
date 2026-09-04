import type { ImageSourcePropType } from 'react-native';

export type PublicDestinationId =
  | 'carnival'
  | 'mixes'
  | 'soundboards'
  | 'releases'
  | 'live'
  | 'the_plug'
  | 'beatplug'
  | 'opportunities'
  | 'creators'
  | 'community'
  | 'events'
  | 'store';

export type PublicDestination = {
  id: PublicDestinationId;
  title: string;
  route: string;
  icon: string;
  index: string;
  defaultMeta: string;
  artwork: ImageSourcePropType;
  wide?: boolean;
};

export const DISCOVERY_DESTINATION_ART = {
  mixes: require('../../../assets/discovery-destinations/exec-47622c5f-dae6-4795-966b-499786107612.png') as ImageSourcePropType,
  releases: require('../../../assets/discovery-destinations/exec-ec4bc1d1-8fe0-45e8-886d-3f357aba4d77.png') as ImageSourcePropType,
  soundboards: require('../../../assets/discovery-destinations/exec-04723d4a-5b3a-41ac-ad89-b0a6aa4f05f3.png') as ImageSourcePropType,
  thePlug: require('../../../assets/discovery-destinations/exec-534646a6-1b6d-421a-b3aa-8136b1865e4c.png') as ImageSourcePropType,
  beatplug: require('../../../assets/discovery-destinations/exec-23714e15-eaaf-4916-91eb-82e18f44f786.png') as ImageSourcePropType,
  opportunities: require('../../../assets/discovery-destinations/exec-c789cd5d-7216-4080-a864-b0ff27c8ec10.png') as ImageSourcePropType,
  creators: require('../../../assets/discovery-destinations/exec-8e77cb86-6209-4a9a-9a3c-87837285edec.png') as ImageSourcePropType,
  live: require('../../../assets/discovery-destinations/exec-d22c7fde-0aeb-4b08-9a16-de729948af98.png') as ImageSourcePropType,
  community: require('../../../assets/discovery-destinations/exec-1da33797-0a3a-42d9-8d31-268dd1ca5e4b.png') as ImageSourcePropType,
  events: require('../../../assets/discovery-destinations/exec-e4071f00-7ea0-4089-9b03-1301ec6f9c5b.png') as ImageSourcePropType,
  store: require('../../../assets/discovery-destinations/exec-3fbde7cb-7e29-402b-820a-01bb4350f65e.png') as ImageSourcePropType,
  maps: require('../../../assets/discovery-destinations/exec-89c6e9d2-95d8-4026-91b9-e7732823fb36.png') as ImageSourcePropType,
  library: require('../../../assets/discovery-destinations/exec-698269f5-553c-49f7-9444-94b97a40d1c0.png') as ImageSourcePropType,
  // Pixel-equivalent PNG export of the accepted web banner. React Native's
  // iOS Image path does not decode the source WebP reliably in the dev client.
  dj: require('../../../assets/web-parity/discover/pluggd-dj-discover-banner.png') as ImageSourcePropType,
} as const;

/** The current Carnival artwork is intentionally preserved for its bounded 2026 fallback. */
export const CARNIVAL_HUB_DESTINATION = {
  id: 'carnival' as const,
  title: 'Carnival 2026',
  route: '/hubs/notting-hill-carnival-2026',
  imageUrl: 'https://www.pluggd.fm/carnival-2026/assets/mas/notting-hill-mas-2023.webp',
  defaultMeta: 'Build your road · map · stories · sounds',
};

/**
 * One public navigation contract for the native app. Bottom tabs remain the
 * fastest route to Home, Community, Events and Store; this registry guarantees
 * that every public discovery world has a clear entry without duplicating
 * Community Maps or the member-owned Library from the account menu.
 */
export const PUBLIC_DESTINATIONS: readonly PublicDestination[] = [
  { id: 'mixes', title: 'Mixes', route: '/mixes', icon: 'album', index: '01', defaultMeta: 'Selector worlds and listening rooms', artwork: DISCOVERY_DESTINATION_ART.mixes },
  { id: 'soundboards', title: 'Soundboards', route: '/soundboards', icon: 'dashboard-customize', index: '02', defaultMeta: 'Ideas, references and works in progress', artwork: DISCOVERY_DESTINATION_ART.soundboards },
  { id: 'releases', title: 'Releases', route: '/releases', icon: 'music-note', index: '03', defaultMeta: 'New independent music', artwork: DISCOVERY_DESTINATION_ART.releases },
  { id: 'live', title: 'Live', route: '/live', icon: 'sensors', index: '04', defaultMeta: 'Rooms, parties and replays', artwork: DISCOVERY_DESTINATION_ART.live },
  { id: 'the_plug', title: 'THE PLUG', route: '/plug', icon: 'auto-stories', index: '05', defaultMeta: 'Interviews, editorials and scene reports', artwork: DISCOVERY_DESTINATION_ART.thePlug, wide: true },
  { id: 'beatplug', title: 'BeatPlug', route: '/market/beats', icon: 'headphones', index: '06', defaultMeta: 'Beats ready to hear and license', artwork: DISCOVERY_DESTINATION_ART.beatplug },
  { id: 'opportunities', title: 'Opportunities', route: '/opportunities', icon: 'campaign', index: '07', defaultMeta: 'Funding, grants, showcases and programmes', artwork: DISCOVERY_DESTINATION_ART.opportunities },
  { id: 'creators', title: 'Creators', route: '/directory', icon: 'people-alt', index: '08', defaultMeta: 'Artists, PLUGGD creators and industry', artwork: DISCOVERY_DESTINATION_ART.creators },
  { id: 'community', title: 'Community', route: '/community', icon: 'forum', index: '09', defaultMeta: 'Feed, boards and scene conversations', artwork: DISCOVERY_DESTINATION_ART.community },
  { id: 'events', title: 'Events', route: '/events', icon: 'event', index: '10', defaultMeta: 'Shows, parties and cultural moments', artwork: DISCOVERY_DESTINATION_ART.events },
  { id: 'store', title: 'Store', route: '/market', icon: 'storefront', index: '11', defaultMeta: 'Music, goods, memberships and more', artwork: DISCOVERY_DESTINATION_ART.store },
] as const;

export function publicDestination(id: PublicDestinationId) {
  return PUBLIC_DESTINATIONS.find((destination) => destination.id === id) ?? null;
}
