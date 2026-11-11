import { useEffect } from 'react';

import { loadActiveCleanupAttempt } from './cleanup';
import { isCleanupInProgress } from './cleanupEligibility';
import { loadCompletedCleanupImpact } from './cleanupImpact';
import { resolveReportPhotoUrls } from './reportPhotoUrls';

// Loads what the open report sheet needs: the report's photos, the active cleanup
// attempt, and the completed-cleanup impact. The state itself stays in MapScreen
// (other handlers set it too); these effects were moved out unchanged.
export default function useSelectedReportLoaders({
  selectedReport,
  currentUserId,
  reportOpenRevision,
  completedCleanupImpactReloadKey,
  getReportPhotoUrl,
  setPhotosLoading,
  setReportPhotoUrls,
  setSelectedCleanupAttempt,
  setCleanupAttemptLoading,
  setCompletedCleanupImpact,
  setCompletedCleanupImpactError,
  setCompletedCleanupImpactLoading,
}) {
  // Load Photos into Existing Report
  useEffect(() => {
    let active = true;

    const loadPhotoUrls = async () => {
      // Always begin a newly opened report on its first photo

      setPhotosLoading(true);

      if (!selectedReport?.photo_paths?.length) {
        if (active) {
          setReportPhotoUrls([]);
          setPhotosLoading(false);
        }
        return;
      }

      try {
        const urls = await resolveReportPhotoUrls(selectedReport.photo_paths, getReportPhotoUrl, firstUrl => {
          if (active) {
            setReportPhotoUrls([firstUrl]);
            setPhotosLoading(false);
          }
        });

        if (active) {
          setReportPhotoUrls(urls);
        }
      } catch (error) {
        console.log('Report photo loading error:', error);
        if (active) setReportPhotoUrls([]);
      } finally {
        if (active) setPhotosLoading(false);
      }
    };

    loadPhotoUrls();

    return () => {
      active = false;
    };
  }, [getReportPhotoUrl, selectedReport?.id, JSON.stringify(selectedReport?.photo_paths), reportOpenRevision]);

  useEffect(() => {
    let active = true;

    if (!selectedReport?.id || !isCleanupInProgress(selectedReport) || !currentUserId) {
      setSelectedCleanupAttempt(null);
      setCleanupAttemptLoading(false);
      return undefined;
    }

    setCleanupAttemptLoading(true);
    loadActiveCleanupAttempt(selectedReport.id)
      .then((attempt) => {
        if (active) setSelectedCleanupAttempt(attempt);
      })
      .catch((error) => {
        console.log('Cleanup attempt load error:', error);
        if (active) setSelectedCleanupAttempt(null);
      })
      .finally(() => {
        if (active) setCleanupAttemptLoading(false);
      });

    return () => {
      active = false;
    };
  }, [currentUserId, selectedReport?.cleanup_state, selectedReport?.id, reportOpenRevision]);

  useEffect(() => {
    let active = true;

    if (!selectedReport?.id || selectedReport.cleanup_state !== 'completed') {
      setCompletedCleanupImpact(null);
      setCompletedCleanupImpactError(null);
      setCompletedCleanupImpactLoading(false);
      return undefined;
    }

    setCompletedCleanupImpactLoading(true);
    setCompletedCleanupImpactError(null);

    loadCompletedCleanupImpact(selectedReport.id)
      .then((impact) => {
        if (!active) return;
        setCompletedCleanupImpact(impact);
        if (!impact) setCompletedCleanupImpactError('cleanup_impact_unavailable');
      })
      .catch((error) => {
        console.log('Completed cleanup impact load error:', error);
        if (active) {
          setCompletedCleanupImpact(null);
          setCompletedCleanupImpactError(error?.message || 'cleanup_impact_unavailable');
        }
      })
      .finally(() => {
        if (active) setCompletedCleanupImpactLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    completedCleanupImpactReloadKey,
    reportOpenRevision,
    selectedReport?.cleanup_state,
    selectedReport?.id,
  ]);
}
