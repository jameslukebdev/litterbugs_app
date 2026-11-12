import React, { useCallback } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LoadFailure } from './ui';
import BrandBug from './BrandBug';
import useFocusedResource from '../lib/useFocusedResource';
import { formatUsd, loadReporterRewards } from '../lib/funding';
import { colors, fonts } from '../lib/theme';

const labels = { pending: 'Pending payout · check your payout settings', processing: 'Sending to Stripe',
  transferred: 'Sent to Stripe', failed: 'Payment needs attention · we’re reviewing it' };
// Reporter earnings, in the same card style as the rest of Payments: a heading, then
// either the rewards or one quiet line. The policy detail lives on the reward policy page.
export function ReporterEarnings({ userId, onOpenReport, heading = true }) {
  const resource = useFocusedResource(useCallback(() => loadReporterRewards(userId), [userId]),
    { enabled: Boolean(userId), cacheKey: `reporter-rewards:${userId}` });
  const rewards = resource.data ?? [];
  return <View style={{ marginHorizontal: 20 }}>
    {heading ? <Text style={{ marginTop: 24, marginBottom: 12, fontSize: 20, lineHeight: 25, fontFamily: fonts.heading, color: colors.ink }} accessibilityRole="header">Reporter earnings</Text> : null}
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 17 }}>
      {resource.error ? <LoadFailure title="Couldn’t load reporter earnings" onRetry={resource.refresh} />
        : rewards.length ? rewards.map((reward, index) =>
          <TouchableOpacity key={reward.cleanup_attempt_id} accessibilityRole="button" onPress={() => onOpenReport(reward.report_id)} style={{ paddingVertical: 14, borderTopWidth: index ? 1 : 0, borderTopColor: colors.edge }}>
            <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '600' }}>{reward.report?.title || 'Completed litter cleanup'}</Text>
            <Text style={{ marginTop: 3, color: colors.muted, fontSize: 13 }}>{formatUsd(reward.amount_cents)} · {labels[reward.status]}</Text>
          </TouchableOpacity>)
        : <View style={{ alignItems: 'center', paddingVertical: 26, opacity: resource.loading && !resource.hasLoaded ? 0 : 1 }}>
            <BrandBug kind="dragonfly" size={40} />
            <Text style={{ marginTop: 12, color: colors.ink, fontSize: 18, fontFamily: fonts.heading, textAlign: 'center' }}>No reporter earnings yet</Text>
          </View>}
    </View>
  </View>;
}
