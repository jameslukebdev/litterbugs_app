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
  floatingMapLogoCard: {
    width: 154,
  },
  floatingMapLogo: {
    width: 112,
    height: 34,
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
  floatingMapInstructionHint: {
    marginTop: 1,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
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
    borderColor: '#9BBBF3',
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
  reportLitterButtonContentFrame: {
    width: '100%',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLitterButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reportLitterButtonContentOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  reportLitterButtonText: {
    color: '#2E539E',
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

wizardHeaderStep: {
  marginTop: 3,
  fontSize: 13,
  fontWeight: '600',
  color: colors.muted,
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

wizardDetailSection: { marginTop: 28 },
wizardSectionTitle: { fontSize: 20, lineHeight: 26, fontFamily: fonts.heading, color: colors.ink, marginBottom: 8 },
wizardStep: {
  flexGrow: 1,
},

wizardEyebrow: {
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 0.8,
  color: colors.primary,
  marginBottom: 10,
},

wizardTitle: {
  fontSize: 28,
  lineHeight: 34,
  fontFamily: fonts.heading,
  color: colors.ink,
  marginBottom: 10,
},

wizardDescription: {
  fontSize: 16,
  lineHeight: 23,
  color: colors.muted,
  marginBottom: 28,
},

wizardLargeInput: {
  minHeight: 58,
  fontSize: 17,
},

wizardFieldLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: colors.body,
  marginTop: 18,
  marginBottom: 7,
},

requiredHint: {
  marginTop: 12,
  fontSize: 13,
  fontWeight: '600',
  color: '#B45309',
},

wizardDisabled: {
  opacity: 0.55,
},


/* Photos */

optionalFieldHeading: {
  flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 10,
},
reportReviewRow: {
  flexDirection: 'row', alignItems: 'center', gap: 12,
  paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.line,
},
reportReviewCopy: { flex: 1, gap: 6 },
reportReviewLabel: { fontSize: 16, fontFamily: fonts.heading, color: colors.ink },
reportReviewTitle: { fontSize: 20, fontFamily: fonts.heading, color: colors.ink, lineHeight: 26 },
reportReviewValue: { fontSize: 16, color: colors.ink, lineHeight: 23 },
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
reportReviewLitterChip: { backgroundColor: '#E5EFFF' },
reportReviewLitterChipText: { color: '#234485' },
reportReviewConditionChip: { backgroundColor: '#E5EFFF' },
reportReviewConditionChipText: { color: '#234485' },
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
  minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end',
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
  resizeMode: 'contain',
  backgroundColor: colors.mist,
},
reportReviewMap: { height: 112, borderRadius: 12, overflow: 'hidden' },
wizardDetailsInput: {
  minHeight: 80,
  textAlignVertical: 'top',
  paddingTop: 14,
  paddingBottom: 14,
},
wizardSingleLineDetailsInput: {
  minHeight: 52,
  textAlignVertical: 'center',
  paddingVertical: 14,
},
optionalStepHeading: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  columnGap: 10,
  rowGap: 4,
  marginBottom: 16,
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
  borderColor: '#ECE8F8',
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
reportPhotoSlotFilled: { borderStyle: 'solid', borderColor: '#A9B8F0' },
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
  borderBottomColor: '#EBE7F8',
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

wizardPhotoContainer: {
  position: 'relative',
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

existingPhotoText: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 20,
  color: colors.muted,
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

wizardRadio: {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: colors.lineStrong,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardRadioSelected: {
  borderColor: colors.primary,
},

wizardRadioInner: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: colors.primary,
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

reviewSection: {
  paddingVertical: 17,
},

reviewHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 8,
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
  color: '#2E539E',
},

reviewValue: {
  fontSize: 17,
  fontWeight: '700',
  color: colors.ink,
},

reviewMuted: {
  fontSize: 15,
  color: colors.subtle,
},

reviewDivider: {
  height: 1,
  backgroundColor: colors.line,
},

reviewPhotoRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

reviewPhoto: {
  width: 78,
  height: 78,
  borderRadius: 12,
  backgroundColor: colors.line,
},

reviewChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

reviewTypeChip: {
  backgroundColor: colors.primary,
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 999,
},

reviewNoteChip: {
  backgroundColor: '#42A5F5',
  paddingHorizontal: 11,
  paddingVertical: 7,
  borderRadius: 999,
},

reviewChipText: {
  color: colors.white,
  fontSize: 13,
  fontWeight: '700',
},

reviewNotes: {
  marginTop: 10,
  fontSize: 15,
  lineHeight: 22,
  color: colors.ink,
},

// Website: the optional starting fund sits in a soft yellow card labelled by the bee.
startingFundCard: {
  marginTop: 8,
  marginBottom: 24,
  padding: 16,
  borderWidth: 2,
  borderColor: '#FFE08A',
  borderRadius: 18,
  backgroundColor: '#FFFBEA',
},

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
  color: '#5F4600',
  fontSize: 17,
  fontFamily: fonts.heading,
},

startingFundText: {
  marginTop: 4,
  color: colors.body,
  fontSize: 14,
  lineHeight: 20,
},

startingFundChoices: {
  marginTop: 16,
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  rowGap: 8,
  gap: 8,
},

startingFundChoice: {
  width: '31.5%',
  minHeight: 52,
  paddingHorizontal: 4,
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
  color: colors.body,
  fontSize: 14,
},

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

startingFundHelper: {
  marginTop: 12,
  color: colors.muted,
  fontSize: 13,
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

wizardArrowButton: {
  width: 52,
  minHeight: 52,
  alignItems: 'center',
  justifyContent: 'center',
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

wizardBackButton: { minHeight: 48, paddingLeft: 12, paddingRight: 18, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 14, borderWidth: 1.5, borderColor: colors.line, borderBottomWidth: 4, borderBottomColor: '#EBE7F8', backgroundColor: colors.white },
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
  sheetTitle: {
    fontSize: 20,
    top: 25,
    fontFamily: fonts.heading,
    color: colors.ink,
    marginBottom: 4,
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
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  cancelBtn: { backgroundColor: colors.line },
  saveBtn: { backgroundColor: colors.primary },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  severityChip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
  },
  severityChipSelected: {
    backgroundColor: colors.primary,
    borderColor: '#FB8C00',
  },
  severityChipText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '500',
  },
  severityChipTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
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
    shadowColor: '#233728',
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
    shadowColor: '#233728',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  photoButton: {
    backgroundColor: '#FFCC80',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.line,
  },
  photoContainer: {
    position: 'relative',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  photoHelper: {
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
    marginBottom: 4,
  },
  section: {
    marginTop: 14,   // adjust to taste (12–20 works great)
    marginbottom: 14,
  },
  typeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.lineStrong,
  },
  typeChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipIcon: {
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 13,
    color: colors.ink,
  },
  typeChipTextSelected: {
    color: colors.white,
    fontWeight: '600',
  },
  typeBox: {
  backgroundColor: colors.primarySoft,
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
},
typeChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
typeChip: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 20,
  backgroundColor: colors.primarySoft,
  borderWidth: 1,
  borderColor: colors.primaryLight,
},
typeChipSelected: {
  backgroundColor: colors.primary,
  borderColor: colors.primaryDark,
},
typeChipIcon: {
  marginRight: 6,
},
typeChipText: {
  fontSize: 13,
  color: colors.ink,
},
typeChipTextSelected: {
  color: colors.white,
  fontWeight: '600',
},
notesBox: {
  backgroundColor:'#E3F2FD',
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#BBDEFB',
},
notesChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},
notesChip: {
  flexDirection: 'row',      // 👈 put icon + text in a row
  alignItems: 'center',      // 👈 vertically center icon + text
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 18,
  backgroundColor: '#D0E8FF',
  borderWidth: 1,
  borderColor: colors.primaryBorder,
},
notesChipSelected: {
  backgroundColor: '#42A5F5',        // stronger pink/red
  borderColor: '#1E88E5',
},
notesChipText: {
  fontSize: 13,
  color: colors.ink,
},
notesChipTextSelected: {
  color: colors.white,
  fontWeight: '600',
},
notesChipIcon: {
  marginRight: 6,
},
footerBar: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  padding: 16,
  gap: 12,
  backgroundColor: 'white',
  borderTopWidth: 1,
  borderColor: 'rgba(0,0,0,0.08)',
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

reportDetailsLoadingText: {
  marginTop: 14,
  color: colors.body,
  fontSize: 15,
  fontWeight: '700',
  textAlign: 'center',
},


/* Main vertical report scroll */

reportPostScrollContent: {
  paddingTop: 72,
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

originalReportText: {
  marginTop: 7,
  color: colors.muted,
  fontSize: 14,
  lineHeight: 20,
},


/* ============================= */
/* Header                        */
/* ============================= */

reportRewardDirectionsRow: {
  flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 16, rowGap: 10, marginBottom: 20,
},
reportRewardSummary: { flexGrow: 1, flexShrink: 1, gap: 3 },
reportRewardAmount: { fontSize: 25, lineHeight: 30, fontFamily: fonts.heading, color: colors.ink },
reportRewardCaption: { fontSize: 12, lineHeight: 17, color: colors.muted },
reportDirectionsButton: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  minHeight: 44, paddingHorizontal: 12, paddingVertical: 10,
  borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.white,
},
reportDirectionsButtonText: { fontSize: 14, fontWeight: '600', color: colors.primary },
reportDetailFacts: {
  gap: 12, paddingBottom: 20,
},
reportDetailFactRow: {
  flexDirection: 'row', alignItems: 'flex-start', gap: 10,
},
reportDetailFactText: {
  flex: 1, fontSize: 15, lineHeight: 22, color: colors.ink,
},
reportDetailDirections: {
  flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '600', color: colors.primary,
},
reportDetailReporter: {
  borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 16,
},
reportDetailDates: {
  paddingTop: 16, gap: 12,
},
reportDetailMetadataRow: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
},
reportDetailMetadataLabel: {
  color: colors.muted, fontSize: 13, lineHeight: 19, flexShrink: 0,
},
reportDetailMetadataValue: {
  color: colors.ink, fontSize: 13, lineHeight: 19, flexShrink: 1, textAlign: 'right',
},
reportDetailSeverityBadge: {
  flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10,
  paddingVertical: 5, borderRadius: 999, backgroundColor: colors.primarySoft, flexShrink: 1,
},
reportDetailSeverityMedium: { backgroundColor: '#FFF3DA' },
reportDetailSeverityHigh: { backgroundColor: '#FBEAEA' },
reportDetailSeverityValue: {
  color: colors.primary, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1,
},
completedReportToolbar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line, flexShrink: 0 },
reportPhotoControl: {
  position: 'absolute', zIndex: 20, minHeight: 44, borderRadius: 22,
  backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  borderWidth: 1, borderColor: colors.line, shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4,
},
reportPhotoMapControl: { left: 32, paddingHorizontal: 12, flexDirection: 'row', gap: 7, maxWidth: '65%' },
reportPhotoCloseControl: { right: 32, width: 44 },
reportPhotoShareControl: { right: 84, width: 44 },
// Website report-action-fund / report-action-clean: coloured fill with a 3-point inset edge.
reportActionRow: { flexDirection: 'row', gap: 10 },
reportActionButton: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderBottomWidth: 4 },
reportCleanButton: { backgroundColor: colors.cleanFill, borderColor: colors.cleanEdge },
reportCleanButtonText: { color: colors.cleanInk, fontSize: 16, fontWeight: '800' },
reportPhotoControlText: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
reportDetailActionFooter: {
  flexShrink: 0, backgroundColor: colors.white, borderTopWidth: 1,
  borderTopColor: colors.line, paddingHorizontal: 20, paddingTop: 12,
},
reportDetailPrimaryAction: {
  marginHorizontal: 0, marginTop: 0, minHeight: 52, borderRadius: 12,
  paddingHorizontal: 36, paddingVertical: 12,
  // Lilac "Clean" action, raised like the website's report-action-clean.
  backgroundColor: colors.cleanFill, borderWidth: 1, borderBottomWidth: 4, borderColor: colors.cleanEdge,
},
reportDetailClaimSpinner: {
  position: 'absolute', right: 10, top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center',
},
reportDetailUtilityRow: {
  paddingHorizontal: 0, paddingTop: 8, paddingBottom: 0, gap: 10,
  elevation: 0,
},
reportDetailSecondaryAction: {
  borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, minHeight: 44, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, gap: 7,
},
reportPostHeader: {
  paddingHorizontal: 22,
  paddingTop: 20,
  paddingBottom: 22,
  backgroundColor: colors.primaryTint,
},

// Website report header: white, colour only in the state's bug and words.
websiteReportHeader: { backgroundColor: colors.white, paddingTop: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: colors.mist },
websiteReportState: { marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 8 },
websiteReportStateText: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '800' },
websiteReportTitle: { marginTop: 0, marginBottom: 10, paddingRight: 104, fontSize: 24, lineHeight: 28 },
websiteReportFacts: { color: colors.muted, fontSize: 13, lineHeight: 18 },
websiteReporterRow: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
websiteReporterName: { color: colors.ink, fontSize: 14, fontWeight: '700' },

websiteReportMeta: { marginTop: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 14, rowGap: 4 },
websiteReportSeverity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
websiteReportSeverityDot: { width: 8, height: 8, borderRadius: 4 },
websiteReportSeverityText: { fontSize: 13, fontWeight: '800' },
websiteByline: { marginTop: 22, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
websiteBylineLabel: { paddingHorizontal: 16, paddingTop: 14, color: colors.muted, fontSize: 12, fontWeight: '800' },
websiteAbout: { marginTop: 6 },
websiteAboutText: { color: '#45434D', fontSize: 15, lineHeight: 22 },
websiteFact: { gap: 5, paddingTop: 17, marginTop: 17, borderTopWidth: 1, borderTopColor: '#ECE8F8' },
websiteFactLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },

reportPostHeaderRegular: {
  paddingBottom: 12,
},

reportPostHeaderCompleted: {
  paddingBottom: 10,
},

reportIdentityCard: {
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 22,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  backgroundColor: colors.white,
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
},

reportPostTitle: {
  marginTop: 14,
  fontSize: 30,
  lineHeight: 36,
  fontFamily: fonts.heading,
  color: colors.ink,
  marginBottom: 12,
},

reportPostTitleRegular: {
  marginTop: 0,
},

rewardBadge: {
  alignSelf: 'flex-start',
  marginBottom: 18,
  paddingHorizontal: 12,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  borderRadius: 999,
  backgroundColor: colors.primary,
},

rewardBadgeText: {
  color: colors.white,
  fontSize: 14,
  fontWeight: '900',
},

reportMetaStack: {
  gap: 11,
  marginBottom: 18,
  padding: 16,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.primaryBorder,
  backgroundColor: colors.white,
},

reportMetaStackCompact: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  columnGap: 18,
  rowGap: 10,
  marginBottom: 8,
  paddingHorizontal: 13,
  paddingVertical: 11,
},

reportMetaStackCompleted: {
  marginBottom: 6,
},

reportMetaStackBelowPhoto: {
  marginHorizontal: 22,
  marginTop: 16,
},

reportMetaStackAfterSeverity: {
  marginTop: 0,
},

reportFeedbackBelowPhoto: {
  marginHorizontal: 22,
},

reportMetaItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

reportMetaItemLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.45,
  marginBottom: 2,
},

reportMetaItemText: {
  fontSize: 14,
  color: colors.muted,
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

reportSeverityPill: {
  alignSelf: 'flex-start',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
  borderWidth: 1,
  marginBottom: 14,
},

reportSeverityBelowPhoto: {
  marginHorizontal: 22,
  marginTop: 16,
  marginBottom: 10,
},

severityLow: {
  backgroundColor: colors.primary,
},

severityMedium: {
  backgroundColor: '#FFB74D',
},

severityHigh: {
  backgroundColor: '#E57373',
},

reportSeverityText: {
  fontSize: 14,
  fontWeight: '800',
  color: colors.white,
},


/* ============================= */
/* Main photo carousel           */
/* ============================= */

reportPhotoCarousel: {
  alignSelf: 'center',
  position: 'relative',
  borderRadius: 22,
  overflow: 'hidden',
  backgroundColor: colors.mist,
},

reportHeroImage: {
  height: 355,
  backgroundColor: colors.line,
},

reportPhotoCounter: {
  position: 'absolute',
  top: 14,
  right: 14,
  backgroundColor: 'rgba(41, 41, 50, 0.72)',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
},

reportPhotoCounterText: {
  color: colors.white,
  fontSize: 12,
  fontWeight: '800',
},

reportPhotoDots: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
  marginTop: 13,
  marginBottom: 4,
},

reportPhotoDot: {
  width: 7,
  height: 7,
  borderRadius: 3.5,
  backgroundColor: colors.lineStrong,
},

reportPhotoDotActive: {
  width: 9,
  height: 9,
  borderRadius: 4.5,
  backgroundColor: colors.primary,
},


/* Loading photo state */

reportPhotoLoadingCard: {
  marginHorizontal: 20,
  height: 260,
  borderRadius: 22,
  backgroundColor: colors.soft,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: colors.line,
},

reportPhotoLoadingText: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '600',
  color: colors.muted,
},


/* No-photo state */

reportNoPhotoCard: {
  marginHorizontal: 20,
  paddingVertical: 27,
  paddingHorizontal: 20,
  borderRadius: 20,
  backgroundColor: colors.soft,
  borderWidth: 1,
  borderColor: colors.line,
  alignItems: 'center',
},

reportNoPhotoIcon: {
  width: 58,
  height: 58,
  borderRadius: 29,
  backgroundColor: colors.mist,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
},

reportNoPhotoTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: colors.body,
},

reportNoPhotoText: {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 19,
  textAlign: 'center',
  color: colors.subtle,
},


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

reportPostSection: {
  marginBottom: 28,
},

reportInfoCard: {
  padding: 17,
  borderRadius: 18,
  borderWidth: 1,
},

reportLitterInfoCard: {
  borderColor: colors.primaryBorder,
  backgroundColor: colors.primaryTint,
},

reportConditionsInfoCard: {
  borderColor: '#C9E0F1',
  backgroundColor: '#EFF7FD',
},

reportDetailsInfoCard: {
  borderColor: colors.line,
  backgroundColor: colors.soft,
},

reportSectionHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 13,
},

reportPostSectionTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: colors.ink,
},


/* Chips */

reportChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 9,
},

reportChip: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingHorizontal: 13,
  paddingVertical: 8,
  borderRadius: 999,
},

reportChipText: {
  fontSize: 13,
  fontWeight: '700',
  color: colors.white,
},

reportTypeChip: {
  backgroundColor: colors.primary,
},

reportNoteChip: {
  backgroundColor: '#42A5F5',
},

/* Typed "Other" litter type */

reportOtherTypeChip: {
  backgroundColor: colors.primarySoft,
  borderWidth: 1,
  borderColor: colors.primary,
},

reportOtherTypeText: {
  fontSize: 13,
  fontWeight: '700',
  color: colors.primary,
},


/* Additional descriptive text */

reportDetailsCard: {
  padding: 17,
  borderRadius: 16,
  backgroundColor: colors.soft,
  borderWidth: 1,
  borderColor: colors.line,
},

reportDetailsText: {
  fontSize: 16,
  lineHeight: 24,
  color: colors.ink,
},

fundingFeedbackCard: {
  marginBottom: 18, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  borderLeftWidth: 3, borderLeftColor: '#D6A34B', borderRadius: 12, backgroundColor: '#FFF9ED',
},
fundingFeedbackTitle: { color: '#754B13', fontSize: 14, lineHeight: 20, fontWeight: '600' },
fundingFeedbackText: { marginTop: 5, color: '#765C34', fontSize: 13, lineHeight: 19 },
fundingFeedbackActions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, marginTop: 2, marginBottom: -6 },
fundingFeedbackAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 },
fundingFeedbackActionText: { color: '#754B13', fontSize: 13, fontWeight: '600' },

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

cleanupButton: {
  minHeight: 52,
  marginTop: 17,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.primary,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: colors.white,
},

cleanupButtonDisabled: {
  opacity: 0.6,
},

cleanupButtonText: {
  color: colors.primary,
  fontSize: 16,
  fontWeight: '800',
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
  borderColor: '#E7CF79',
  borderRadius: 18,
  backgroundColor: '#FFF9DD',
},

cleanupCompleteStatusCard: {
  borderColor: colors.primaryLight,
  backgroundColor: colors.primarySoft,
},

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
  backgroundColor: '#F8E9A6',
},

cleanupCompleteStatusIcon: {
  backgroundColor: colors.primaryBorder,
},

cleanupProgressCopy: {
  flex: 1,
},

cleanupProgressTitle: {
  color: '#664B00',
  fontSize: 18,
  fontWeight: '800',
},

cleanupCompleteStatusTitle: {
  color: colors.primaryDark,
},

cleanupProgressText: {
  marginTop: 5,
  color: '#806715',
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
  color: '#806715',
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
  borderColor: '#D6BE71',
  backgroundColor: '#FFF9DD',
},

cleanupFeedbackActionText: {
  color: '#755900',
  fontSize: 15,
  fontWeight: '800',
},

cleanupReleaseButton: {
  borderWidth: 1,
  borderColor: '#D9A6A1',
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
  color: '#A33A32',
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockCard: {
  marginHorizontal: 22,
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
reportFooter: {
  zIndex: 3,
  elevation: 3,
  flexShrink: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
  backgroundColor: colors.white,
},

reportUtilityBar: {
  zIndex: 2,
  elevation: 2,
  flexShrink: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 12,
  backgroundColor: colors.white,
},

reportUtilityButton: {
  flex: 1,
  minHeight: 50,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},

reportShareButton: {
  minHeight: 50,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: colors.lineStrong,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: colors.white,
},

reportShareButtonText: {
  color: '#B448CF',
  fontSize: 15,
  fontWeight: '800',
},

reportFooterButton: {
  flex: 1,
  minHeight: 52,
  borderRadius: 14,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 7,
},

reportDeleteButton: {
  borderWidth: 2,
  borderColor: '#E57373',
  backgroundColor: colors.white,
},

reportDeleteButtonText: {
  color: '#C94747',
  fontSize: 15,
  fontWeight: '800',
},

reportEditButton: {
  borderWidth: 2,
  borderColor: colors.primary,
  backgroundColor: colors.white,
},

reportEditButtonText: {
  color: colors.primary,
  fontSize: 15,
  fontWeight: '800',
},

reportCloseButton: {
  backgroundColor: colors.white,
  borderWidth: 2,
  borderColor: colors.lineStrong,
},

reportCloseButtonText: {
  color: colors.ink,
  fontSize: 15,
  fontWeight: '800',
},


// Status color and severity icon remain readable without shrinking the marker hit area.
reportMarkerHitLg: {
  width: 88,
  height: 88,
  borderRadius: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.01)',
},

markerRewardBadge: {
  position: 'absolute',
  top: -2,
  zIndex: 2,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: colors.primaryLight,
  borderRadius: 999,
  backgroundColor: colors.white,
},
markerRewardText: {
  color: colors.primaryDark,
  fontSize: 11,
  fontWeight: '900',
},
reportMarkerIconWrapLg: {
  width: 60,
  height: 60,
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 3,
  shadowColor: colors.black,
  shadowOpacity: 0.28,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
},
reportMarkerAmount: {
  width: 48,
  paddingHorizontal: 2,
  fontSize: 17,
  fontWeight: '900',
  textAlign: 'center',
  fontVariant: ['tabular-nums'],
},
reportMarkerStatusBadge: {
  position: 'absolute',
  right: -3,
  bottom: -3,
  width: 24,
  height: 24,
  borderRadius: 12,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.white,
  borderWidth: 2,
  borderColor: colors.ink,
},
reportClusterHit: {
  width: 96,
  height: 80,
  borderRadius: 40,
  alignItems: 'center',
  justifyContent: 'center',
  paddingBottom: 12,
  backgroundColor: 'rgba(0,0,0,0.01)',
},
reportClusterBubble: {
  width: 52,
  height: 52,
  borderRadius: 26,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F3E2F7',
  borderWidth: 3,
  borderColor: '#B448CF',
  shadowColor: colors.black,
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
},
reportClusterText: {
  color: '#8E2AA8',
  fontSize: 17,
  fontWeight: '800',
  fontVariant: ['tabular-nums'],
},
reportClusterStatusRow: {
  position: 'absolute',
  bottom: 0,
  flexDirection: 'row',
  gap: 3,
},
reportClusterStatusBadge: {
  minWidth: 27,
  height: 20,
  borderRadius: 10,
  paddingHorizontal: 4,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  backgroundColor: colors.white,
  borderWidth: 2,
},
reportClusterStatusDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
},
reportClusterStatusCount: {
  fontSize: 10,
  fontWeight: '900',
  lineHeight: 12,
  fontVariant: ['tabular-nums'],
},
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
savingHelper: {
  marginTop: 8,
  color: colors.muted,
  fontSize: 14,
  lineHeight: 20,
  textAlign: 'center',
},



});
