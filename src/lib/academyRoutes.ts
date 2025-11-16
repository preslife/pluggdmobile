import { FeatureFlag, isFeatureEnabled } from '@/config/featureFlags';

export const getAcademyBasePath = (): string =>
  isFeatureEnabled(FeatureFlag.LMS) ? '/learn' : '/education';

export const getAcademyCoursePath = (slug?: string): string => {
  if (!slug) return getAcademyBasePath();
  if (isFeatureEnabled(FeatureFlag.LMS)) {
    return `/learn/${slug}`;
  }
  const search = new URLSearchParams({ course: slug });
  return `/education?${search.toString()}`;
};

export const getAcademyCertificatesPath = (): string => {
  if (isFeatureEnabled(FeatureFlag.LMS)) {
    return '/learn';
  }
  return '/education?tab=certificates';
};
