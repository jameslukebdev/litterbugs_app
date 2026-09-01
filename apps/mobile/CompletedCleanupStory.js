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
import ProfileAvatar from './ProfileAvatar';
import {
  cleanupImpactFacts,
  formatCleanupDate,
} from './lib/cleanupImpactPresentation';

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
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : null}

      {failed ? (
        <View style={styles.photoUnavailable}>
          <Ionicons name="image-outline" size={34} color="#5E6B61" />
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
    return (
      <View style={styles.stateCard}>
        <ActivityIndicator size="large" color="#2F7D32" />
        <Text style={styles.stateText}>Loading cleanup impact…</Text>
      </View>
    );
  }

  if (error || !impact) {
    return (
      <View style={styles.stateCard}>
        <Ionicons name="alert-circle-outline" size={34} color="#6F796F" />
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
      <View style={styles.completionBanner}>
        <View style={styles.completionIcon}>
          <Ionicons name="checkmark" size={25} color="#FFFFFF" />
        </View>
        <View style={styles.completionCopy}>
          <Text style={styles.eyebrow}>COMMUNITY IMPACT</Text>
          <Text style={styles.completionTitle}>Cleanup Complete</Text>
        </View>
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
          <CompactRankBadge userId={impact.cleaner?.id} />
          {impact.cleaner?.username ? (
            <Text style={styles.cleanerUsername}>@{impact.cleaner.username}</Text>
          ) : null}
        </View>
        {impact.cleaner?.id && onCleanerPress ? (
          <Ionicons name="chevron-forward" size={21} color="#738076" />
        ) : null}
      </TouchableOpacity>

      <View style={styles.cleanupDateRow}>
        <Ionicons name="calendar-outline" size={18} color="#356B3A" />
        <View style={styles.cleanupDateCopy}>
          <Text style={styles.cleanupDateLabel}>Cleanup date</Text>
          <Text style={styles.cleanupDateText}>
            {formatCleanupDate(impact.attempt.completed_at)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="images-outline" size={21} color="#2F7D32" />
        <Text style={styles.sectionTitle}>After cleanup</Text>
      </View>

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
          <Ionicons name="image-outline" size={34} color="#5E6B61" />
          <Text style={styles.photoUnavailableText}>After photos are unavailable.</Text>
        </View>
      )}

      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionLabel}>What they did</Text>
        <Text style={styles.descriptionText}>{impact.submission.description}</Text>
      </View>

      {facts.length > 0 ? (
        <View style={styles.factsRow}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.factCard}>
              <Ionicons name={fact.icon} size={21} color="#2F7D32" />
              <Text style={styles.factText}>{fact.label}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  story: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 18,
    backgroundColor: '#F5FAF5',
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#E0F2E1',
  },
  completionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F7D32',
  },
  completionCopy: {
    flex: 1,
    marginLeft: 13,
  },
  eyebrow: {
    color: '#4D7551',
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  completionTitle: {
    marginTop: 3,
    color: '#17451C',
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  cleanerRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  cleanerCopy: {
    flex: 1,
    marginLeft: 12,
  },
  cleanerLabel: {
    color: '#647168',
    fontSize: 12,
    fontWeight: '700',
  },
  cleanerName: {
    marginTop: 2,
    color: '#1E2820',
    fontSize: 17,
    fontWeight: '800',
  },
  cleanerUsername: {
    marginTop: 1,
    color: '#6A766D',
    fontSize: 13,
  },
  cleanupDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cleanupDateCopy: {
    marginLeft: 10,
  },
  cleanupDateLabel: {
    color: '#617066',
    fontSize: 12,
    fontWeight: '700',
  },
  cleanupDateText: {
    marginTop: 2,
    color: '#263128',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#1F3922',
    fontSize: 18,
    fontWeight: '900',
  },
  photoScroll: {
    borderRadius: 22,
  },
  photoFrame: {
    height: 380,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#DDE5DE',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 40, 22, 0.28)',
  },
  photoUnavailable: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#E7EEE7',
  },
  emptyPhotos: {
    minHeight: 180,
    borderRadius: 22,
  },
  photoUnavailableText: {
    marginTop: 9,
    color: '#59655B',
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
    backgroundColor: 'rgba(20, 28, 21, 0.72)',
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  descriptionCard: {
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },
  descriptionLabel: {
    color: '#537057',
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  descriptionText: {
    marginTop: 8,
    color: '#273029',
    fontSize: 16,
    lineHeight: 24,
  },
  factsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  factCard: {
    minWidth: '46%',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#E5F1E6',
  },
  factText: {
    flex: 1,
    marginLeft: 9,
    color: '#315B35',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },
  stateCard: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
    padding: 24,
    borderRadius: 22,
    backgroundColor: '#F0F6F0',
  },
  stateTitle: {
    marginTop: 12,
    color: '#283229',
    fontSize: 18,
    fontWeight: '800',
  },
  stateText: {
    marginTop: 9,
    color: '#667068',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#2F7D32',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
