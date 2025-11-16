export enum FeatureFlag {
  LMS = 'LMS',
}

const rawFlags: Record<FeatureFlag, string | boolean | undefined> = {
  [FeatureFlag.LMS]: import.meta.env.VITE_FEATURE_LMS ?? false,
};

export const featureFlags: Record<FeatureFlag, boolean> = {
  [FeatureFlag.LMS]: rawFlags[FeatureFlag.LMS] === true || rawFlags[FeatureFlag.LMS] === 'true',
};

export const isFeatureEnabled = (flag: FeatureFlag): boolean => featureFlags[flag] ?? false;
