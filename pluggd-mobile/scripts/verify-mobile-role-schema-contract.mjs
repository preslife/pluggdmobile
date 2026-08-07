import { readFileSync } from 'node:fs';

const roleScreen = readFileSync(new URL('../app/auth/role.tsx', import.meta.url), 'utf8');
const migration = readFileSync(
  new URL('../../supabase/migrations/20260801204500_expand_mobile_profile_roles.sql', import.meta.url),
  'utf8',
);

const ecosystemRoles = [
  'artist',
  'producer',
  'dj',
  'promoter',
  'venue',
  'curator',
  'service_provider',
  'manager',
  'fan',
];

if (!roleScreen.includes('profile_type: primaryRole')) {
  throw new Error('Mobile onboarding must persist the selected primary ecosystem role.');
}

if (!migration.includes('drop constraint if exists profiles_profile_type_check')) {
  throw new Error('Role migration must replace the legacy creator/label-only constraint.');
}

for (const role of ecosystemRoles) {
  if (!migration.includes(`'${role}'`)) {
    throw new Error(`Role migration is missing ${role}.`);
  }
}

console.log('mobile role/schema contract verified');
