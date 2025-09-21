-- Labels/Teams RLS Draft
-- Enable RLS and define policies. Assumes auth.uid() is available.

alter table public.labels enable row level security;
alter table public.label_members enable row level security;
alter table public.label_invitations enable row level security;
alter table public.ownership_transfer_requests enable row level security;
alter table public.deletion_requests enable row level security;

-- public.labels
drop policy if exists labels_select_public on public.labels;
create policy labels_select_public on public.labels
for select using (true);

drop policy if exists labels_modify_owners_admins on public.labels;
create policy labels_modify_owners_admins on public.labels
for all using (
  exists (
    select 1 from public.label_members m
    where m.label_id = labels.id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
) with check (
  exists (
    select 1 from public.label_members m
    where m.label_id = labels.id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- public.label_members
drop policy if exists label_members_self_read on public.label_members;
create policy label_members_self_read on public.label_members
for select using (
  user_id = auth.uid() or exists (
    select 1 from public.label_members m
    where m.label_id = label_members.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

drop policy if exists label_members_owner_admin_manage on public.label_members;
create policy label_members_owner_admin_manage on public.label_members
for all using (
  exists (
    select 1 from public.label_members m
    where m.label_id = label_members.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
) with check (
  exists (
    select 1 from public.label_members m
    where m.label_id = label_members.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- public.label_invitations
drop policy if exists label_invites_read_involved on public.label_invitations;
create policy label_invites_read_involved on public.label_invitations
for select using (
  accepted_by_user_id = auth.uid() or exists (
    select 1 from public.label_members m
    where m.label_id = label_invitations.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

drop policy if exists label_invites_manage_owner_admin on public.label_invitations;
create policy label_invites_manage_owner_admin on public.label_invitations
for all using (
  exists (
    select 1 from public.label_members m
    where m.label_id = label_invitations.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
) with check (
  exists (
    select 1 from public.label_members m
    where m.label_id = label_invitations.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

-- public.ownership_transfer_requests
drop policy if exists otr_read_involved on public.ownership_transfer_requests;
create policy otr_read_involved on public.ownership_transfer_requests
for select using (
  from_user_id = auth.uid() or to_user_id = auth.uid() or exists (
    select 1 from public.label_members m
    where m.label_id = ownership_transfer_requests.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

drop policy if exists otr_manage_owner on public.ownership_transfer_requests;
create policy otr_manage_owner on public.ownership_transfer_requests
for all using (
  exists (
    select 1 from public.label_members m
    where m.label_id = ownership_transfer_requests.label_id and m.user_id = auth.uid() and m.role = 'owner'
  )
) with check (
  exists (
    select 1 from public.label_members m
    where m.label_id = ownership_transfer_requests.label_id and m.user_id = auth.uid() and m.role = 'owner'
  )
);

-- public.deletion_requests
drop policy if exists delreq_read_owner_admin on public.deletion_requests;
create policy delreq_read_owner_admin on public.deletion_requests
for select using (
  exists (
    select 1 from public.label_members m
    where m.label_id = deletion_requests.label_id and m.user_id = auth.uid() and m.role in ('owner','admin')
  )
);

drop policy if exists delreq_manage_owner on public.deletion_requests;
create policy delreq_manage_owner on public.deletion_requests
for all using (
  exists (
    select 1 from public.label_members m
    where m.label_id = deletion_requests.label_id and m.user_id = auth.uid() and m.role = 'owner'
  )
) with check (
  exists (
    select 1 from public.label_members m
    where m.label_id = deletion_requests.label_id and m.user_id = auth.uid() and m.role = 'owner'
  )
);


