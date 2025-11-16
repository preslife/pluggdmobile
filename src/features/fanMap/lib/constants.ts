// Map Configuration Constants
export const MAP_CONFIG = {
  // Initial view
  INITIAL_CENTER: [0, 20] as [number, number],
  INITIAL_ZOOM: 1.5,
  INITIAL_PITCH: 45,
  INITIAL_BEARING: 0,

  // Clustering
  CLUSTER_RADIUS: 80,
  CLUSTER_MAX_ZOOM: 16,

  // 3D Extrusion
  EXTRUSION_HEIGHT_PER_DOLLAR: 5000, // meters per dollar for featured plugs
  STANDARD_PLUG_HEIGHT: 20000, // 20km height for standard plugs
  EXTRUSION_CIRCLE_RADIUS: 0.05, // degrees (~5.5km at equator)
  EXTRUSION_CIRCLE_POINTS: 32, // polygon smoothness

  // Animations
  PLUG_DROP_DURATION: 600, // milliseconds
  CLUSTER_ZOOM_DURATION: 500,
  FLY_TO_DURATION: 2000,
  FLY_TO_ZOOM: 12,
  FLY_TO_PITCH: 60,

  // Markers
  FEATURED_MARKER_SIZE: 24,
  STANDARD_MARKER_SIZE: 16,

  // Heatmap
  HEATMAP_MAX_ZOOM: 15,
  HEATMAP_MIN_RADIUS: 20,
  HEATMAP_MAX_RADIUS: 80,
} as const;

// Form Validation Constants
export const VALIDATION = {
  MESSAGE_MAX_LENGTH: 200,
  USER_NAME_MIN_LENGTH: 2,
  USER_NAME_MAX_LENGTH: 50,
  LOCATION_SEARCH_DEBOUNCE: 500, // milliseconds
  MAX_LAT: 90,
  MIN_LAT: -90,
  MAX_LNG: 180,
  MIN_LNG: -180,
} as const;

// Tip amounts available for featured placement
export const TIP_AMOUNTS = [5, 10, 25, 50] as const;

// API endpoints (for future backend integration)
export const API_ENDPOINTS = {
  PLUGS: '/plugs',
  CREATOR_PLUGS: (creatorId: string) => `/creators/${creatorId}/plugs`,
  COMMUNITY_PLUGS: '/community/plugs',
} as const;

// Mapbox configuration
export const MAPBOX_CONFIG = {
  TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  GEOCODING_LIMIT: 5,
  GEOCODING_TYPES: 'place', // Only cities/towns, no neighborhoods or POIs
  GEOCODING_LANGUAGE: 'en', // Force English for all place names
} as const;

// LocalStorage keys
export const STORAGE_KEYS = {
  PLUGS: 'plugs',
  USER_PREFERENCES: 'user_preferences',
} as const;

// Brand colors
export const COLORS = {
  PRIMARY: '#FF6B35',
  FEATURED: '#F59E0B',
  BACKGROUND: '#0A0A0A',
} as const;
