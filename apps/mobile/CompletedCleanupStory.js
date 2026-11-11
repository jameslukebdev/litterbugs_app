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
  onCleanerPress,
  onRetry,
}) {
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

  return (
    <View style={styles.story}>
      {/* Website completed cleanup: the flower labels the finished state; no tinted banner. */}
      <View style={styles.completionBanner}>
        <BrandBug kind="flower" size={26} />
        <Text style={styles.completionTitle} accessibilityRole="header">Cleanup complete</Text>
      </View>

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

      <Text style={styles.sectionTitle}>After cleanup</Text>

      {impact.afterPhotoUrls.length > 0 ? (
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

      <Text style={styles.cleanupDateText}>Cleaned {formatCleanupDate(impact.attempt.completed_at)}</Text>

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionLabel}>What they did</Text>
        <Text style={styles.descriptionText}>{impact.submission.description}</Text>
      </View>

      {facts.length > 0 ? (
        <View style={styles.factsRow}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.factCard} accessible accessibilityLabel={fact.label}>
              <Text style={styles.factText}>{fact.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  story: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, gap: 16, backgroundColor: colors.white },
  completionBanner: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingRight: 104 },
  completionTitle: { flexShrink: 1, color: colors.done, fontSize: 22, lineHeight: 27, fontFamily: fonts.heading },
  cleanerRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
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
  cleanupDateText: { color: colors.muted, fontSize: 14 },
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
  descriptionCard: { paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.edge },
  descriptionLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  descriptionText: { marginTop: 5, color: colors.body, fontSize: 15, lineHeight: 22 },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  factCard: { minWidth: '46%', flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  factText: { color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '700' },
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
