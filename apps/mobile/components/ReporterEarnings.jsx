import React, { useCallback } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import useFocusedResource from '../lib/useFocusedResource';
import { formatUsd, loadReporterRewards } from '../lib/funding';

const labels = { pending: 'Pending payout · check your payout settings', processing: 'Sending to Stripe',
  transferred: 'Sent to Stripe', failed: 'Payment needs attention · we’re reviewing it' };
export function ReporterEarnings({ userId, onOpenReport }) {
  const resource = useFocusedResource(useCallback(() => loadReporterRewards(userId), [userId]),
    { enabled: Boolean(userId), cacheKey: `reporter-rewards:${userId}` });
  return <View style={{ padding: 20, backgroundColor: '#fff', borderRadius: 16, marginTop: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#25382A' }}>Reporter earnings</Text>
    <Text style={{ marginTop: 8, color: '#687178' }}>Earn 5% of eligible contributions after a report you create leads to an approved, funded cleanup. This comes from the service fee; the cleaner keeps the full cleanup reward.</Text>
    {resource.loading && !resource.hasLoaded ? <ActivityIndicator accessibilityLabel="Loading reporter earnings" /> : resource.error ?
      <TouchableOpacity accessibilityRole="button" onPress={resource.refresh}><Text style={{ paddingVertical: 14 }}>Retry loading reporter earnings</Text></TouchableOpacity> : resource.data?.length ? resource.data.map(reward =>
        <TouchableOpacity key={reward.cleanup_attempt_id} accessibilityRole="button" onPress={() => onOpenReport(reward.report_id)} style={{ paddingVertical: 14 }}>
          <Text style={{ fontWeight: '600' }}>{reward.report?.title || 'Completed litter cleanup'}</Text>
          <Text>{formatUsd(reward.amount_cents)} · {labels[reward.status]}</Text>
        </TouchableOpacity>) : <Text style={{ marginTop: 12, color: '#687178' }}>No reporter earnings yet. Reporting is free.</Text>}
    <Text style={{ marginTop: 12, color: '#687178' }}>Use your existing payout settings for both rewards. Receiving rewards requires an eligible US Stripe account and age 18 or older. Bank arrival follows your Stripe payout schedule.</Text>
  </View>;
}
