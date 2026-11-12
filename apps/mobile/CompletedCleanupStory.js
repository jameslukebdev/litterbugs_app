import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import CompactRankBadge from './CompactRankBadge';
import BrandBug from './components/BrandBug';
import ProfileAvatar from './ProfileAvatar';
import {
  cleanupImpactFacts,
  formatCleanupDate,
} from './lib/cleanupImpactPresentation';
import { hapticSelect } from './lib/haptics';
import { colors, fonts } from './lib/theme';

function AfterPhoto({ url, index, count, width }) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.photoFrame, { width }]}>
      {!failed ? (
        <ExpoImage
          source={url}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={180}
          style={styles.photo}
          onLoadStart={() => setLoading(true)}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setFailed(true);
          }}
          accessibilityLabel={`After-cleanup photo ${index + 1}`}
        />
      ) : null}

      {loading ? (
        <View style={styles.photoOverlay}>
          <ActivityIndicator color={colors.white} />
        </View>
      ) : null}

      {failed ? (
        <View style={styles.photoUnavailable}>
          <Ionicons name="image-outline" size={34} color={colors.body} />
          <Text style={styles.photoUnavailableText}>After photo couldn’t load.</Text>
        </View>
      ) : null}

      {count > 1 ? (
        <View style={styles.photoCount}>
          <Text style={styles.photoCountText}>{index + 1}/{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function CompletedCleanupStory({
  impact,
  loading,
  error,
  photoWidth,
  beforePhotos,
  onCleanerPress,
  onRetry,
}) {
  const [photoSide, setPhotoSide] = useState('after');

  if (loading) {
    return null;
  }

  if (error || !impact) {
    return (
      <View style={styles.stateCard}>
        <Ionicons name="alert-circle-outline" size={34} color={colors.muted} />
        <Text style={styles.stateTitle}>Cleanup details unavailable</Text>
        <Text style={styles.stateText}>
          The report is complete, but its impact details couldn’t be loaded.
        </Text>
        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }

  const cleanerName = impact.cleaner?.display_name || 'Cleaner profile unavailable';
  const facts = cleanupImpactFacts(impact.submission);
  // Time always has its place in the row; older cleanups were sent without it.
  if (!facts.some(fact => fact.icon === 'time-outline')) {
    facts.push({ icon: 'time-outline', value: '–', caption: 'time not recorded', label: 'Time spent was not recorded' });
  }
  // Website report sheet: one photo area with an After cleanup / Before switch.
  const canSwitchPhotos = Boolean(beforePhotos) && impact.afterPhotoUrls.length > 0;
  const showBefore = canSwitchPhotos && photoSide === 'before';

  return (
    <View style={styles.story}>

      {canSwitchPhotos ? (
        <View style={styles.sideSwitch} accessibilityRole="tablist" accessibilityLabel="Choose photos">
          {[['after', 'After cleanup', 'flower', colors.done], ['before', 'Before', 'ladybug', colors.ink]].map(([side, label, bug, ink]) => {
            const selected = photoSide === side;
            return (
              <TouchableOpacity
                key={side}
                style={[styles.sideButton, selected && styles.sideButtonSelected, selected && side === 'after' && styles.sideButtonCleaned]}
                onPress={() => { if (!selected) hapticSelect(); setPhotoSide(side); }}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <BrandBug kind={bug} size={18} />
                <Text style={[styles.sideButtonText, selected && { color: ink }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <Text style={styles.sectionTitle}>After cleanup</Text>
      )}

      {showBefore ? beforePhotos : impact.afterPhotoUrls.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToInterval={photoWidth}
          style={styles.photoScroll}
        >
          {impact.afterPhotoUrls.map((url, index) => (
            <AfterPhoto
              key={`${url}-${index}`}
              url={url}
              index={index}
              count={impact.afterPhotoUrls.length}
              width={photoWidth}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.photoUnavailable, styles.emptyPhotos]}>
          <Ionicons name="image-outline" size={34} color={colors.body} />
          <Text style={styles.photoUnavailableText}>After photos are unavailable.</Text>
        </View>
      )}

      {/* About the cleanup: the cleaner's own words first, then the numbers as one stat row. */}
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>About the cleanup</Text>
        <TouchableOpacity
          style={styles.cleanerRow}
          onPress={onCleanerPress}
          disabled={!impact.cleaner?.id || !onCleanerPress}
          activeOpacity={0.72}
          accessibilityRole={impact.cleaner?.id && onCleanerPress ? 'button' : undefined}
          accessibilityLabel={`Cleaned by ${cleanerName}`}
        >
          <ProfileAvatar profile={impact.cleaner} size={52} />
          <View style={styles.cleanerCopy}>
            <Text style={styles.cleanerLabel}>Cleaned by</Text>
            <Text style={styles.cleanerName}>{cleanerName}</Text>
            <CompactRankBadge userId={impact.cleaner?.id} appearance="plain" />
            {impact.cleaner?.username ? (
              <Text style={styles.cleanerUsername}>@{impact.cleaner.username}</Text>
            ) : null}
          </View>
          {impact.cleaner?.id && onCleanerPress ? (
            <Ionicons name="chevron-forward" size={21} color={colors.muted} />
          ) : null}
        </TouchableOpacity>
        <Text style={styles.cleanupDateText}>Cleaned {formatCleanupDate(impact.attempt.completed_at)}</Text>
        {impact.submission.description ? (
          <View style={styles.commentRow}>
            <Text style={styles.descriptionText}>“{impact.submission.description}”</Text>
          </View>
        ) : null}
        {facts.length > 0 ? (
          <View style={styles.factsRow}>
            {facts.map((fact, index) => (
              <View key={fact.label} style={[styles.factCard, index > 0 && styles.factDivider]} accessible accessibilityLabel={fact.label}>
                <Ionicons name={fact.icon} size={20} color={colors.primary} />
                <Text style={styles.factValue}>{fact.value}</Text>
                <Text style={styles.factText}>{fact.caption}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  story: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, gap: 14, backgroundColor: colors.white },
  completionBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 104 },
  completionTitle: { flexShrink: 1, color: colors.done, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  cleanerRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  cleanerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  cleanerLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  cleanerName: { marginTop: 2, color: colors.ink, fontSize: 16, fontWeight: '700' },
  cleanerUsername: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 13,
  },
  cleanupDateText: { color: colors.muted, fontSize: 13 },
  sideSwitch: { flexDirection: 'row', gap: 6, padding: 4, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  sideButton: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  sideButtonSelected: { borderColor: colors.primary },
  sideButtonCleaned: { borderColor: colors.doneBorder, backgroundColor: colors.doneSoft },
  sideButtonText: { color: colors.body, fontSize: 15, fontWeight: '700' },
  sectionTitle: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  photoScroll: {
    borderRadius: 22,
  },
  photoFrame: {
    height: 380,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.line,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(41, 41, 50, 0.28)',
  },
  photoUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.line,
  },
  emptyPhotos: {
    minHeight: 180,
    borderRadius: 22,
  },
  photoUnavailableText: {
    marginTop: 9,
    color: colors.body,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoCount: {
    position: 'absolute',
    right: 14,
    top: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(41, 41, 50, 0.72)',
  },
  photoCountText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  aboutCard: { padding: 16, gap: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  aboutHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutTitle: { color: colors.ink, fontSize: 17, fontFamily: fonts.heading },
  commentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 2 },
  descriptionText: { flex: 1, color: colors.body, fontSize: 15, lineHeight: 22 },
  factsRow: { flexDirection: 'row', marginTop: 4, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.edge },
  factCard: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 4 },
  factDivider: { borderLeftWidth: 1, borderLeftColor: colors.edge },
  factValue: { color: colors.ink, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  factText: { color: colors.muted, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  stateCard: { minHeight: 200, alignItems: 'center', justifyContent: 'center', margin: 20, padding: 24, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  stateTitle: { marginTop: 12, color: colors.ink, fontSize: 18, fontFamily: fonts.heading },
  stateText: {
    marginTop: 9,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
});
