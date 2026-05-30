import type { ImageSourcePropType } from 'react-native';

export type WebParityAssetKey =
  | 'homeHero'
  | 'homeEcosystem'
  | 'homeSupport'
  | 'discoverPaperCard'
  | 'discoverPaperWide'
  | 'liveHero'
  | 'eventsHero'
  | 'mixesHero'
  | 'marketBeatStore'
  | 'intimateCrowdHero'
  | 'brickRoomShow'
  | 'intimateVocalist'
  | 'warmListeningRoom'
  | 'bedroomStudio'
  | 'phoneCrowd'
  | 'phoneStage'
  | 'phoneMoment';

export const WEB_PARITY_ASSETS: Record<WebParityAssetKey, ImageSourcePropType> = {
  homeHero: require('../../../assets/web-parity/home/homepage-hero.jpeg'),
  homeEcosystem: require('../../../assets/web-parity/home/homepage-explore-ecosystem.png'),
  homeSupport: require('../../../assets/web-parity/home/homepage-support-section.png'),
  discoverPaperCard: require('../../../assets/web-parity/discover/paper-panel-card.png'),
  discoverPaperWide: require('../../../assets/web-parity/discover/paper-panel-wide.png'),
  liveHero: require('../../../assets/web-parity/live/pluggd-live-hero.png'),
  eventsHero: require('../../../assets/web-parity/events/pluggd-events.png'),
  mixesHero: require('../../../assets/web-parity/discover/pluggd-mixes.png'),
  marketBeatStore: require('../../../assets/web-parity/market/beat-store-hero.png'),
  intimateCrowdHero: require('../../../assets/web-parity/home/intimate-crowd-hero.png'),
  brickRoomShow: require('../../../assets/web-parity/home/brick-room-show.png'),
  intimateVocalist: require('../../../assets/web-parity/home/intimate-vocalist.png'),
  warmListeningRoom: require('../../../assets/web-parity/home/warm-listening-room.png'),
  bedroomStudio: require('../../../assets/web-parity/home/bedroom-studio.png'),
  phoneCrowd: require('../../../assets/web-parity/newhome-phone/IMG_9444.jpg'),
  phoneStage: require('../../../assets/web-parity/newhome-phone/IMG_9445.jpg'),
  phoneMoment: require('../../../assets/web-parity/newhome-phone/IMG_9447.jpg'),
};

export const WEB_PARITY_ASSET_GROUPS = {
  home: [
    WEB_PARITY_ASSETS.homeHero,
    WEB_PARITY_ASSETS.intimateCrowdHero,
    WEB_PARITY_ASSETS.brickRoomShow,
    WEB_PARITY_ASSETS.intimateVocalist,
    WEB_PARITY_ASSETS.warmListeningRoom,
    WEB_PARITY_ASSETS.bedroomStudio,
  ],
  discover: [
    WEB_PARITY_ASSETS.discoverPaperCard,
    WEB_PARITY_ASSETS.discoverPaperWide,
    WEB_PARITY_ASSETS.mixesHero,
  ],
  commerce: [
    WEB_PARITY_ASSETS.marketBeatStore,
    WEB_PARITY_ASSETS.eventsHero,
  ],
};
