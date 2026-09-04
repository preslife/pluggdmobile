import {
  createBillingProgramReportingDetailsAndroid,
  isBillingProgramAvailableAndroid,
  launchExternalLinkAndroid,
  type BillingProgramAndroid,
} from 'expo-iap';
import { Platform } from 'react-native';
import type { CommercePolicyChoice, CommercePolicyDecision } from './policy';
import { reconcileHostedCheckout } from './policy';
import { supabase } from '../lib/supabase';

const EXTERNAL_RAILS = new Set([
  'external_web_checkout',
  'stripe_checkout',
]);

// Only programme identifiers that map one-to-one to the Play Billing API are
// accepted. Business labels such as `stripe_professional_licence` deliberately
// do not map implicitly: Play Console enrolment and server policy must agree on
// the exact programme first.
const SUPPORTED_LINK_PROGRAMS = new Set<BillingProgramAndroid>([
  'external-content-link',
  'external-offer',
]);

export type AndroidExternalCheckoutLaunch = {
  program: BillingProgramAndroid;
};

export function approvedAndroidExternalChoice(
  decision: CommercePolicyDecision,
): (CommercePolicyChoice & { requiredProgram: BillingProgramAndroid }) | null {
  if (
    Platform.OS !== 'android' ||
    decision.platform !== 'android' ||
    decision.killSwitchState.active ||
    !decision.market ||
    !decision.policyVersion
  ) {
    return null;
  }

  const choice = decision.allowedChoices.find((candidate) =>
    EXTERNAL_RAILS.has(candidate.rail) &&
    typeof candidate.requiredProgram === 'string' &&
    SUPPORTED_LINK_PROGRAMS.has(candidate.requiredProgram as BillingProgramAndroid) &&
    Boolean(candidate.requiredDisclosure),
  );
  if (!choice || !choice.requiredProgram) return null;
  if (decision.killSwitchState.rails[choice.rail] === false) return null;
  return choice as CommercePolicyChoice & { requiredProgram: BillingProgramAndroid };
}

/**
 * Launches only a server-approved Play external-link programme. Generic web
 * browser checkout is intentionally not a fallback on Android digital goods.
 * Reporting details are deliberately not generated until server reconciliation
 * confirms payment.
 */
export async function launchApprovedAndroidExternalCheckout(input: {
  decision: CommercePolicyDecision;
  checkoutUrl: string;
}): Promise<AndroidExternalCheckoutLaunch> {
  const choice = approvedAndroidExternalChoice(input.decision);
  if (!choice) {
    throw new Error('No approved Google Play external checkout programme is active.');
  }
  if (!/^https:\/\//i.test(input.checkoutUrl)) {
    throw new Error('The approved external checkout link was invalid.');
  }

  const availability = await isBillingProgramAvailableAndroid(choice.requiredProgram);
  if (!availability.isAvailable) {
    throw new Error('Google Play has not made this checkout programme available for this account.');
  }
  const launched = await launchExternalLinkAndroid({
    billingProgram: choice.requiredProgram,
    launchMode: 'launch-in-external-browser-or-app',
    linkType: 'link-to-digital-content-offer',
    linkUri: input.checkoutUrl,
  });
  if (!launched) throw new Error('Google Play did not approve the external checkout launch.');
  return {
    program: choice.requiredProgram,
  };
}

/**
 * Reports the Play token only after PLUGGD's server independently confirms the
 * provider payment. The backend in turn succeeds only after Google persists a
 * TRANSACTION_REPORTED record; raw tokens are never stored in the app ledger.
 */
export async function reportVerifiedAndroidExternalTransaction(input: {
  sessionId: string;
  itemId: string;
  program: BillingProgramAndroid;
}) {
  const reconciliation = await reconcileHostedCheckout({
    kind: 'beat_license',
    sessionId: input.sessionId,
    itemId: input.itemId,
  });
  if (reconciliation.state !== 'success') {
    throw new Error('External payment has not been verified, so no Play transaction was reported.');
  }

  const reporting = await createBillingProgramReportingDetailsAndroid({
    program: input.program,
  });
  if (!reporting.externalTransactionToken) {
    throw new Error('Google Play did not issue external transaction reporting details.');
  }

  const { data, error } = await supabase.functions.invoke(
    'report-google-play-external-transaction',
    {
      body: {
        checkout_session_id: input.sessionId,
        external_transaction_token: reporting.externalTransactionToken,
      },
    },
  );
  if (error) throw error;
  const response = (data ?? {}) as Record<string, unknown>;
  if (response.success !== true || response.reporting_state !== 'TRANSACTION_REPORTED') {
    throw new Error('Google Play external transaction reporting is still pending.');
  }
  return response;
}
