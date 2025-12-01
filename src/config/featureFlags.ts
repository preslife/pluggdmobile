export enum FeatureFlag {
  LMS = 'LMS',
}

const rawFlags: Record<FeatureFlag, string | boolean | undefined> = {
  // LMS is enabled by default - fully integrated
  [FeatureFlag.LMS]: import.meta.env.VITE_FEATURE_LMS ?? true,
};

export const featureFlags: Record<FeatureFlag, boolean> = {
  [FeatureFlag.LMS]: rawFlags[FeatureFlag.LMS] === true || rawFlags[FeatureFlag.LMS] === 'true',
};

export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag] ?? false;
