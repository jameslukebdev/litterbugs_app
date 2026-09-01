-- Keep release-testing records available for financial and cleanup audit history,
-- but remove them from every public discovery and sharing surface.
alter table public.reports
  add column is_sample boolean not null default false;

comment on column public.reports.is_sample is
  'Internal release-test record. Public clients and share routes must exclude these rows.';

update public.reports
set is_sample = true
where id = any (array[
  'fa0538f9-b2ab-4988-a35b-9873bb86743a',
  '5a059b58-3d83-4920-ac22-f174f960c25b',
  '6b0ab09d-9ebd-4bb7-8114-247fe0536548',
  'ebd99e36-aa62-4174-a41c-d23716f6b4eb',
  'a5d16e12-5dd3-495e-a7e8-fbaba97c6622',
  'ea65a1d3-e252-42d9-8519-55355f1b108e',
  '582b86f2-7aa0-45ed-ad0a-6b632cb539aa',
  '9684293f-ac11-49fa-aac6-04a5c3fc0530',
  'b1300013-038a-4ecb-b2cd-e6e6f3f6e0ef',
  '39f0d6ad-5ca4-41c1-8449-778af342ef1d',
  '580f7363-a32b-43f3-bc0a-32a13c7be5cc',
  'f2717d9a-47a5-41a8-83d9-c2a62e1d4fc2'
]::uuid[]);

create index reports_public_discovery_idx
  on public.reports (cleanup_state, expires_at desc)
  where not is_sample;
