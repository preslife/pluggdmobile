import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const basketStore = read('src/features/store/physicalBasket.ts');
const basketScreen = read('app/commerce/basket.tsx');
const productScreen = read('app/product/[id].tsx');
const marketScreen = read('src/features/editorial/MarketStoreScreen.tsx');
const statusScreen = read('src/commerce/CheckoutStatusScreen.tsx');
const orderScreen = read('app/commerce/order.tsx');
const libraryService = read('src/features/culture/mobileServices.ts');
const backendCheckout = read('../supabase/functions/enhanced-store-checkout/index.ts');
const strictBasket = read('../supabase/functions/enhanced-store-checkout/iosPhysicalBasket.ts');
const webhook = read('../supabase/functions/stripe-webhook/hybridCommerce.ts');
const webhookEntry = read('../supabase/functions/stripe-webhook/index.ts');
const atomicInventory = read('../supabase/migrations/20260825190000_ios_physical_basket_atomic_inventory.sql');
const adminProductManager = read('../src/components/AdminProductManager.tsx');

assert.match(basketStore, /createJSONStorage\(\(\) => AsyncStorage\)/, 'physical basket must persist on-device');
assert.match(basketStore, /pluggd:physical-basket:v1/, 'physical basket persistence key is missing');
assert.match(basketStore, /MAX_PHYSICAL_BASKET_LINES = 20/, 'physical basket line limit must match the backend');
assert.match(basketStore, /eq\('user_id', authData\.user!\.id\)/, 'order reconciliation must be explicitly owner-scoped');
assert.match(basketStore, /status === 'completed'/, 'basket must wait for the completed order state');

assert.match(basketScreen, /clientContext: 'ios_physical_basket'/, 'basket must use the strict iOS physical backend context');
assert.match(basketScreen, /productId: line\.productId,[\s\S]*quantity: line\.quantity,[\s\S]*selectedOptions: line\.selectedOptions/, 'checkout must send product identity, quantity and selected options');
const cartPayload = basketScreen.match(/cartItems: lines\.map\(\(line\) => \(\{([\s\S]*?)\}\)\),/)?.[1] ?? '';
assert.ok(cartPayload, 'strict cart payload was not found');
assert.doesNotMatch(cartPayload, /price|amount|unitPrice/, 'client prices must never enter the checkout payload');
assert.match(basketScreen, /returnUrl: 'pluggd:\/\/commerce\/success'/, 'hosted checkout must return through the native commerce route');
assert.match(basketScreen, /requestId: requestIdRef\.current/, 'basket checkout must have a stable per-attempt idempotency key');
assert.match(basketScreen, /ios_physical_basket_cancel/, 'native cancellation must release a server reservation');
assert.match(basketScreen, /Final shipping charges and the verified live total appear before payment/, 'basket copy must describe only totals this Stripe session actually shows');

assert.match(backendCheckout, /clientContext === 'ios_physical_basket'/, 'backend must isolate the strict native basket branch');
assert.match(backendCheckout, /handleIosPhysicalBasket/, 'backend must route the native basket through strict verification');
assert.match(strictBasket, /ALLOWED_PRODUCT_TYPES/, 'backend must use a physical product allowlist');
for (const field of ['is_active', 'visibility', 'moderation_status', 'currency', 'creator_id', 'owner_type']) {
  assert.match(strictBasket, new RegExp(field), `backend must verify server-owned ${field}`);
}
assert.match(strictBasket, /product_options/, 'backend must resolve product options from the database');
assert.match(strictBasket, /price_modifier/, 'backend must calculate option modifiers on the server');
assert.match(strictBasket, /Client-provided product pricing is not accepted/, 'backend must reject client pricing fields');
assert.match(strictBasket, /prepare_ios_physical_basket_checkout/, 'inventory and order preparation must use one database transaction');
assert.match(strictBasket, /release_ios_physical_basket_inventory/, 'setup failure and native cancellation must use the idempotent release transaction');
const providerCreateIndex = strictBasket.indexOf('stripe.checkout.sessions.create');
const providerLinkIndex = strictBasket.indexOf('stripe_checkout_session_id: session.id');
const atomicPrepareIndex = strictBasket.indexOf('"prepare_ios_physical_basket_checkout"');
const checkoutReturnIndex = strictBasket.indexOf('url: session.url', atomicPrepareIndex);
assert.ok(
  providerCreateIndex >= 0 && providerCreateIndex < providerLinkIndex && providerLinkIndex < atomicPrepareIndex && atomicPrepareIndex < checkoutReturnIndex,
  'provider session must be linked while inventory is planned, then atomically reserved before its URL is returned',
);
assert.match(strictBasket, /stripe_checkout_session_id: session\.id,[\s\S]*status: "open",[\s\S]*inventory_state: "planned"[\s\S]*prepare_ios_physical_basket_checkout/, 'the crash-safe provider link must precede inventory reservation');
assert.match(strictBasket, /existingOrderId[\s\S]*inventory_state === "reserved"[\s\S]*existing\.status === "open"/, 'an idempotent retry must not expose a planned or unlinked provider session');
assert.doesNotMatch(strictBasket, /stock_quantity:\s*Number\(current\.stock_quantity\)/, 'edge code must not restore stock row by row');
assert.match(strictBasket, /preventCheckoutCompletion/, 'setup rollback must stop a hosted session before releasing stock');
assert.match(strictBasket, /providerSession\.status !== "expired"/, 'native cancellation must confirm provider expiry before releasing stock');
assert.match(strictBasket, /external_checkout_sessions/, 'basket checkout must persist an idempotent trusted session');
assert.match(strictBasket, /inventory_state: "planned"/, 'provider session must be linked without claiming inventory is already reserved');
assert.match(atomicInventory, /\{inventory_state\}[\s\S]*'"reserved"'/, 'the atomic database transaction must record reserved inventory');
assert.match(strictBasket, /shipping_address_collection/, 'Stripe must collect a physical shipping address');
assert.match(strictBasket, /payment_method_types:\s*\["card"\]/, 'official basket must not enable delayed payment methods');
assert.match(strictBasket, /pluggd:\/\/commerce\/success/, 'Stripe must return to the native app');

assert.match(webhook, /isIosPhysicalBasket/, 'webhook must keep physical basket handling narrowly tagged');
assert.match(webhook, /amount_subtotal/, 'webhook must reconcile the trusted merchandise subtotal separately from shipping');
assert.match(webhook, /ios_physical_basket_completed/, 'webhook must finalize the native order idempotently');
assert.match(webhook, /complete_ios_physical_basket_checkout/, 'completion must atomically consume stock and finish the order');
assert.match(webhook, /release_ios_physical_basket_inventory/, 'expiry and full refund must restore stock transactionally');
assert.match(webhook, /providerCheckoutId/, 'refund ordering must recover a checkout before its payment intent link is written');
const finalizeBlock = webhook.match(/export async function finalizeHybridCheckout[\s\S]*?(?=async function restoreReservedInventory)/)?.[0] ?? '';
const expiryBlock = webhook.match(/export async function expireHybridCheckout[\s\S]*?(?=export async function reverseHybridCheckout)/)?.[0] ?? '';
assert.ok(finalizeBlock && expiryBlock, 'provider completion and expiry handlers must remain explicit');
assert.doesNotMatch(finalizeBlock, /eq\("stripe_checkout_session_id"/, 'signed completion must recover a trusted checkout before a crash-time provider link exists');
assert.doesNotMatch(expiryBlock, /eq\("stripe_checkout_session_id"/, 'signed expiry must recover a trusted checkout before a crash-time provider link exists');
assert.match(finalizeBlock, /Checkout provider session does not match trusted state/, 'completion fallback must reject an already-linked mismatched session');
assert.match(expiryBlock, /Checkout provider session does not match trusted state/, 'expiry fallback must reject an already-linked mismatched session');
assert.match(webhookEntry, /checkout\.session\.async_payment_failed/, 'failed asynchronous sessions must reconcile any older reservation');

for (const fn of [
  'prepare_ios_physical_basket_checkout',
  'release_ios_physical_basket_inventory',
  'complete_ios_physical_basket_checkout',
]) {
  assert.match(atomicInventory, new RegExp(`create or replace function public\\.${fn}`), `${fn} migration is missing`);
  assert.match(atomicInventory, new RegExp(`revoke all on function public\\.${fn}`), `${fn} must be private by default`);
  assert.match(atomicInventory, new RegExp(`grant execute on function public\\.${fn}`), `${fn} must be service-role callable`);
}
assert.match(atomicInventory, /security definer[\s\S]*set search_path = public, pg_temp/, 'inventory transactions must pin their search path');
assert.match(atomicInventory, /for update;/, 'inventory transitions must lock trusted checkout and stock rows');
assert.match(atomicInventory, /insert into public\.order_items[\s\S]*selected_options,[\s\S]*selected_option_ids/, 'immutable order lines must retain selected option names and IDs');
assert.match(atomicInventory, /v_snapshot_total <> v_checkout\.amount_cents/, 'order preparation must reject snapshot total drift');
assert.match(atomicInventory, /v_state not in \('planned', 'reserved', 'consumed', 'released'\)/, 'unknown or partially restored states must fail closed');
assert.match(atomicInventory, /v_checkout\.status <> 'open'[\s\S]*stripe_checkout_session_id[\s\S]*checkout_url/, 'atomic preparation must require the durably linked provider session and URL');
for (const [column, value] of [
  ['visibility', 'public'],
  ['moderation_status', 'approved'],
  ['currency', 'GBP'],
  ['owner_type', 'pluggd'],
]) {
  assert.match(
    atomicInventory,
    new RegExp(`alter column ${column} set default '${value}'`, 'i'),
    `new PLUGGD merchandise must default ${column} to ${value}`,
  );
}
assert.match(adminProductManager, /from\('store_products'\)[\s\S]*insert\(\[productData\]\)/, 'admin merchandise must be created in the official Store product table');
assert.match(adminProductManager, /SelectItem value="merchandise"/, 'admin must expose the server-approved merchandise product type');
assert.match(adminProductManager, /product_type === 'merchandise'[\s\S]*stock_quantity/, 'admin merchandise must capture physical stock');

assert.match(productScreen, /from\('product_options'\)/, 'Store product options must be loaded before basket insertion');
assert.match(productScreen, /eq\('visibility', 'public'\)/, 'Store product detail must be public');
assert.match(productScreen, /eq\('moderation_status', 'approved'\)/, 'Store product detail must be approved');
assert.match(productScreen, /product\.source === 'store_products'/, 'official physical Store products must use the basket');
assert.match(productScreen, /product\?\.source === 'store_products' \|\| policy\.permittedRail === 'stripe_checkout'/, 'official physical Store products must expose their basket without depending on StoreKit or a direct-checkout rail');
assert.match(productScreen, /FULFILMENT[\s\S]*shipping charges and the final total are shown for review before payment/i, 'physical product detail must truthfully explain fulfilment and final shipping review');
assert.match(productScreen, /functions\.invoke\('create-merch-checkout'/, 'creator merchandise direct checkout must be preserved');
assert.match(productScreen, /product\.source !== 'creator_merchandise'/, 'direct creator checkout must not accept official basket products');

assert.match(marketScreen, /router\.push\('\/commerce\/basket'/, 'the Store masthead must expose the basket');
assert.match(marketScreen, /eq\('visibility', 'public'\)/, 'the Store list must exclude private products');
assert.match(marketScreen, /eq\('moderation_status', 'approved'\)/, 'the Store list must exclude unapproved products');

assert.match(statusScreen, /kind === 'store_order'[\s\S]*reconcilePhysicalBasketOrder/, 'Store returns must use RLS-backed order reconciliation');
assert.match(statusScreen, /result\.state === 'success'\) clearBasket\(\)/, 'the basket must clear only after verified success');
assert.match(orderScreen, /eq\('user_id', authData\.user\.id\)/, 'Store order records must be explicitly owner-scoped');
assert.match(orderScreen, /from\('order_items'\)/, 'Store order records must render all order lines');
assert.match(orderScreen, /kind: 'store_order'/, 'Store order record kind is missing');
assert.match(libraryService, /from\('orders'\)[\s\S]*eq\('user_id', userId\)/, 'Purchases history must load only the signed-in user\'s Store orders');
assert.match(libraryService, /commerce\/order\?id=\$\{order\.id\}&kind=store_order/, 'Store orders must remain reachable from Purchases');

console.log('PASS mobile physical basket contract');
