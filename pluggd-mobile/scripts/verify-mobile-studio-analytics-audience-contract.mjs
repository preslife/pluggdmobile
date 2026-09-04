import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const screen = read('src/features/studio/StudioScreens.tsx');
const service = read('src/features/studio/studioAnalyticsService.ts');

assert.match(screen, /\(\[7, 30, 90\] as StudioAnalyticsRange\[\]\)/, 'native Insights must expose 7, 30 and 90 day ranges');
assert.match(screen, /AnalyticsTrendKey = 'plays' \| 'revenueCents' \| 'engagement' \| 'newFollowers'/, 'native trends must cover plays, revenue, engagement and followers');
assert.match(screen, /Tracked saves[\s\S]*supported catalogue saves/, 'partial save coverage must be labelled honestly');
assert.match(screen, /Card views[\s\S]*Connect Card views/, 'windowed view data must identify its real source');
assert.match(screen, /No verified activity exists in this window yet/, 'empty analytics windows must have a truthful state');
assert.match(screen, /PARTIAL DATA/, 'partial optional-table failures must remain visible');
assert.match(screen, /Insights unavailable[\s\S]*Try again/, 'analytics load failures must be recoverable');
assert.match(screen, /buildEmbeddedStudioRoute\('\/studio\/analytics\/revenue', 'Revenue Analytics', '\/studio\/analytics'\)/, 'advanced revenue and attribution must use the exact secure Studio path');

assert.match(service, /from\('creator_metrics'\)[\s\S]*\.eq\('creator_id', user\.id\)[\s\S]*\.gte\('metric_date', startDate\)/, 'creator metrics must be exact-owner and range scoped');
assert.match(service, /from\('user_follows'\)[\s\S]*\.eq\('following_id', user\.id\)/, 'follower history and count must target only the signed-in creator');
assert.match(service, /from\('connect_card_events'\)[\s\S]*\.eq\('connect_user_id', user\.id\)[\s\S]*\.eq\('event_type', 'view_card'\)/, 'Connect Card views must use the owner-select activity log');
assert.match(service, /from\('releases'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'release save coverage must first establish owned release ids');
assert.match(service, /from\('beats'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'beat save coverage must first establish owned beat ids');
assert.match(service, /from\('mixes'\)[\s\S]*\.eq\('owner_user_id', user\.id\)/, 'mix save coverage must first establish owned mix ids');
assert.match(service, /from\('soundboards'\)[\s\S]*\.eq\('creator_id', user\.id\)/, 'Soundboard save coverage must first establish owned board ids');
assert.match(service, /from\('creator_videos'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'video save coverage must first establish owned video ids');
assert.match(service, /sales_revenue_cents[\s\S]*battle_revenue_cents[\s\S]*event_revenue_cents[\s\S]*revenue_cents/, 'revenue totals must use recorded creator metric fields');
assert.doesNotMatch(service, /insert\(|upsert\(|update\(|delete\(|500\s*\/\/\s*Default|Math\.random/, 'native analytics must be read-only and must never invent metric values');
assert.doesNotMatch(service, /service_role|SUPABASE_SERVICE_ROLE/, 'native analytics must never contain a service-role credential');

console.log('PASS mobile Studio analytics and audience contract');
