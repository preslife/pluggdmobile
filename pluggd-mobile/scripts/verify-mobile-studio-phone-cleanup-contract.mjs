import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const studio = read('src/features/studio/StudioScreens.tsx');
const settings = read('app/settings/index.tsx');
const account = read('components/AccountMenuButton.tsx');
const purchases = read('app/purchases.tsx');

assert(studio.includes("import { GlassPanel } from '../../../components/liquid-glass';"), 'Studio must use the established liquid-glass panel');
assert(!studio.includes("colors={['rgba(255,255,255,0.115)', 'rgba(17,17,21,0.92)', 'rgba(2,2,3,0.95)']}"), 'Rejected KPI black/white gradient remains');
assert(!studio.includes("colors={['rgba(255,255,255,0.13)', 'rgba(25,25,29,0.94)', 'rgba(5,5,7,0.95)']}"), 'Rejected zone black/white gradient remains');
assert(!studio.includes("['rgba(255,106,0,0.16)', 'rgba(22,22,27,0.94)', 'rgba(5,5,7,0.98)']"), 'Rejected orange More-card gradient remains');
assert(studio.includes("task.id !== data.nextMove.id"), 'Next Up must deduplicate the calculated next move by task ID');
assert(studio.includes("styles.analyticsMetric, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }"), 'Insights metrics must use semantic theme surfaces');
assert(studio.includes("createStudioAnalyticsPreview(range)"), 'Visibly labelled DEV preview must cover populated Insights rendering');

assert(/appearanceList:\s*\{[\s\S]*?flexDirection:\s*'row'/.test(settings), 'Appearance choices must use the compact horizontal composition');
assert(settings.includes("accessibilityRole=\"radiogroup\""), 'Appearance choices must preserve radio-group semantics');
assert(!settings.includes("id: 'restore-purchases'"), 'Restore Purchases must not remain a separate Settings destination');

assert(!account.includes("{ label: 'Restore Purchases'"), 'Restore Purchases must not remain a separate account-menu row');
assert(account.includes("detail: 'Purchases, receipts and restore'"), 'Purchases & Access must expose restoration context');
assert(account.includes("label: 'Appearance'"), 'Account menu must expose the approved Appearance shortcut');
assert(account.indexOf("label: 'Connect Card'") < account.indexOf("label: 'PLUGGD Progress'"), 'Creator tools must precede progress/account rows');
assert(account.indexOf("label: 'Appearance'") < account.indexOf("label: 'Settings'"), 'Appearance must sit immediately before Settings');
assert(account.includes("if (context !== 'studio') accountItems.push({ label: 'Studio'"), 'Studio must not duplicate itself inside its own account menu');

assert(purchases.includes('Restore {storeName}'), 'Purchases & Access must retain the existing restore entry point');

console.log('PASS mobile Studio physical-phone cleanup contract');
