import type { Report } from '@litterbugs/report-contract';

export type ReportIdentity = { id: string; is_anonymous?: boolean } | null | undefined;
export type ReportClaims = { sub?: unknown; is_anonymous?: unknown } | null | undefined;

export function realUserId(identity: ReportIdentity): string | null {
  return identity && !identity.is_anonymous ? identity.id : null;
}

export function realUserIdFromClaims(claims: ReportClaims): string | null {
  return claims?.is_anonymous !== true && typeof claims?.sub === 'string' ? claims.sub : null;
}

export function canManageReport(report: Pick<Report, 'user_id'>, userId: string | null): boolean {
  return Boolean(userId && report.user_id === userId);
}
