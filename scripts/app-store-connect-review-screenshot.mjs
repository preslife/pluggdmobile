#!/usr/bin/env node

import { createHash, sign } from 'node:crypto';
import { basename } from 'node:path';
import { readFile } from 'node:fs/promises';

const API_ROOT = 'https://api.appstoreconnect.apple.com';
const issuerId = process.env.ASC_ISSUER_ID;
const keyId = process.env.ASC_KEY_ID;
const keyPath = process.env.ASC_KEY_PATH;

const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
};

const iapId = argument('--iap-id');
const subscriptionId = argument('--subscription-id');
const filePath = argument('--file');

if (!issuerId || !keyId || !keyPath) {
  throw new Error('Set ASC_ISSUER_ID, ASC_KEY_ID and ASC_KEY_PATH.');
}
if ((!iapId && !subscriptionId) || (iapId && subscriptionId) || !filePath) {
  throw new Error('Provide exactly one of --iap-id or --subscription-id, plus --file.');
}

const base64url = (value) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString(
    'base64url',
  );

async function createToken() {
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64url({
    alg: 'ES256',
    kid: keyId,
    typ: 'JWT',
  })}.${base64url({
    iss: issuerId,
    iat: now,
    exp: now + 15 * 60,
    aud: 'appstoreconnect-v1',
  })}`;
  const privateKey = await readFile(keyPath, 'utf8');
  const signature = sign('sha256', Buffer.from(signingInput), {
    key: privateKey,
    dsaEncoding: 'ieee-p1363',
  });
  return `${signingInput}.${signature.toString('base64url')}`;
}

const token = await createToken();

async function api(method, path, requestBody) {
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
    const message = body?.errors
      ?.map((error) => error.detail || error.title)
      .join('; ');
    throw new Error(
      `${response.status} ${method} ${path}: ${
        message || 'App Store Connect request failed'
      }`,
    );
  }
  return body;
}

async function uploadOperations(operations, file) {
  for (const operation of operations || []) {
    const offset = Number(operation.offset || 0);
    const length = Number(operation.length || file.byteLength);
    const response = await fetch(operation.url, {
      method: operation.method || 'PUT',
      headers: Object.fromEntries(
        (operation.requestHeaders || []).map((header) => [
          header.name,
          header.value,
        ]),
      ),
      body: file.subarray(offset, offset + length),
    });
    if (!response.ok) {
      throw new Error(
        `${response.status} asset upload failed at offset ${offset}`,
      );
    }
  }
}

const file = await readFile(filePath);
const fileName = basename(filePath);
const checksum = createHash('md5').update(file).digest('hex');

const config = iapId
  ? {
      createPath: '/v1/inAppPurchaseAppStoreReviewScreenshots',
      resourceType: 'inAppPurchaseAppStoreReviewScreenshots',
      relationshipName: 'inAppPurchaseV2',
      relationshipType: 'inAppPurchases',
      relationshipId: iapId,
    }
  : {
      createPath: '/v1/subscriptionAppStoreReviewScreenshots',
      resourceType: 'subscriptionAppStoreReviewScreenshots',
      relationshipName: 'subscription',
      relationshipType: 'subscriptions',
      relationshipId: subscriptionId,
    };

const reservation = await api('POST', config.createPath, {
  data: {
    type: config.resourceType,
    attributes: {
      fileName,
      fileSize: file.byteLength,
    },
    relationships: {
      [config.relationshipName]: {
        data: {
          type: config.relationshipType,
          id: config.relationshipId,
        },
      },
    },
  },
});

const screenshotId = reservation.data.id;
try {
  await uploadOperations(reservation.data.attributes.uploadOperations, file);
  await api('PATCH', `${config.createPath}/${screenshotId}`, {
    data: {
      type: config.resourceType,
      id: screenshotId,
      attributes: {
        sourceFileChecksum: checksum,
        uploaded: true,
      },
    },
  });
} catch (error) {
  await api('DELETE', `${config.createPath}/${screenshotId}`).catch(() => {});
  throw error;
}

const confirmation = await api(
  'GET',
  `${config.createPath}/${screenshotId}`,
);
process.stdout.write(
  `${JSON.stringify(
    {
      id: confirmation.data.id,
      fileName: confirmation.data.attributes.fileName,
      assetDeliveryState:
        confirmation.data.attributes.assetDeliveryState?.state ||
        confirmation.data.attributes.assetDeliveryState,
    },
    null,
    2,
  )}\n`,
);
