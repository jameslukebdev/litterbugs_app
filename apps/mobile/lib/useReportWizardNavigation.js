import { useLayoutEffect, useRef, useState } from 'react';
import { Animated, Keyboard, PanResponder } from 'react-native';

import { REPORT_STEP_STAGES, trackParticipation } from './analytics';
import { REPORT_STEPS } from './reportOptions';
import { canAdvanceReportStep, nextReportStep } from './reportWizard';

// Which step of the report form is showing and how it moves between steps:
// next/back, jumping from the review screen, swiping, and the slide animation.
// Moved out of MapScreen unchanged.
export default function useReportWizardNavigation({ form, isEditing, selectedReport, photoPreparationStatus }) {
  const [reportStep, setReportStep] = useState(0);
  const [returnToReview, setReturnToReview] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const pendingReportTransitionDirectionRef = useRef(null);

  const resetReportWizard = () => {
    setReturnToReview(false);
    setReportStep(0);
    stepTranslateX.setValue(0);
    stepOpacity.setValue(1);
    setIsTransitioning(false);
  };

  // Determines whether the user can move forward from a given step
  const canAdvanceFromStep = (step = reportStep) => canAdvanceReportStep(step, { form, isEditing, existingPhotoPaths: selectedReport?.photo_paths });

  // Animate between report screens
  useLayoutEffect(() => {
    const direction = pendingReportTransitionDirectionRef.current;
    if (!direction) return undefined;
    pendingReportTransitionDirectionRef.current = null;

    const incomingTransition = Animated.parallel([
      Animated.timing(stepTranslateX, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(stepOpacity, {
        toValue: 1,
        duration: 170,
        useNativeDriver: true,
      }),
    ]);

    incomingTransition.start(() => {
      setIsTransitioning(false);
    });
    return () => incomingTransition.stop();
  }, [reportStep, stepOpacity, stepTranslateX]);

  const transitionToReportStep = (nextStep, direction) => {
    if (
      isTransitioning ||
      nextStep < 0 ||
      nextStep >= REPORT_STEPS.length ||
      nextStep === reportStep
    ) {
      return;
    }
    if (!isEditing) trackParticipation('report', REPORT_STEP_STAGES[nextStep]);

    Keyboard.dismiss();
    setIsTransitioning(true);

    // Slide current screen out
    Animated.parallel([
      Animated.timing(stepTranslateX, {
        toValue: direction > 0 ? -80 : 80,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(stepOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Position incoming screen on opposite side
      stepTranslateX.setValue(direction > 0 ? 80 : -80);
      pendingReportTransitionDirectionRef.current = direction;
      setReportStep(nextStep);
    });
  };

  const goToNextReportStep = () => {
    if (photoPreparationStatus || isTransitioning) return;
    if (reportStep >= REPORT_STEPS.length - 1) return;

    if (!canAdvanceFromStep(reportStep)) return;

    const nextStep = nextReportStep(reportStep, {
      form, isEditing, existingPhotoPaths: selectedReport?.photo_paths,
    }, returnToReview);
    if (nextStep === REPORT_STEPS.length - 1) setReturnToReview(false);
    transitionToReportStep(nextStep, nextStep > reportStep ? 1 : -1);
  };

  const goToPreviousReportStep = () => {
    if (isTransitioning || photoPreparationStatus) return;
    setReturnToReview(false);
    if (reportStep <= 0) return;

    transitionToReportStep(reportStep - 1, -1);
  };

  // Used by the Edit buttons on the review screen
  const jumpToReportStep = (step) => {
    if (step === reportStep || isTransitioning) return;
    if (reportStep === REPORT_STEPS.length - 1) setReturnToReview(true);

    transitionToReportStep(
      step,
      step > reportStep ? 1 : -1
    );
  };

  // Allow horizontal swiping in addition to arrow navigation
  const reportStepPanResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;

      return (
        Math.abs(dx) > 24 &&
        Math.abs(dx) > Math.abs(dy) * 1.2
      );
    },

    onPanResponderRelease: (_, gestureState) => {
      // Swipe left = next
      if (gestureState.dx <= -55) {
        goToNextReportStep();
      }

      // Swipe right = back
      else if (gestureState.dx >= 55) {
        goToPreviousReportStep();
      }
    },
  });

  return {
    reportStep,
    setReportStep,
    returnToReview,
    isTransitioning,
    stepTranslateX,
    stepOpacity,
    resetReportWizard,
    canAdvanceFromStep,
    goToNextReportStep,
    goToPreviousReportStep,
    jumpToReportStep,
    reportStepPanResponder,
  };
}
