import { StyleSheet } from 'react-native';
import { BOTTOM_NAV_METRICS } from '../lib/navigationLayout';
import { colors, fonts } from '../lib/theme';
export default StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  initialMapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: colors.white,
  },
  floatingMapHeaderArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
    minHeight: 56,
  },
  floatingMapHeaderCard: {
    position: 'absolute',
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(81, 70, 237, 0.16)',
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(41, 41, 50, 0.16)',
  },
  floatingMapInstructionCard: {
    alignSelf: 'center',
    width: 282,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  floatingMapInstructionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  reportLitterButtonDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    paddingRight: 16,
    alignItems: 'flex-end',
  },
  reportLitterButton: {
    height: BOTTOM_NAV_METRICS.mapControlSize,
    width: 152,
    paddingHorizontal: 10,
    borderRadius: 25,
    borderCurve: 'continuous',
    // Website Report Litter: white pill, soft blue edge, blue Nunito label, dragonfly.
    borderWidth: 2,
    borderColor: colors.reportEdge,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2A225A',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reportLitterButtonText: {
    color: colors.reportInk,
    fontSize: 16,
    fontFamily: fonts.heading,
  },
  reportPlacementCloseWrap: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
  },
  reportPlacementClose: {
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 25,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(41, 41, 50, 0.24)',
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  reportPlacementPinArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ============================= */
/* Multi-step Report Form        */
/* ============================= */

wizardKeyboardView: {
  flex: 1,
  justifyContent: 'flex-end',
},

wizardSheet: {
  height: '92%',
  backgroundColor: colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: 'hidden',
},

wizardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 22,
  paddingTop: 22,
  paddingBottom: 15,
},

wizardHeaderTitle: {
  fontSize: 22,
  fontFamily: fonts.heading,
  color: colors.ink,
},


wizardCloseButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.mist,
},

wizardDivider: {
  height: 1,
  backgroundColor: 'rgba(0,0,0,0.08)',
},

wizardPage: {
  flex: 1,
},

wizardScrollContent: {
  flexGrow: 1,
  paddingHorizontal: 24,
  paddingTop: 34,
  paddingBottom: 34,
},

wizardScrollContentKeyboard: {
  paddingBottom: 140,
},

wizardDismissArea: {
  flexGrow: 1,
},

wizardStep: {
  flexGrow: 1,
},





wizardFieldLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: colors.body,
  marginTop: 18,
  marginBottom: 7,
},


wizardDisabled: {
  opacity: 0.55,
},


/* Photos */

// Website review: each Edit sits level with its section heading.
reportReviewRow: {
  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line,
},
reportReviewCopy: { flex: 1, gap: 6 },
reportReviewLabel: { fontSize: 16, fontFamily: fonts.heading, color: colors.ink },
reportReviewTitle: { fontSize: 20, fontFamily: fonts.heading, color: colors.ink, lineHeight: 26 },
reportReviewChipList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
reportReviewChip: {
  maxWidth: '100%',
  minHeight: 34,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 11,
  paddingVertical: 5,
  borderRadius: 999,
  borderWidth: 0,
},
reportReviewChipText: {
  flexShrink: 1,
  fontSize: 14,
  lineHeight: 18,
  fontWeight: '600',
},
// Website review chips: one pale blue for litter types and site conditions.
reportReviewLitterChip: { backgroundColor: colors.reportSoft },
reportReviewLitterChipText: { color: colors.reportInk },
reportReviewConditionChip: { backgroundColor: colors.reportSoft },
reportReviewConditionChipText: { color: colors.reportInk },
reportReviewSeverityChip: {
  alignSelf: 'flex-start',
  minHeight: 38,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 12,
  borderWidth: 0,
},
reportReviewSeverityText: {
  fontSize: 15,
  lineHeight: 20,
  fontWeight: '700',
},
reportReviewEditButton: {
  minWidth: 44, minHeight: 44, marginTop: -11, justifyContent: 'center', alignItems: 'flex-end',
},
reportReviewHeader: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44,
},
reportReviewMediaSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
reportReviewPhotos: { flexDirection: 'row', gap: 10 },
reportReviewPhoto: {
  width: '31%',
  aspectRatio: 1,
  borderRadius: 12,
  resizeMode: 'cover',
  borderWidth: 1,
  borderColor: colors.reportEdge,
  backgroundColor: colors.mist,
},
reportReviewMap: { height: 132, borderRadius: 12, overflow: 'hidden' },
wizardSingleLineDetailsInput: {
  minHeight: 52,
  textAlignVertical: 'center',
  paddingVertical: 14,
},
optionalStepLabel: { fontSize: 14, fontWeight: '500', color: colors.muted },
litterTileSection: { marginBottom: 24 },
litterTileGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  rowGap: 8,
},
litterTile: {
  width: '48.5%',
  minHeight: 56,
  paddingHorizontal: 10,
  paddingVertical: 10,
  flexDirection: 'row',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: colors.edge,
  borderRadius: 14,
  backgroundColor: colors.white,
},
litterTileSelected: {
  borderWidth: 2,
},
litterTileIcon: { marginRight: 8 },
litterTileText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500', color: colors.ink },
litterTileTextSelected: { fontWeight: '700' },
reportPhotoStage: {
  height: 236,
  flexDirection: 'row',
  gap: 12,
  marginBottom: 20,
},
reportPhotoMain: { flex: 2 },
reportPhotoSide: { flex: 1, gap: 12 },
// Website photo slots: white with a dashed lilac edge, purple "+".
reportPhotoSlot: {
  flex: 1,
  borderRadius: 16,
  backgroundColor: colors.white,
  overflow: 'hidden',
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: colors.primaryBorder,
},
reportPhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
reportPhotoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
// Website: a filled slot gets a solid lilac edge and a white round remove button.
reportPhotoSlotFilled: { borderStyle: 'solid', borderColor: colors.reportEdge },
reportPhotoRemove: {
  position: 'absolute', top: 0, right: 0,
  width: 44, height: 44,
  alignItems: 'center', justifyContent: 'center',
},
reportPhotoRemoveDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.94)' },
reportTitleLabel: {
  color: colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 8,
},
wizardTitleInput: { minHeight: 50, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primaryBorder, backgroundColor: colors.white, color: colors.ink, fontSize: 16 },
photoPreparationSlot: {
  height: 36,
  justifyContent: 'center',
},
photoPreparationInline: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
photoPreparationText: {
  color: colors.muted,
  fontSize: 13,
},
wizardPhotoActions: {
  width: '100%',
  flexDirection: 'row',
  gap: 10,
},

wizardPhotoActionButton: {
  flex: 1,
  minHeight: 48,
  paddingHorizontal: 10,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  borderBottomWidth: 4,
  borderBottomColor: colors.edge,
  borderRadius: 13,
  backgroundColor: colors.white,
},

wizardPhotoActionText: {
  color: colors.primaryDark,
  fontSize: 14,
  fontWeight: '800',
},

wizardPhotoGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 20,
},


wizardPhotoThumb: {
  width: 96,
  height: 96,
  borderRadius: 14,
  backgroundColor: colors.line,
},

existingPhotoNotice: {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  backgroundColor: colors.primarySoft,
  padding: 22,
  alignItems: 'center',
},

existingPhotoTitle: {
  marginTop: 10,
  fontSize: 17,
  fontWeight: '800',
  color: colors.primary,
  textAlign: 'center',
},


replacementPhotoNotice: {
  marginBottom: 14,
  padding: 16,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  borderRadius: 16,
  backgroundColor: colors.primarySoft,
},

keepExistingPhotosText: {
  marginTop: 12,
  color: colors.primary,
  fontSize: 14,
  fontWeight: '800',
  textAlign: 'center',
},


/* Severity */

wizardSeverityList: {
  gap: 16,
  marginTop: 8,
},
wizardSeverityOption: {
  minHeight: 100,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.white,
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 18,
  paddingVertical: 20,
  gap: 16,
},
wizardSeveritySelected: {
  borderWidth: 2,
},
wizardSeverityCopy: { flex: 1, gap: 6 },
wizardSeverityText: {
  fontSize: 18,
  fontWeight: '700',
  color: colors.ink,
},
wizardSeverityDescription: {
  fontSize: 14,
  lineHeight: 20,
  color: colors.muted,
},
wizardSeverityTextSelected: {
  fontWeight: '800',
},




/* Review */

reviewCard: {
  backgroundColor: colors.soft,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.line,
  paddingHorizontal: 18,
  marginBottom: 24,
},



reviewLabel: {
  fontSize: 14,
  fontWeight: '800',
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},

reviewEdit: {
  fontSize: 14,
  fontWeight: '800',
  color: colors.reportInk,
},


reviewMuted: {
  fontSize: 15,
  color: colors.subtle,
},



reviewPhoto: {
  width: 78,
  height: 78,
  borderRadius: 12,
  backgroundColor: colors.line,
},






// Website: the optional starting fund sits in a soft yellow card labelled by the bee.
startingFundCard: {
  marginTop: 8,
  marginBottom: 24,
  padding: 16,
  borderWidth: 2,
  borderColor: colors.yellowBorder,
  borderRadius: 18,
  backgroundColor: colors.yellowPale,
},
cleanerDeadline: { marginBottom: 8, color: colors.body, fontSize: 14, lineHeight: 20 },
cleanerDirectionsButton: { flex: 1, borderColor: colors.line, backgroundColor: colors.white },
cleanerDirectionsText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
cleanerDoneButton: { flex: 1.4, borderColor: colors.primaryDark, backgroundColor: colors.primary },
cleanerDoneText: { color: colors.white, fontSize: 16, fontWeight: '800' },
cleanupGiveUpLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
cleanupGiveUpText: { color: colors.muted, fontSize: 14 },
cleanupGiveUpAction: { color: colors.red, fontWeight: '700' },

startingFundHeading: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

startingFundHeadingCopy: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  columnGap: 10,
  rowGap: 4,
},

startingFundTitle: {
  color: colors.yellow,
  fontSize: 17,
  fontFamily: fonts.heading,
},


startingFundChoices: {
  marginTop: 16,
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

// Website: each amount is as wide as its words, so the row wraps naturally.
startingFundChoice: {
  minWidth: 58,
  minHeight: 48,
  paddingHorizontal: 14,
  paddingVertical: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.line,
  backgroundColor: colors.white,
},

startingFundChoiceSelected: {
  borderColor: colors.primary,
  backgroundColor: colors.primary,
},

startingFundChoiceText: {
  color: colors.body,
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
},

startingFundChoiceTextSelected: {
  color: colors.white,
  fontWeight: '800',
},

startingFundCustom: {
  marginTop: 20,
},

startingFundOtherRow: {
  minHeight: 52,
  flexDirection: 'row',
  alignItems: 'center',
  borderRadius: 12,
  backgroundColor: colors.mist,
},

startingFundDollar: {
  paddingLeft: 14,
  color: colors.body,
  fontSize: 18,
  fontWeight: '600',
},

startingFundOtherInput: {
  flex: 1,
  minHeight: 52,
  paddingHorizontal: 8,
  color: colors.ink,
  fontSize: 18,
  fontWeight: '600',
},

startingFundSummary: {
  marginTop: 20,
  gap: 12,
},

startingFundSummaryRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
},

startingFundSummaryText: {
  marginTop: 12,
  color: colors.body,
  fontSize: 14,
  lineHeight: 20,
},
reportPostingNote: { marginBottom: 10, color: colors.body, fontSize: 14, lineHeight: 20 },

startingFundTotalRow: {
  borderTopWidth: 1,
  borderTopColor: colors.line,
  paddingTop: 12,
},

startingFundTotal: {
  color: colors.ink,
  fontSize: 16,
  fontWeight: '700',
},


wizardSubmitButton: {
  minHeight: 56,
  borderRadius: 16,
  backgroundColor: colors.primary,
  flexDirection: 'row',
  gap: 9,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},

wizardSubmitText: {
  color: colors.white,
  fontSize: 17,
  fontWeight: '800',
},


/* Persistent bottom navigation */

wizardFooter: {
  minHeight: 82,
  paddingHorizontal: 22,
  paddingTop: 12,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderTopColor: colors.line,
  backgroundColor: colors.white,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
},


wizardDots: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
},

wizardProgress: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardProgressText: {
  marginBottom: 6,
  color: colors.muted,
  fontSize: 13,
  fontWeight: '500',
},

wizardDot: {
  width: 7,
  height: 7,
  borderRadius: 3.5,
  backgroundColor: colors.line,
},

// Website: the current step is a longer pill in the progress row.
wizardDotActive: {
  width: 24,
  backgroundColor: colors.primaryLight,
},

wizardBackButton: { minHeight: 48, paddingLeft: 12, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, borderBottomWidth: 4, borderBottomColor: colors.edge, backgroundColor: colors.white },
wizardBackText: { color: colors.ink, fontSize: 16, fontWeight: '800' },
wizardNextButton: { minHeight: 48, paddingLeft: 18, paddingRight: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, backgroundColor: colors.primary },
wizardNextButtonDisabled: { backgroundColor: colors.primaryLight },
wizardNextText: { color: colors.white, fontSize: 16, fontWeight: '800' },
wizardNextSpacer: { width: 96 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingTop: 100,      // ⬅️ Add this
    backgroundColor: colors.white,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    paddingBottom: 85,   // ⬅️ Enough room so last input isn’t jammed
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.mist,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12, marginTop: 6 },
  centerButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.white,
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    // Website map controls: white circles, thin line, dark icons, soft shadow.
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.green,
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  mapTypeButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: colors.white,
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    // Website map controls: white circles, thin line, dark icons, soft shadow.
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.green,
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  photoButton: {
    backgroundColor: colors.yellowBorder,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  section: {
    marginTop: 14,   // adjust to taste (12–20 works great)
    marginbottom: 14,
  },
supportButton: {
  position: "absolute",
  top: 85,
  right: 14,
  backgroundColor: "rgba(255,255,255,0.95)",
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: "center",
  justifyContent: "center",
  // optional shadow (if you already use shadows elsewhere)
  shadowColor: colors.black,
  shadowOpacity: 0.12,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
},

/* ============================= */
/* Redesigned Report Detail View */
/* ============================= */

reportSheet: {
  flex: 1,
  backgroundColor: colors.white,
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  overflow: 'hidden',
},

reportDetailsLoadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  zIndex: 100,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 32,
  backgroundColor: colors.white,
},

reportDetailsLoadingClose: {
  position: 'absolute',
  top: 18,
  right: 18,
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.mist,
},



/* Main vertical report scroll */

// Content starts below the top bar (favourite, share, close), as on the website.
reportPostScrollContent: {
  paddingTop: 140,
  paddingBottom: 24,
},

reportPostScrollContentWithActions: {
  paddingBottom: 24,
},

originalReportDivider: {
  paddingHorizontal: 22,
  paddingTop: 32,
  paddingBottom: 22,
  borderTopWidth: 6,
  borderTopColor: colors.white,
  backgroundColor: colors.white,
},
originalReportEyebrow: {
  color: colors.muted,
  fontSize: 11,
  letterSpacing: 1.05,
  fontWeight: '800',
},
originalReportTitle: {
  marginTop: 5,
  color: colors.ink,
  fontSize: 23,
  lineHeight: 29,
  fontFamily: fonts.heading,
},



/* ============================= */
/* Header                        */
/* ============================= */

completedReportToolbar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, flexShrink: 0 },
reportPhotoControl: {
  position: 'absolute', zIndex: 20, minHeight: 44, alignItems: 'center', justifyContent: 'center',
},
reportTopBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 19, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.mist },
reportBackControl: { position: 'absolute', zIndex: 20, left: 14, minHeight: 44, paddingRight: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
reportBackText: { color: colors.ink, fontSize: 15, fontWeight: '700' },
reportPhotoHideControl: { right: 14, width: 44 },
reportPhotoShareControl: { right: 60, width: 44 },
reportPhotoFavoriteControl: { right: 106, width: 44 },
// Website "Get directions": white, thin lilac line, purple words.
reportDirectionsButton: { minHeight: 48, marginHorizontal: 22, marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 3, borderColor: colors.line, backgroundColor: colors.white },
reportDirectionsText: { color: colors.primaryDark, fontSize: 15, fontWeight: '800' },
// Website report-action-fund / report-action-clean: coloured fill with a 3-point inset edge.
reportActionRow: { flexDirection: 'row', gap: 10 },
reportActionButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4 },
reportCleanButton: { backgroundColor: colors.cleanFill, borderColor: colors.cleanEdge },
reportCleanButtonText: { color: colors.cleanInk, fontSize: 16, fontWeight: '800' },
reportDetailActionFooter: {
  flexShrink: 0, backgroundColor: colors.white, borderTopWidth: 1,
  borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12,
},
reportDetailClaimSpinner: {
  position: 'absolute', right: 10, top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center',
},
reportPostHeader: {
  paddingHorizontal: 22,
  paddingTop: 20,
  paddingBottom: 22,
  backgroundColor: colors.primaryTint,
},

// Website report header: white, colour only in the state's bug and words.
websiteReportHeader: { backgroundColor: colors.white, paddingTop: 4, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.mist },
websiteReportState: { marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
// Owner's preference: cleaned-up indicators sit on the mint fill.
cleanedUpPill: { alignSelf: 'flex-start', marginTop: 2, marginBottom: 12, paddingVertical: 5, paddingLeft: 10, paddingRight: 14, borderRadius: 999, backgroundColor: colors.doneSoft },
websiteReportStateText: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '800' },
websiteReportTitle: { marginTop: 0, marginBottom: 10, fontSize: 24, lineHeight: 28 },
websiteReportFacts: { color: colors.muted, fontSize: 13, lineHeight: 18 },
websiteReporterRow: { minHeight: 56, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 10 },
websiteReporterName: { color: colors.ink, fontSize: 14, fontWeight: '700' },

websiteReportMeta: { marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 },
websiteReportSeverity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
websiteReportSeverityDot: { width: 8, height: 8, borderRadius: 4 },
websiteReportSeverityText: { fontSize: 13, fontWeight: '800' },
// Website: the reporter is a plain row under a thin line, not a boxed card.
websiteByline: { marginTop: 17, paddingTop: 17, marginBottom: 12, borderTopWidth: 1, borderTopColor: colors.edge },
websiteBylineLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
websiteAbout: { marginTop: 6 },
websiteAboutText: { color: colors.body, fontSize: 15, lineHeight: 22 },
websiteFact: { gap: 5, paddingTop: 17, marginTop: 17, borderTopWidth: 1, borderTopColor: colors.edge },
websiteFactLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },




reportPostTitle: {
  marginTop: 14,
  fontSize: 30,
  lineHeight: 36,
  fontFamily: fonts.heading,
  color: colors.ink,
  marginBottom: 12,
},









reportFeedbackBelowPhoto: {
  marginHorizontal: 22,
  marginTop: 16,
},




beforePhotoHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 22,
  paddingTop: 12,
  paddingBottom: 12,
  backgroundColor: colors.white,
},

beforePhotoHeadingText: {
  color: colors.body,
  fontSize: 17,
  fontWeight: '900',
},


/* ============================= */
/* Severity                      */
/* ============================= */








/* ============================= */
/* Main photo carousel           */
/* ============================= */









/* Loading photo state */




/* No-photo state */






/* ============================= */
/* Post body                     */
/* ============================= */

reportPostBody: {
  paddingHorizontal: 22,
  paddingTop: 30,
},

reportPostBodyRegular: {
  paddingTop: 15,
},









/* Chips */


reportChip: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 13,
  paddingVertical: 8,
  borderRadius: 999,
},




/* Typed "Other" litter type */




/* Additional descriptive text */



fundingFeedbackCard: {
  marginBottom: 18, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  borderWidth: 1, borderColor: colors.yellowBorder, borderRadius: 14, backgroundColor: colors.yellowPale,
},
fundingFeedbackTitle: { color: colors.yellow, fontSize: 14, lineHeight: 20, fontWeight: '600' },
fundingFeedbackText: { marginTop: 5, color: colors.yellow, fontSize: 13, lineHeight: 19 },
fundingFeedbackActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, marginTop: 2, marginBottom: -6 },
fundingFeedbackAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
fundingFeedbackActionText: { color: colors.yellow, fontSize: 13, fontWeight: '600' },

fundingCopy: {
  flex: 1,
},

cleanupEligibilityCard: {
  marginBottom: 20,
  paddingTop: 16,
  paddingBottom: 4,
  borderTopWidth: 1,
  borderTopColor: colors.line,
},

cleanupEligibilityHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
},

cleanupEligibilityIcon: {
  width: 24,
  paddingTop: 1,
  alignItems: 'center',
},

cleanupEligibilityCopy: {
  flex: 1,
},

cleanupEligibilityTitle: {
  color: colors.ink,
  fontSize: 15,
  lineHeight: 21,
  fontWeight: '600',
},

cleanupEligibilityText: {
  marginTop: 4,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 19,
},




reportFundButton: {
  // Yellow "Fund" action, raised like the website's report-action-fund.
  borderWidth: 1,
  borderBottomWidth: 4,
  borderColor: colors.fundEdge,
  backgroundColor: colors.fundFill,
},

reportFundButtonText: {
  color: colors.fundInk,
  fontSize: 16,
  fontWeight: '800',
},

cleanupProgressCard: {
  marginBottom: 28,
  padding: 18,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 18,
  backgroundColor: colors.white,
},
cleanupGiveUpLink: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
cleanupGiveUpText: { color: colors.muted, fontSize: 14 },
cleanupGiveUpAction: { color: colors.red, fontWeight: '700' },

cleanupCompleteStatusCard: {},

cleanupProgressHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
},

cleanupProgressIcon: {
  width: 46,
  height: 46,
  borderRadius: 23,
  alignItems: 'center',
  justifyContent: 'center',
},

cleanupCompleteStatusIcon: {},

cleanupProgressCopy: {
  flex: 1,
},

cleanupProgressTitle: {
  color: colors.ink,
  fontSize: 18,
  fontWeight: '800',
},

cleanupCompleteStatusTitle: {
  color: colors.primaryDark,
},

cleanupProgressText: {
  marginTop: 5,
  color: colors.body,
  fontSize: 14,
  lineHeight: 20,
},

cleanupCompleteStatusText: {
  color: colors.primaryDark,
},

cleanupProgressLoading: {
  marginTop: 16,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

cleanupProgressLoadingText: {
  color: colors.yellow,
  fontSize: 14,
  fontWeight: '600',
},

cleanupActionStack: {
  marginTop: 18,
  gap: 10,
},

cleanupActionButton: {
  minHeight: 50,
  borderRadius: 13,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

cleanupNavigateButton: {
  backgroundColor: colors.primary,
},

cleanupCompleteButton: {
  borderWidth: 1,
  borderColor: colors.primaryLight,
  backgroundColor: colors.white,
},

cleanupFeedbackButton: {
  borderWidth: 1,
  borderColor: colors.yellowBorder,
  backgroundColor: colors.yellowSoft,
},

cleanupFeedbackActionText: {
  color: colors.yellow,
  fontSize: 15,
  fontWeight: '800',
},

cleanupReleaseButton: {
  borderWidth: 1,
  borderColor: colors.redBorder,
  backgroundColor: colors.white,
},

cleanupPrimaryActionText: {
  color: colors.white,
  fontSize: 15,
  fontWeight: '800',
},

cleanupSecondaryActionText: {
  color: colors.primary,
  fontSize: 15,
  fontWeight: '800',
},

cleanupReleaseActionText: {
  color: colors.red,
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockCard: {
  marginHorizontal: 0,
  marginBottom: 28,
  padding: 16,
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 12,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: 16,
  backgroundColor: colors.soft,
},

ownerReportLockCopy: {
  flex: 1,
},

ownerReportLockTitle: {
  color: colors.ink,
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockText: {
  marginTop: 4,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 19,
},


/* ============================= */
/* Persistent footer             */
/* ============================= */

reportOwnerMenuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 20 },
reportOwnerMenuBackdrop: { ...StyleSheet.absoluteFillObject },
reportOwnerMenu: { position: 'absolute', right: 20, width: 220, maxWidth: '90%', backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 22 },
reportOwnerMenuItem: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
reportOwnerMenuText: { flexShrink: 1, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '500' },
reportOwnerMenuDivider: { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
reportOwnerFooter: { flexShrink: 0, backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 4 },
reportManageButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
reportManageText: { color: colors.body, fontSize: 14, fontWeight: '500' },













// Status color and severity icon remain readable without shrinking the marker hit area.

savingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(255,255,255,0.88)',
  zIndex: 999,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 28,
},
savingCard: {
  width: '100%',
  maxWidth: 360,
  alignItems: 'center',
  paddingHorizontal: 24,
  paddingVertical: 28,
  borderRadius: 22,
  backgroundColor: colors.white,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  shadowColor: colors.black,
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 7,
},
savingTitle: {
  marginTop: 17,
  color: colors.ink,
  fontSize: 21,
  fontFamily: fonts.heading,
  textAlign: 'center',
},
savingStatus: {
  marginTop: 9,
  color: colors.primary,
  fontSize: 16,
  fontWeight: '800',
  textAlign: 'center',
},



});
