import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Share as NativeShare, TurboModuleRegistry } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

import {
  createReportShareModel,
  isInstagramStoriesAvailable,
  isReportShareable,
  prepareNativeReportShareImage,
  shareReportToInstagramStories,
  shareReportWithSystemSheet,
} from './reportSharing';

function loadInstalledRNShare() {
  if (!TurboModuleRegistry.get('RNShare')) return null;

  try {
    return require('react-native-share').default;
  } catch (error) {
    console.log('Native report sharing unavailable:', error);
    return null;
  }
}

const installedRNShare = loadInstalledRNShare();

// Everything the map needs to share a report: the share sheet's open state, which
// share is in flight, and the three ways to share (system sheet, link only, Instagram
// Stories). Moved out of MapScreen unchanged.
export default function useReportSharing({ selectedReport, detailsOpen, completedCleanupImpact, reportPhotoUrls }) {
  const [reportShareSheetOpen, setReportShareSheetOpen] = useState(false);
  const [reportShareBusyAction, setReportShareBusyAction] = useState(null);
  const selectedReportIsShareable = isReportShareable(selectedReport);

  useEffect(() => {
    if (!detailsOpen) setReportShareSheetOpen(false);
  }, [detailsOpen]);

  useEffect(() => {
    setReportShareSheetOpen(false);
  }, [selectedReport?.id]);

  const selectedReportShareModel = () => createReportShareModel({
    report: selectedReport,
    impact: completedCleanupImpact,
    beforePhotoUrl: reportPhotoUrls[0] ?? null,
    afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
  });

  const prepareSelectedReportShareImage = async () => {
    const model = selectedReportShareModel();
    if (!model) return null;

    return prepareNativeReportShareImage({
      model,
      cacheDirectory: FileSystem.cacheDirectory,
      deleteAsync: FileSystem.deleteAsync,
      getInfoAsync: FileSystem.getInfoAsync,
      readAsStringAsync: FileSystem.readAsStringAsync,
      downloadAsync: FileSystem.downloadAsync,
    });
  };

  const shareMapReport = async (report) => {
    if (!isReportShareable(report) || reportShareBusyAction) return;
    setReportShareBusyAction('system');
    try {
      await shareReportWithSystemSheet({ report, platform: Platform.OS, share: NativeShare.share });
    } catch (error) {
      Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.');
    } finally {
      setReportShareBusyAction(null);
    }
  };

  const shareSelectedReport = async () => {
    if (!selectedReportIsShareable || reportShareBusyAction) return;

    setReportShareBusyAction('system');
    try {
      let shareImageUri = null;
      try {
        shareImageUri = await prepareSelectedReportShareImage();
      } catch (imageError) {
        console.log('Report share image unavailable:', imageError);
      }

      await shareReportWithSystemSheet({
        report: selectedReport,
        impact: completedCleanupImpact,
        beforePhotoUrl: reportPhotoUrls[0] ?? null,
        afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
        platform: Platform.OS,
        share: installedRNShare?.open ?? NativeShare.share,
        shareImageUri: installedRNShare ? shareImageUri : null,
      });
      setReportShareSheetOpen(false);
    } catch (error) {
      console.log('Report sharing error:', error);
      Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.');
    } finally {
      setReportShareBusyAction(null);
    }
  };

  const shareSelectedReportLink = async () => {
    if (!selectedReportIsShareable || reportShareBusyAction) return;
    setReportShareBusyAction('link');
    try {
      await shareReportWithSystemSheet({
        report: selectedReport,
        impact: completedCleanupImpact,
        platform: Platform.OS,
        linkOnly: true,
        share: NativeShare.share,
      });
      setReportShareSheetOpen(false);
    } catch (error) {
      console.log('Report link sharing error:', error);
      Alert.alert('Sharing unavailable', 'We couldn’t open the share menu. Please try again.');
    } finally {
      setReportShareBusyAction(null);
    }
  };

  const shareSelectedReportToInstagram = async () => {
    if (!selectedReportIsShareable || reportShareBusyAction) return;

    if (!installedRNShare?.shareSingle || !installedRNShare.Social?.INSTAGRAM_STORIES) {
      Alert.alert(
        'Instagram sharing unavailable',
        'We couldn’t open Instagram Stories. You can still send this report with “Share link”.'
      );
      return;
    }

    let instagramAvailable = false;
    try {
      instagramAvailable = await isInstagramStoriesAvailable({
        platform: Platform.OS,
        isPackageInstalled: installedRNShare.isPackageInstalled,
        canOpenURL: url => Linking.canOpenURL(url),
      });
    } catch (error) {
      console.log('Instagram availability check error:', error);
    }

    if (!instagramAvailable) {
      Alert.alert(
        'Instagram isn’t available',
        'Instagram isn’t available on this phone. Try “Share link” to send the report another way.'
      );
      return;
    }

    setReportShareBusyAction('instagram');
    try {
      const shareImageUri = await prepareSelectedReportShareImage();
      if (!shareImageUri) throw new Error('share_image_unavailable');

      await shareReportToInstagramStories({
        report: selectedReport,
        impact: completedCleanupImpact,
        beforePhotoUrl: reportPhotoUrls[0] ?? null,
        afterPhotoUrl: completedCleanupImpact?.afterPhotoUrls?.[0] ?? null,
        shareImageUri,
        shareSingle: installedRNShare.shareSingle,
        instagramStoriesSocial: installedRNShare.Social.INSTAGRAM_STORIES,
      });
      setReportShareSheetOpen(false);
    } catch (error) {
      console.log('Instagram sharing error:', error);
      const unavailable = /not installed|activity not found|package/i.test(error?.message || '');
      Alert.alert(
        unavailable ? 'Instagram isn’t available' : 'Instagram sharing unavailable',
        unavailable
          ? 'Instagram isn’t available on this phone. Try “Share link” to send the report another way.'
          : 'We couldn’t prepare your Story. Please try again, or use “Share link”.'
      );
    } finally {
      setReportShareBusyAction(null);
    }
  };

  return {
    reportShareSheetOpen,
    setReportShareSheetOpen,
    reportShareBusyAction,
    shareMapReport,
    shareSelectedReport,
    shareSelectedReportLink,
    shareSelectedReportToInstagram,
  };
}
