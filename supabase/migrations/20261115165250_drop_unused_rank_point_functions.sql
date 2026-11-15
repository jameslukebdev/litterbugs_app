-- Neither function is called by a trigger, another function or a scheduled job. Report points are
-- awarded by the current rank_point_events triggers; the backfill ran once.
drop function if exists private.award_report_created_rank_points();
drop function if exists private.backfill_rank_point_events();
