-- Keep the legacy creator/label profile classification compatible with the
-- role-aware mobile onboarding introduced in profile_roles.
--
-- The app stores the user's primary ecosystem role in profiles.profile_type
-- for existing readers and stores the complete multi-role selection in
-- profile_roles. Production still had the original creator/label-only check,
-- which rejected every new fan, artist, producer, DJ, promoter, venue,
-- curator, service-provider, or manager onboarding submission.

alter table public.profiles
  drop constraint if exists profiles_profile_type_check;

alter table public.profiles
  add constraint profiles_profile_type_check check (
    profile_type in (
      'creator',
      'label',
      'artist',
      'producer',
      'dj',
      'promoter',
      'venue',
      'curator',
      'service_provider',
      'manager',
      'fan'
    )
  );
