-- Labels & team management schema

-- Enums ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'label_member_role') THEN
    CREATE TYPE public.label_member_role AS ENUM ('owner','admin','editor','viewer');
  END IF;
END
$$;

-- Normalize legacy role strings before casting
UPDATE public.label_members
SET role = 'editor'::public.label_member_role
WHERE role::text = 'manager';

UPDATE public.label_members
SET role = 'viewer'::public.label_member_role
WHERE role IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'managed_profile_role') THEN
    CREATE TYPE public.managed_profile_role AS ENUM ('primary','distribution_only');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'managed_profile_status') THEN
    CREATE TYPE public.managed_profile_status AS ENUM ('pending','active','removed');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'label_deletion_type') THEN
    CREATE TYPE public.label_deletion_type AS ENUM ('downgrade','delete');
  END IF;
END
$$;

-- Tables ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,}$'),
  name text NOT NULL,
  logo_url text,
  cover_image_url text,
  genre text,
  contact_email text,
  country text,
  owner_user_id uuid REFERENCES auth.users(id),
  created_by_admin boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_labels_owner ON public.labels(owner_user_id);

CREATE TABLE IF NOT EXISTS public.label_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.label_member_role NOT NULL DEFAULT 'viewer',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_label_members_label_user
  ON public.label_members(label_id, user_id);
CREATE INDEX IF NOT EXISTS idx_label_members_role
  ON public.label_members(label_id, role);

CREATE TABLE IF NOT EXISTS public.label_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.label_member_role NOT NULL DEFAULT 'viewer',
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_label_invitations_label ON public.label_invitations(label_id);
CREATE INDEX IF NOT EXISTS idx_label_invitations_email ON public.label_invitations(lower(email));

CREATE TABLE IF NOT EXISTS public.managed_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.managed_profile_role NOT NULL DEFAULT 'primary',
  status public.managed_profile_status NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_managed_profiles_label_profile
  ON public.managed_profiles(label_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_managed_profiles_status
  ON public.managed_profiles(status);

CREATE TABLE IF NOT EXISTS public.ownership_transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email text,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_label ON public.ownership_transfer_requests(label_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_user ON public.ownership_transfer_requests(to_user_id);

CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.label_deletion_type NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_label ON public.deletion_requests(label_id);

CREATE TABLE IF NOT EXISTS public.label_stripe_accounts (
  label_id uuid PRIMARY KEY REFERENCES public.labels(id) ON DELETE CASCADE,
  stripe_account_id text,
  onboarding_complete boolean DEFAULT false,
  requirements jsonb DEFAULT '{}'::jsonb,
  capabilities jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Triggers -------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_labels_updated_at'
  ) THEN
    CREATE TRIGGER trg_labels_updated_at
    BEFORE UPDATE ON public.labels
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_label_stripe_accounts_updated_at'
  ) THEN
    CREATE TRIGGER trg_label_stripe_accounts_updated_at
    BEFORE UPDATE ON public.label_stripe_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- RLS ------------------------------------------------------------------------

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ownership_transfer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.label_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Labels policies
CREATE POLICY labels_public_select ON public.labels
  FOR SELECT USING (true);

CREATE POLICY labels_owner_insert ON public.labels
  FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY labels_owner_update ON public.labels
  FOR UPDATE
  USING (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = labels.id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    auth.uid() = owner_user_id
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = labels.id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  );

-- Label members policies
CREATE POLICY label_members_select ON public.label_members
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm2
      WHERE lm2.label_id = label_members.label_id
        AND lm2.user_id = auth.uid()
        AND lm2.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_members.label_id
        AND l.owner_user_id = auth.uid()
    )
  );

CREATE POLICY label_members_manage ON public.label_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm2
      WHERE lm2.label_id = label_members.label_id
        AND lm2.user_id = auth.uid()
        AND lm2.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_members.label_id
        AND l.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.label_members lm2
      WHERE lm2.label_id = label_members.label_id
        AND lm2.user_id = auth.uid()
        AND lm2.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_members.label_id
        AND l.owner_user_id = auth.uid()
    )
  );

-- Label invitations policies
CREATE POLICY label_invitations_select ON public.label_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_invitations.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_invitations.label_id
        AND l.owner_user_id = auth.uid()
    )
  );

CREATE POLICY label_invitations_manage ON public.label_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_invitations.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_invitations.label_id
        AND l.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_invitations.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_invitations.label_id
        AND l.owner_user_id = auth.uid()
    )
  );

-- Managed profiles policies
CREATE POLICY managed_profiles_select ON public.managed_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = managed_profiles.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin','editor')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = managed_profiles.profile_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY managed_profiles_manage ON public.managed_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = managed_profiles.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = managed_profiles.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin','editor')
    )
  );

-- Ownership transfer policies
CREATE POLICY transfer_requests_select ON public.ownership_transfer_requests
  FOR SELECT
  USING (
    from_user_id = auth.uid()
    OR to_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = ownership_transfer_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  );

CREATE POLICY transfer_requests_manage ON public.ownership_transfer_requests
  FOR ALL
  USING (
    from_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = ownership_transfer_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner')
    )
  )
  WITH CHECK (
    from_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = ownership_transfer_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner')
    )
  );

-- Deletion requests policies
CREATE POLICY deletion_requests_select ON public.deletion_requests
  FOR SELECT
  USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = deletion_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  );

CREATE POLICY deletion_requests_manage ON public.deletion_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = deletion_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = deletion_requests.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
  );

-- Label stripe account policies
CREATE POLICY label_stripe_accounts_select ON public.label_stripe_accounts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_stripe_accounts.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_stripe_accounts.label_id
        AND l.owner_user_id = auth.uid()
    )
  );

CREATE POLICY label_stripe_accounts_manage ON public.label_stripe_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_stripe_accounts.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_stripe_accounts.label_id
        AND l.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = label_stripe_accounts.label_id
        AND lm.user_id = auth.uid()
        AND lm.role IN ('owner','admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.labels l
      WHERE l.id = label_stripe_accounts.label_id
        AND l.owner_user_id = auth.uid()
    )
  );
