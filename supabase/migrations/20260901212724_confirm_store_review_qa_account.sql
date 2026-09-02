-- Keep one isolated, non-admin account available for simulator acceptance
-- testing and eventual App Store / Play review. The account was created
-- through Supabase Auth, so its identity and password remain managed by Auth.
update auth.users
set
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where id = '99ad392b-e1b1-4cd3-aa98-bdd73c5002e0'::uuid
  and email like 'qa-release-%@litterbugs.app'
  and is_anonymous is false;
