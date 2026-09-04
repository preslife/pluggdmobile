import { MINIMUM_AGE } from '../../config/environment';

export type SocialAuthConsent = Readonly<{
  minimumAgeConfirmed: boolean;
}>;

/**
 * Keep the age gate at the provider boundary so a new caller cannot start
 * social OAuth without first collecting the user's explicit confirmation.
 */
export function requireSocialAuthConsent(consent: SocialAuthConsent) {
  if (!consent.minimumAgeConfirmed) {
    throw new Error(`Confirm that you are at least ${MINIMUM_AGE} to continue.`);
  }
}
