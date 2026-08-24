-- Deferred constraint triggers fire at transaction commit, after a
-- SECURITY DEFINER RPC has returned to the authenticated caller. Keep this
-- private trigger function in the trusted database-owner context so it can
-- validate submission photo counts without granting clients access to the
-- private schema.

alter function private.enforce_cleanup_submission_photo_count()
  security definer;

alter function private.enforce_cleanup_submission_photo_count()
  set search_path = '';

revoke all on function private.enforce_cleanup_submission_photo_count()
  from public, anon, authenticated, service_role;

comment on function private.enforce_cleanup_submission_photo_count() is
  'Validates deferred cleanup photo-count constraints as the trusted function owner.';
