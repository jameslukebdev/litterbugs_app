import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BrandBug from './BrandBug';
import { cleanupStatusPresentation } from '../lib/cleanupEligibility';
import { cleanupApprovalLabel } from '../lib/cleanupProfile';
import { formatUsd } from '../lib/funding';
import { colors } from '../lib/theme';

// Rows for My activity and Payments, matched to the website's account lists
// (apps/web components/account-dialog.tsx): a bold title, small grey lines under
// it, and a chevron. Status is the bug plus coloured words, never a chip.

const shortDate = (value) => (value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  : '');

const dateTime = (value) => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// Same bugs and words as the map pins; closed reports are plain grey.
function reportStatus(report, closed) {
  if (report.cleanup_state === 'completed') return { label: 'Cleaned up', bug: 'flower', color: colors.done };
  if (closed) return { label: 'Closed', bug: null, color: colors.muted };
  if (report.cleanup_state === 'available') return { label: 'Needs a cleanup', bug: 'ladybug', color: colors.needsCleanup };
  return { label: 'Being cleaned', bug: 'caterpillar', color: colors.beingCleaned };
}

const cleanupRewardStatus = (attempt) => (attempt.dispute_status === 'open'
  ? 'Reward paused for dispute review'
  : attempt.financial_review_status === 'admin_review'
    ? 'Reward paused for review'
    : attempt.financial_review_status === 'better_photos'
      ? 'Replacement photos requested'
      : attempt.first_paid_admin_status === 'pending'
        ? 'First reward is being reviewed'
        : attempt.financial_review_status === 'passed'
          ? 'Reward in 48-hour dispute window'
          : attempt.financial_review_status === 'queued'
            ? 'Photos are being reviewed'
            : attempt.status === 'claimed'
              ? 'Reward held for this cleanup'
              : 'Reward pending');

const payoutStatus = (attempt) => ({
  blocked: 'Awaiting release',
  pending: 'Reward pending',
  processing: 'Sending reward',
  transferred: 'Reward sent',
  failed: 'Reward needs attention',
}[attempt.payout_status] || 'Payout status unavailable');

function ActivityRow({ title, onPress, divided, accessibilityLabel, children }) {
  return (
    <TouchableOpacity
      style={[styles.row, divided && styles.divider]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {children}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.subtle} />
    </TouchableOpacity>
  );
}

export function ReportActivityRow({ report, closed, onPress, divided }) {
  const status = reportStatus(report, closed);
  const title = report.title || 'Litter Report';
  return (
    <ActivityRow title={title} onPress={onPress} divided={divided} accessibilityLabel={`Open ${title}, ${status.label}`}>
      {shortDate(report.created_at) ? <Text style={styles.line}>{shortDate(report.created_at)}</Text> : null}
      <View style={styles.status}>
        {status.bug ? <BrandBug kind={status.bug} size={14} /> : null}
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </ActivityRow>
  );
}

export function CurrentCleanupRow({ attempt, onPress, divided }) {
  const presentation = cleanupStatusPresentation({ cleanup_state: attempt.status }, true);
  const title = attempt.report?.title || 'Litter cleanup';
  return (
    <ActivityRow title={title} onPress={onPress} divided={divided} accessibilityLabel={`Return to ${title}`}>
      {shortDate(attempt.report?.created_at) ? <Text style={styles.line}>{shortDate(attempt.report.created_at)}</Text> : null}
      <Text style={styles.line}>{presentation?.title}{attempt.is_paid ? ` · ${formatUsd(attempt.reward_amount_cents)}` : ''}</Text>
      {attempt.is_paid ? <Text style={styles.line}>{cleanupRewardStatus(attempt)}</Text> : null}
      {attempt.status === 'claimed' && attempt.claim_expires_at ? <Text style={styles.line}>Complete by {dateTime(attempt.claim_expires_at)}</Text> : null}
    </ActivityRow>
  );
}

export function CompletedCleanupRow({ attempt, onPress, divided }) {
  const title = attempt.report?.title || 'Completed litter cleanup';
  return (
    <ActivityRow title={title} onPress={onPress} divided={divided} accessibilityLabel={`Open completed cleanup ${title}`}>
      <Text style={styles.line}>{shortDate(attempt.completed_at) || 'Date unavailable'} · {cleanupApprovalLabel(attempt.approval_method)}</Text>
      {attempt.is_paid ? <Text style={styles.line}>{formatUsd(attempt.reward_amount_cents)} · {payoutStatus(attempt)}</Text> : null}
    </ActivityRow>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white },
  divider: { borderTopWidth: 1, borderTopColor: colors.edge },
  copy: { flex: 1, gap: 3 },
  title: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  line: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
});
