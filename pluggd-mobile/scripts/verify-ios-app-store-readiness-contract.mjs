import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const config = read('app.config.ts');
const auth = read('src/context/AuthProvider.tsx');
const login = read('app/auth/login.tsx');
const signup = read('app/auth/signup.tsx');
const socialConsent = read('src/features/auth/social-auth-consent.ts');
const privacy = read('app/settings/privacy.tsx');
const dataExport = read('app/settings/data-export.tsx');
const safety = read('src/features/safety/accountSafety.ts');
const social = read('src/features/culture/mobileSocial.ts');
const storeKit = read('src/context/StoreKitProvider.tsx') + read('src/context/StoreBillingProvider.tsx');
const appleBilling = read('src/billing/adapters/apple.ts');
const manifest = read('ios/Pluggd/PrivacyInfo.xcprivacy');
const verifier = read('../supabase/functions/_shared/appleSignedData.ts');
const receipt = read('../supabase/functions/validate-iap-receipt/index.ts');
const notifications = read('../supabase/functions/apple-server-notification/index.ts');
const creditPacks = read('../supabase/functions/_shared/appleCreditPacks.ts');
const subscriptions = read('src/hooks/useSubscription.ts');
const policy = read('src/commerce/policy.ts');
const environment = read('src/config/environment.ts');

assert.equal(packageJson.dependencies['@stripe/stripe-react-native'], undefined, 'Stripe native SDK must not ship');
assert.ok(packageJson.dependencies['expo-web-browser'], 'eligible hosted checkout must use expo-web-browser');
assert.match(config, /supportsTablet:\s*false/, 'release must be iPhone-only');
assert.match(config, /ITSAppUsesNonExemptEncryption:\s*false/, 'export compliance must be explicit');
assert.doesNotMatch(config, /merchantIdentifier|stripe-react-native/i, 'native config must not contain Stripe or Apple Pay');
assert.match(policy, /useCommercePolicy/, 'App Store build must route commerce through the unified policy');
assert.match(policy, /resolve-commerce-policy/, 'commerce eligibility must be server resolved');
assert.match(policy, /unavailable/, 'commerce policy must support fail-closed unavailable results');
assert.match(policy, /expo-web-browser[\s\S]*openHostedCheckout/, 'eligible external rails must use hosted checkout without the native Stripe SDK');
assert.match(
  environment,
  /__DEV__\s*\?\s*['"]development['"]\s*:\s*['"]production['"]/,
  'a Release build with no explicit environment must default to production instead of silently re-enabling launch codes',
);
assert.match(
  environment,
  /accountDeletion:\s*['"]https:\/\/www\.pluggd\.fm\/account-deletion['"]/,
  'mobile release metadata must retain the public self-service account deletion URL',
);
assert.match(auth, /if \(!LAUNCH_ACCESS_REQUIRED\)/, 'production auth must bypass launch access');
assert.match(login, /\{LAUNCH_ACCESS_REQUIRED \? \(/, 'login access-code field must be development-only');
assert.match(login, /if \(LAUNCH_ACCESS_REQUIRED && code\)/, 'production login must not validate launch codes');
assert.match(signup, /\{LAUNCH_ACCESS_REQUIRED \? \(/, 'signup access-code field must be development-only');
assert.match(signup, /minimum_age_confirmed:\s*true/, 'signup must persist age confirmation');
assert.match(signup, /accessibilityRole="checkbox"/, 'signup must require explicit accessible age confirmation');
assert.match(socialConsent, /requireSocialAuthConsent/, 'social provider boundary must enforce age confirmation');
assert.match(signup, /LEGAL_URLS\.terms/, 'signup must expose legal terms');
assert.match(privacy, /deleteMyAccount/, 'account deletion must be an in-app server action');
assert.match(privacy, /blocked-accounts/, 'blocked account manager must be reachable');
assert.doesNotMatch(privacy, /will appear here|not yet configurable|requires confirmation through PLUGGD support/i, 'privacy controls must not be placeholders');
assert.match(dataExport, /requestDataExport/, 'data export must use the authenticated export action');
assert.match(safety, /block-user/, 'safety client must use the server block action');
assert.match(social, /moderateUserContent/, 'UGC must pass through pre-publication moderation');
assert.match(social, /loadBlockedUserIds/, 'community content must filter blocked authors');
assert.match(storeKit, /adapter\s*\.\s*connect\(\)/, 'StoreKit must have one root connection owner');
assert.match(appleBilling, /appAccountToken:\s*accountId/, 'the iOS adapter must preserve StoreKit account binding');
assert.match(verifier, /@peculiar\/x509/, 'Apple signed data must use an X.509 certificate verifier compatible with Supabase Edge');
assert.match(verifier, /jwtVerify/, 'Apple signed-data JWS signatures must be verified');
assert.match(verifier, /header\.alg\s*!==\s*["']ES256["']/, 'Apple signed data must reject non-ES256 algorithms');
assert.match(verifier, /header\.x5c/, 'Apple signed data must require the x5c certificate chain');
assert.match(verifier, /encodedChain\.length\s*!==\s*3/, 'Apple signed data must require the complete three-certificate chain');
assert.match(verifier, /APPLE_ROOT_CA_G2_BASE64/, 'Apple Root CA G2 must be pinned from server configuration');
assert.match(verifier, /APPLE_ROOT_CA_G3_BASE64/, 'Apple Root CA G3 must be pinned from server configuration');
assert.match(verifier, /1\.2\.840\.113635\.100\.6\.11\.1/, 'Apple leaf certificate purpose OID must be enforced');
assert.match(verifier, /1\.2\.840\.113635\.100\.6\.2\.1/, 'Apple intermediate certificate purpose OID must be enforced');
assert.match(verifier, /leaf\.verify/, 'Apple leaf certificate signature must be verified');
assert.match(verifier, /intermediate\.verify/, 'Apple intermediate certificate signature must be verified against a pinned root');
assert.match(verifier, /APPLE_APP_ID is required for Production verification/, 'production verification must require the numeric Apple app ID');
assert.match(verifier, /bundle identifier mismatch/, 'verified signed data must be bound to the configured bundle ID');
assert.match(verifier, /environment mismatch/, 'verified signed data must be bound to the expected App Store environment');
assert.match(receipt, /verifyAppleTransaction/, 'client transaction must be cryptographically verified');
assert.doesNotMatch(receipt, /proceeding with basic validation|decodeJWSPayload/, 'unverified receipt fallback is forbidden');
assert.match(subscriptions, /const purchaseToken = purchase\.purchaseToken;/, 'expo-iap StoreKit 2 membership validation must use Apple\'s signed transaction JWS');
assert.doesNotMatch(subscriptions, /receipt_data:\s*purchase\.transactionReceipt/, 'StoreKit 2 membership validation must not submit the empty legacy receipt field');
assert.match(notifications, /verifyAppleNotification/, 'server notification must be cryptographically verified');
assert.doesNotMatch(notifications, /without cryptographic verification|decodeJWSPayload/, 'unverified notification decoding is forbidden');
assert.match(notifications, /notificationType === "ONE_TIME_CHARGE"/, 'Apple one-time charge notifications must recover credit fulfilment');
assert.match(notifications, /idempotencyKey = `apple-iap:\$\{txInfo\.transactionId\}`/, 'server notification credit fulfilment must be replay safe');
assert.match(notifications, /kind: "topup_iap"/, 'Apple credit packs must be immediately available instead of entering the web top-up hold');
assert.match(creditPacks, /pluggd_credits_popular:[\s\S]*totalCredits: 1050/, 'server-owned Apple credit catalogue must preserve the Plus pack amount');
assert.match(manifest, /NSPrivacyCollectedDataTypeEmailAddress/, 'privacy manifest must declare linked email');
assert.match(manifest, /NSPrivacyCollectedDataTypeOtherUserContent/, 'privacy manifest must declare UGC');
assert.equal(existsSync(new URL('../app/auth/biometric.tsx', import.meta.url)), false, 'decorative biometric route must not ship');

console.log('iOS App Store readiness contract passed');
