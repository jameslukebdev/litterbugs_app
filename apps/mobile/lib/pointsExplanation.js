// Matches private.award_rank_point_event in
// 20260901185534_harden_report_rank_point_awards.sql.
export const POINTS_RULES = [
  { title: 'Validated report', award: '+1 point', detail: 'Earn a point when your report is accepted after review. Posting a report alone does not guarantee a point.' },
  { title: 'Completed cleanup', award: '+3 points', detail: 'Earn points when your cleanup is confirmed complete, whether it is paid or volunteer work.' },
];
export const POINTS_LIMITS = 'You can earn up to 5 report points in a rolling 24-hour period. Another report by you within 25 metres of a location credited in the previous 7 days does not earn another report point. You can still report new litter there.';
