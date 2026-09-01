-- Four pre-profile seed rows were created during the original map prototype.
-- They have no owner, title, or photos and should never appear as community
-- activity. Marking them as samples is reversible and lets the existing public
-- RLS policy hide them from released clients immediately.
update public.reports
set is_sample = true
where id = any (array[
  '1843ba48-0ceb-4bc7-a7fe-05eded41cb2a'::uuid,
  '4bb1dd37-7ad6-466b-834d-0fe1a6fd6146'::uuid,
  '4612c96c-9546-4dd2-8a4a-c13b2b75a5fc'::uuid,
  'feef1b86-b387-41d6-a160-a263aea73756'::uuid
])
and user_id is null
and title is null
and coalesce(cardinality(photo_paths), 0) = 0;
