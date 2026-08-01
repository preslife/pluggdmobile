#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { sign } from 'node:crypto';

const API_ROOT = 'https://api.appstoreconnect.apple.com';
const bundleId = process.env.ASC_BUNDLE_ID || 'com.pluggd.mobile';
const issuerId = process.env.ASC_ISSUER_ID;
const keyId = process.env.ASC_KEY_ID;
const keyPath = process.env.ASC_KEY_PATH;

if (!issuerId || !keyId || !keyPath) {
  throw new Error('Set ASC_ISSUER_ID, ASC_KEY_ID and ASC_KEY_PATH before running this audit.');
}

const base64url = (value) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value))
    .toString('base64url');

async function createToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 15 * 60,
    aud: 'appstoreconnect-v1',
  };
  const signingInput = `${base64url(header)}.${base64url(payload)}`;
  const privateKey = await readFile(keyPath, 'utf8');
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${signature.toString('base64url')}`;
}

const token = await createToken();

async function get(path) {
  return request('GET', path);
}

async function request(method, path, requestBody) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(requestBody ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.errors?.map((error) => error.detail || error.title).join('; ');
    throw new Error(`${response.status} ${path}: ${message || 'App Store Connect request failed'}`);
  }
  return body;
}

async function getOptional(path) {
  try {
    return await get(path);
  } catch (error) {
    if (String(error?.message || '').startsWith('404 ')) return null;
    throw error;
  }
}

function resources(document) {
  return (document?.data || []).map((resource) => ({
    id: resource.id,
    type: resource.type,
    ...resource.attributes,
  }));
}

function endpointSummary(value) {
  if (!value) return { configured: false };
  const url = new URL(value);
  return {
    configured: true,
    origin: url.origin,
    pathname: url.pathname,
    hasCredential: url.searchParams.has('token'),
  };
}

const apps = resources(
  await get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&limit=5`),
);
if (apps.length !== 1) {
  throw new Error(`Expected one App Store app for ${bundleId}; received ${apps.length}.`);
}

const app = apps[0];

const [
  versionsDocument,
  buildsDocument,
  iapsDocument,
  subscriptionGroupsDocument,
  betaGroupsDocument,
] = await Promise.all([
  get(`/v1/apps/${app.id}/appStoreVersions?limit=20`),
  get(`/v1/builds?filter[app]=${app.id}&limit=20&sort=-uploadedDate`),
  get(`/v1/apps/${app.id}/inAppPurchasesV2?limit=200`),
  get(`/v1/apps/${app.id}/subscriptionGroups?limit=200`),
  get(`/v1/betaGroups?filter[app]=${app.id}&limit=200`),
]);

const subscriptionGroups = resources(subscriptionGroupsDocument);
const appStoreVersions = resources(versionsDocument);
const inAppPurchases = resources(iapsDocument);

const versionDetails = await Promise.all(
  appStoreVersions.map(async (version) => {
    const [reviewDetail, localizations] = await Promise.all([
      getOptional(`/v1/appStoreVersions/${version.id}/appStoreReviewDetail`),
      get(`/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations?limit=200`),
    ]);

    const screenshotSets = (
      await Promise.all(
        resources(localizations).map(async (localization) => {
          const sets = resources(
            await get(
              `/v1/appStoreVersionLocalizations/${localization.id}/appScreenshotSets?limit=200`,
            ),
          );
          return Promise.all(
            sets.map(async (set) => ({
              displayType: set.screenshotDisplayType,
              screenshots: resources(
                await get(`/v1/appScreenshotSets/${set.id}/appScreenshots?limit=200`),
              ).length,
            })),
          );
        }),
      )
    ).flat();

    const review = reviewDetail?.data?.attributes || null;
    return {
      versionId: version.id,
      reviewContact: review
        ? {
            configured: Boolean(
              review.contactFirstName &&
                review.contactLastName &&
                review.contactPhone &&
                review.contactEmail,
            ),
            demoAccountRequired: Boolean(review.demoAccountRequired),
            demoAccountConfigured: Boolean(
              review.demoAccountName && review.demoAccountPassword,
            ),
            notesConfigured: Boolean(review.notes?.trim()),
          }
        : {
            configured: false,
            demoAccountRequired: null,
            demoAccountConfigured: false,
            notesConfigured: false,
          },
      screenshots: screenshotSets,
    };
  }),
);

const iapDetails = await Promise.all(
  inAppPurchases.map(async (iap) => {
    const [reviewScreenshot, localizations, pricePoints, availability] =
      await Promise.all([
        getOptional(`/v2/inAppPurchases/${iap.id}/appStoreReviewScreenshot`),
        get(`/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations?limit=200`),
        getOptional(`/v2/inAppPurchases/${iap.id}/pricePoints?limit=200`),
        getOptional(`/v2/inAppPurchases/${iap.id}/inAppPurchaseAvailability`),
      ]);
    return {
      iapId: iap.id,
      localizations: resources(localizations).length,
      configuredPricePoints: resources(pricePoints).length,
      availability: availability?.data?.attributes || null,
      reviewScreenshot: reviewScreenshot?.data?.id
        ? {
            id: reviewScreenshot.data?.id,
            fileName: reviewScreenshot.data?.attributes?.fileName,
            assetDeliveryState:
              reviewScreenshot.data?.attributes?.assetDeliveryState,
          }
        : null,
    };
  }),
);

const subscriptionsByGroup = await Promise.all(
  subscriptionGroups.map(async (group) => ({
    groupId: group.id,
    subscriptions: await Promise.all(
      resources(
        await get(`/v1/subscriptionGroups/${group.id}/subscriptions?limit=200`),
      ).map(async (subscription) => {
        const [localizations, prices, availability, reviewScreenshot] =
          await Promise.all([
            get(`/v1/subscriptions/${subscription.id}/subscriptionLocalizations?limit=200`),
            get(`/v1/subscriptions/${subscription.id}/prices?limit=200`),
            getOptional(`/v1/subscriptions/${subscription.id}/subscriptionAvailability`),
            getOptional(`/v1/subscriptions/${subscription.id}/appStoreReviewScreenshot`),
          ]);
        return {
          id: subscription.id,
          name: subscription.name,
          productId: subscription.productId,
          state: subscription.state,
          subscriptionPeriod: subscription.subscriptionPeriod,
          familySharable: subscription.familySharable,
          reviewNote: subscription.reviewNote,
          groupLevel: subscription.groupLevel,
          localizations: resources(localizations).map((localization) => ({
            id: localization.id,
            locale: localization.locale,
            name: localization.name,
            description: localization.description,
            state: localization.state,
          })),
          configuredPrices: resources(prices).length,
          availability: availability?.data?.attributes || null,
          reviewScreenshot: reviewScreenshot?.data?.id
            ? {
                id: reviewScreenshot.data?.id,
                fileName: reviewScreenshot.data?.attributes?.fileName,
                assetDeliveryState:
                  reviewScreenshot.data?.attributes?.assetDeliveryState,
              }
            : null,
        };
      }),
    ),
  })),
);

const result = {
  checkedAt: new Date().toISOString(),
  app: {
    id: app.id,
    name: app.name,
    bundleId: app.bundleId,
    sku: app.sku,
    primaryLocale: app.primaryLocale,
    contentRightsDeclaration: app.contentRightsDeclaration,
    subscriptionStatusUrl: endpointSummary(app.subscriptionStatusUrl),
    subscriptionStatusUrlForSandbox: endpointSummary(app.subscriptionStatusUrlForSandbox),
  },
  versions: appStoreVersions.map((version) => ({
    id: version.id,
    versionString: version.versionString,
    platform: version.platform,
    appStoreState: version.appStoreState,
    releaseType: version.releaseType,
    earliestReleaseDate: version.earliestReleaseDate,
    createdDate: version.createdDate,
    review:
      versionDetails.find((entry) => entry.versionId === version.id)?.reviewContact ||
      null,
    screenshots:
      versionDetails.find((entry) => entry.versionId === version.id)?.screenshots ||
      [],
  })),
  builds: resources(buildsDocument).map((build) => ({
    id: build.id,
    version: build.version,
    uploadedDate: build.uploadedDate,
    expirationDate: build.expirationDate,
    expired: build.expired,
    minOsVersion: build.minOsVersion,
    processingState: build.processingState,
    usesNonExemptEncryption: build.usesNonExemptEncryption,
  })),
  inAppPurchases: inAppPurchases.map((iap) => ({
    id: iap.id,
    name: iap.name,
    productId: iap.productId,
    inAppPurchaseType: iap.inAppPurchaseType,
    state: iap.state,
    familySharable: iap.familySharable,
    localizations:
      iapDetails.find((entry) => entry.iapId === iap.id)?.localizations || 0,
    configuredPricePoints:
      iapDetails.find((entry) => entry.iapId === iap.id)?.configuredPricePoints ||
      0,
    availability:
      iapDetails.find((entry) => entry.iapId === iap.id)?.availability || null,
    reviewScreenshot:
      iapDetails.find((entry) => entry.iapId === iap.id)?.reviewScreenshot || null,
  })),
  subscriptionGroups: subscriptionGroups.map((group) => ({
    id: group.id,
    referenceName: group.referenceName,
    subscriptions:
      subscriptionsByGroup.find((entry) => entry.groupId === group.id)?.subscriptions || [],
  })),
  betaGroups: resources(betaGroupsDocument).map((group) => ({
    id: group.id,
    name: group.name,
    isInternalGroup: group.isInternalGroup,
    hasAccessToAllBuilds: group.hasAccessToAllBuilds,
    publicLinkEnabled: group.publicLinkEnabled,
  })),
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
