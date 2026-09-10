import { StyleSheet } from 'react-native';
import { BOTTOM_NAV_METRICS } from '../lib/navigationLayout';
export default StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
  initialMapLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: '#FFFFFF',
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
    borderColor: 'rgba(47,125,50,0.16)',
    borderRadius: 25,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 20px rgba(31, 35, 40, 0.16)',
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
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  floatingMapInstructionHint: {
    marginTop: 1,
    color: '#667085',
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
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: '#2F7D32',
    backgroundColor: '#2F7D32',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  reportPlacementCloseWrap: {
    position: 'absolute',
    left: 16,
    top: 0,
    zIndex: 2,
  },
  reportPlacementClose: {
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 22,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(55,65,81,0.24)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
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
  backgroundColor: '#FFFFFF',
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
  fontWeight: '800',
  color: '#1F2937',
},

wizardHeaderStep: {
  marginTop: 3,
  fontSize: 13,
  fontWeight: '600',
  color: '#6B7280',
},

wizardCloseButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#F3F4F6',
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
wizardSectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
wizardStep: {
  flexGrow: 1,
},

wizardEyebrow: {
  fontSize: 12,
  fontWeight: '800',
  letterSpacing: 0.8,
  color: '#2F7D32',
  marginBottom: 10,
},

wizardTitle: {
  fontSize: 28,
  lineHeight: 34,
  fontWeight: '800',
  color: '#1F2937',
  marginBottom: 10,
},

wizardDescription: {
  fontSize: 16,
  lineHeight: 23,
  color: '#667085',
  marginBottom: 28,
},

wizardLargeInput: {
  minHeight: 58,
  fontSize: 17,
},

wizardFieldLabel: {
  fontSize: 14,
  fontWeight: '700',
  color: '#4B5563',
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
  paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8ECE9',
},
reportReviewCopy: { flex: 1, gap: 6 },
reportReviewLabel: { fontSize: 14, fontWeight: '500', color: '#667078' },
reportReviewTitle: { fontSize: 20, fontWeight: '700', color: '#26312B', lineHeight: 26 },
reportReviewValue: { fontSize: 16, color: '#374151', lineHeight: 23 },
reportReviewEditButton: {
  minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end',
},
reportReviewHeader: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44,
},
reportReviewMediaSection: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8ECE9' },
reportReviewPhotos: { flexDirection: 'row', gap: 10 },
reportReviewPhoto: {
  width: '31%',
  aspectRatio: 1,
  borderRadius: 12,
  resizeMode: 'contain',
  backgroundColor: '#F5F6F7',
},
reportReviewMap: { height: 112, borderRadius: 12, overflow: 'hidden' },
wizardDetailsInput: {
  minHeight: 80,
  textAlignVertical: 'top',
  paddingTop: 14,
  paddingBottom: 14,
},
optionalStepHeading: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  columnGap: 10,
  rowGap: 4,
  marginBottom: 16,
},
optionalStepLabel: { fontSize: 14, fontWeight: '500', color: '#667078' },
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
  borderWidth: 1,
  borderColor: '#DCE2DE',
  borderRadius: 12,
  backgroundColor: '#FFFFFF',
},
litterTileSelected: {
  borderColor: '#2F7D32',
  backgroundColor: '#EAF4EC',
},
litterTileIcon: { marginRight: 8 },
litterTileText: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '500', color: '#374151' },
litterTileTextSelected: { color: '#245F2A', fontWeight: '600' },
reportPhotoStage: {
  height: 236,
  flexDirection: 'row',
  gap: 12,
  marginBottom: 20,
},
reportPhotoMain: { flex: 2 },
reportPhotoSide: { flex: 1, gap: 12 },
reportPhotoSlot: {
  flex: 1,
  borderRadius: 16,
  backgroundColor: '#F1F4F2',
  overflow: 'hidden',
  borderWidth: 1,
  borderColor: '#DDE5DF',
},
reportPhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
reportPhotoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
reportPhotoRemove: {
  position: 'absolute', top: 0, right: 0,
  width: 44, height: 44,
  alignItems: 'center', justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.3)',
  borderBottomLeftRadius: 16,
},
reportTitleLabel: {
  color: '#374151', fontSize: 16, fontWeight: '600', marginBottom: 10,
},
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
  color: '#667078',
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
  borderColor: '#8FBC92',
  borderRadius: 13,
  backgroundColor: '#F6FBF6',
},

wizardPhotoActionText: {
  color: '#2F7D32',
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
  backgroundColor: '#E5E7EB',
},

existingPhotoNotice: {
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#C8E6C9',
  backgroundColor: '#F1F8E9',
  padding: 22,
  alignItems: 'center',
},

existingPhotoTitle: {
  marginTop: 10,
  fontSize: 17,
  fontWeight: '800',
  color: '#2F7D32',
  textAlign: 'center',
},

existingPhotoText: {
  marginTop: 6,
  fontSize: 14,
  lineHeight: 20,
  color: '#667085',
  textAlign: 'center',
},

replacementPhotoNotice: {
  marginBottom: 14,
  padding: 16,
  borderWidth: 1,
  borderColor: '#C8E6C9',
  borderRadius: 16,
  backgroundColor: '#F1F8E9',
},

keepExistingPhotosText: {
  marginTop: 12,
  color: '#2F7D32',
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
  borderColor: '#DCE2DE',
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 18,
  paddingVertical: 20,
  gap: 16,
},
wizardSeveritySelected: {
  borderColor: '#2F7D32',
  backgroundColor: '#EAF4EC',
},
wizardSeverityCopy: { flex: 1, gap: 6 },
wizardSeverityText: {
  fontSize: 18,
  fontWeight: '700',
  color: '#374151',
},
wizardSeverityDescription: {
  fontSize: 14,
  lineHeight: 20,
  color: '#667078',
},
wizardSeverityTextSelected: {
  color: '#245F2A',
},

wizardRadio: {
  width: 24,
  height: 24,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#D1D5DB',
  alignItems: 'center',
  justifyContent: 'center',
},

wizardRadioSelected: {
  borderColor: '#66BB6A',
},

wizardRadioInner: {
  width: 12,
  height: 12,
  borderRadius: 6,
  backgroundColor: '#66BB6A',
},

/* Review */

reviewCard: {
  backgroundColor: '#F9FAFB',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E5E7EB',
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
  color: '#667085',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
},

reviewEdit: {
  fontSize: 14,
  fontWeight: '800',
  color: '#2F7D32',
},

reviewValue: {
  fontSize: 17,
  fontWeight: '700',
  color: '#1F2937',
},

reviewMuted: {
  fontSize: 15,
  color: '#9CA3AF',
},

reviewDivider: {
  height: 1,
  backgroundColor: '#E5E7EB',
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
  backgroundColor: '#E5E7EB',
},

reviewChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

reviewTypeChip: {
  backgroundColor: '#66BB6A',
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
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},

reviewNotes: {
  marginTop: 10,
  fontSize: 15,
  lineHeight: 22,
  color: '#374151',
},

startingFundCard: {
  marginTop: 8,
  marginBottom: 24,
  paddingVertical: 16,
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
  color: '#26332C',
  fontSize: 17,
  fontWeight: '700',
},

startingFundText: {
  marginTop: 4,
  color: '#526C55',
  fontSize: 14,
  lineHeight: 20,
},

startingFundChoices: {
  marginTop: 16,
  flexDirection: 'row',
  gap: 8,
},

startingFundChoice: {
  flex: 1,
  minHeight: 52,
  paddingHorizontal: 4,
  paddingVertical: 10,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#DCE2DE',
  backgroundColor: '#FFFFFF',
},

startingFundChoiceSelected: {
  borderColor: '#2F7D32',
  backgroundColor: '#EBF4EC',
},

startingFundChoiceText: {
  color: '#405044',
  fontSize: 14,
  fontWeight: '600',
},

startingFundChoiceTextSelected: {
  color: '#2F7D32',
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
  backgroundColor: '#F5F6F7',
},

startingFundDollar: {
  paddingLeft: 14,
  color: '#405044',
  fontSize: 18,
  fontWeight: '600',
},

startingFundOtherInput: {
  flex: 1,
  minHeight: 52,
  paddingHorizontal: 8,
  color: '#1F2937',
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
  color: '#52605A',
  fontSize: 14,
},

startingFundTotalRow: {
  borderTopWidth: 1,
  borderTopColor: '#E5EAE6',
  paddingTop: 12,
},

startingFundTotal: {
  color: '#26332C',
  fontSize: 16,
  fontWeight: '700',
},

startingFundHelper: {
  marginTop: 12,
  color: '#68756B',
  fontSize: 13,
},

wizardSubmitButton: {
  minHeight: 56,
  borderRadius: 16,
  backgroundColor: '#66BB6A',
  flexDirection: 'row',
  gap: 9,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
},

wizardSubmitText: {
  color: '#FFFFFF',
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
  borderTopColor: 'rgba(0,0,0,0.08)',
  backgroundColor: '#FFFFFF',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
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
  gap: 8,
},

wizardProgress: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardProgressText: {
  marginBottom: 5,
  color: '#667085',
  fontSize: 11,
  fontWeight: '800',
},

wizardDot: {
  width: 7,
  height: 7,
  borderRadius: 3.5,
  backgroundColor: '#D1D5DB',
},

wizardDotActive: {
  width: 9,
  height: 9,
  borderRadius: 4.5,
  backgroundColor: '#2F7D32',
},
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingTop: 100,      // ⬅️ Add this
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 12,
    paddingBottom: 85,   // ⬅️ Enough room so last input isn’t jammed
  },
  sheetTitle: {
    fontSize: 20,
    top: 25,
    fontWeight: '800',
    color: '#333',
    marginBottom: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F5F6F7',
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
  cancelBtn: { backgroundColor: '#EAEAEA' },
  saveBtn: { backgroundColor: '#81C784' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  severityChipSelected: {
    backgroundColor: '#81C784',
    borderColor: '#FB8C00',
  },
  severityChipText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  severityChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  centerButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  mapTypeButton: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    width: BOTTOM_NAV_METRICS.mapControlSize,
    height: BOTTOM_NAV_METRICS.mapControlSize,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
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
    backgroundColor: '#ddd',
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
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  photoHelper: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#666',
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
    backgroundColor: '#F5F6F7',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  typeChipSelected: {
    backgroundColor: '#81C784',
    borderColor: '#66BB6A',
  },
  typeChipIcon: {
    marginRight: 6,
  },
  typeChipText: {
    fontSize: 13,
    color: '#333',
  },
  typeChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  typeBox: {
  backgroundColor: '#E8F5E9',
  borderRadius: 12,
  padding: 10,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#C8E6C9',
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
  backgroundColor: '#F1F8E9',
  borderWidth: 1,
  borderColor: '#C5E1A5',
},
typeChipSelected: {
  backgroundColor: '#66BB6A',
  borderColor: '#388E3C',
},
typeChipIcon: {
  marginRight: 6,
},
typeChipText: {
  fontSize: 13,
  color: '#333',
},
typeChipTextSelected: {
  color: '#fff',
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
  borderColor: '#C8E6C9',
},
notesChipSelected: {
  backgroundColor: '#42A5F5',        // stronger pink/red
  borderColor: '#1E88E5',
},
notesChipText: {
  fontSize: 13,
  color: '#333',
},
notesChipTextSelected: {
  color: '#fff',
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
  shadowColor: "#000",
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
  backgroundColor: '#FFFFFF',
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
  backgroundColor: '#FFFFFF',
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
  backgroundColor: '#F3F4F6',
},

reportDetailsLoadingText: {
  marginTop: 14,
  color: '#526057',
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
  paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
  flexDirection: 'row', alignItems: 'center', gap: 8,
  borderTopWidth: 1, borderTopColor: '#E8ECE9', backgroundColor: '#FFFFFF',
},
originalReportTitle: { color: '#1F3922', fontSize: 18, lineHeight: 24, fontWeight: '600' },

originalReportText: {
  marginTop: 7,
  color: '#6A746C',
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
reportRewardAmount: { fontSize: 25, lineHeight: 30, fontWeight: '700', color: '#202625' },
reportRewardCaption: { fontSize: 12, lineHeight: 17, color: '#687178' },
reportDirectionsButton: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  minHeight: 44, paddingHorizontal: 12, paddingVertical: 10,
  borderWidth: 1, borderColor: '#DCE3DE', borderRadius: 12, backgroundColor: '#FFFFFF',
},
reportDirectionsButtonText: { fontSize: 14, fontWeight: '600', color: '#2F7D32' },
reportDetailFacts: {
  gap: 12, paddingBottom: 20,
},
reportDetailFactRow: {
  flexDirection: 'row', alignItems: 'flex-start', gap: 10,
},
reportDetailFactText: {
  flex: 1, fontSize: 15, lineHeight: 22, color: '#3E4842',
},
reportDetailDirections: {
  flex: 1, fontSize: 14, lineHeight: 22, fontWeight: '600', color: '#2F7D32',
},
reportDetailReporter: {
  borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8ECE9', paddingVertical: 16,
},
reportDetailDates: {
  paddingTop: 16, gap: 12,
},
reportDetailMetadataRow: {
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
},
reportDetailMetadataLabel: {
  color: '#687178', fontSize: 13, lineHeight: 19, flexShrink: 0,
},
reportDetailMetadataValue: {
  color: '#3E4842', fontSize: 13, lineHeight: 19, flexShrink: 1, textAlign: 'right',
},
reportDetailSeverityBadge: {
  flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10,
  paddingVertical: 5, borderRadius: 999, backgroundColor: '#EAF3EA', flexShrink: 1,
},
reportDetailSeverityMedium: { backgroundColor: '#FFF3DA' },
reportDetailSeverityHigh: { backgroundColor: '#FBEAEA' },
reportDetailSeverityValue: {
  color: '#2F7D32', fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1,
},
completedReportToolbar: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E8ECE9', flexShrink: 0 },
reportPhotoControl: {
  position: 'absolute', zIndex: 20, minHeight: 44, borderRadius: 22,
  backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  borderWidth: 1, borderColor: '#E9EDE9', shadowColor: '#18251D',
  shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 5, elevation: 4,
},
reportPhotoMapControl: { left: 32, paddingHorizontal: 12, flexDirection: 'row', gap: 7, maxWidth: '65%' },
reportPhotoCloseControl: { right: 32, width: 44 },
reportPhotoControlText: { color: '#303A34', fontSize: 13, lineHeight: 18, fontWeight: '600', flexShrink: 1 },
reportDetailActionFooter: {
  flexShrink: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1,
  borderTopColor: '#E8ECE9', paddingHorizontal: 20, paddingTop: 12,
},
reportDetailPrimaryAction: {
  marginHorizontal: 0, marginTop: 0, minHeight: 52, borderRadius: 12,
  paddingHorizontal: 36, paddingVertical: 12, backgroundColor: '#2F7D32', borderWidth: 0,
},
reportDetailClaimSpinner: {
  position: 'absolute', right: 10, top: 0, bottom: 0, width: 20, justifyContent: 'center', alignItems: 'center',
},
reportDetailUtilityRow: {
  paddingHorizontal: 0, paddingTop: 8, paddingBottom: 0, gap: 10,
  elevation: 0,
},
reportDetailSecondaryAction: {
  borderWidth: 1, borderColor: '#E3E8E5', backgroundColor: '#FFFFFF', minHeight: 44, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, gap: 7,
},
reportPostHeader: {
  paddingHorizontal: 20,
  paddingBottom: 22,
},

reportPostTitle: {
  marginTop: 4,
  fontSize: 24,
  lineHeight: 30,
  fontWeight: '700',
  color: '#1F2937',
  marginBottom: 12,
},

rewardBadge: {
  alignSelf: 'flex-start',
  marginBottom: 12,
  paddingHorizontal: 12,
  paddingVertical: 8,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 7,
  borderRadius: 999,
  backgroundColor: '#E3EEE4',
},

rewardBadgeText: {
  color: '#245F2A',
  fontSize: 14,
  fontWeight: '900',
},

reportMetaStack: {
  gap: 11,
  marginBottom: 18,
},

reportMetaItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: 10,
},

reportMetaItemLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: '#667085',
  textTransform: 'uppercase',
  letterSpacing: 0.45,
  marginBottom: 2,
},

reportMetaItemText: {
  fontSize: 14,
  color: '#667085',
},

beforePhotoHeading: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  paddingHorizontal: 22,
  paddingBottom: 12,
},

beforePhotoHeadingText: {
  color: '#4F5A52',
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
},

severityLow: {
  backgroundColor: '#66BB6A',
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
  color: '#FFFFFF',
},


/* ============================= */
/* Main photo carousel           */
/* ============================= */

reportPhotoCarousel: {
  alignSelf: 'center',
  position: 'relative',
  borderRadius: 22,
  overflow: 'hidden',
  backgroundColor: '#F3F4F6',
},

reportHeroImage: {
  height: 355,
  backgroundColor: '#E5E7EB',
},

reportPhotoCounter: {
  position: 'absolute',
  top: 14,
  right: 14,
  backgroundColor: 'rgba(17,24,39,0.72)',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 999,
},

reportPhotoCounterText: {
  color: '#FFFFFF',
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
  backgroundColor: '#D1D5DB',
},

reportPhotoDotActive: {
  width: 9,
  height: 9,
  borderRadius: 4.5,
  backgroundColor: '#2F7D32',
},


/* Loading photo state */

reportPhotoLoadingCard: {
  marginHorizontal: 20,
  height: 260,
  borderRadius: 22,
  backgroundColor: '#F9FAFB',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportPhotoLoadingText: {
  marginTop: 12,
  fontSize: 14,
  fontWeight: '600',
  color: '#667085',
},


/* No-photo state */

reportNoPhotoCard: {
  marginHorizontal: 20,
  paddingVertical: 27,
  paddingHorizontal: 20,
  borderRadius: 20,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
  alignItems: 'center',
},

reportNoPhotoIcon: {
  width: 58,
  height: 58,
  borderRadius: 29,
  backgroundColor: '#F3F4F6',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
},

reportNoPhotoTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#475467',
},

reportNoPhotoText: {
  marginTop: 4,
  fontSize: 13,
  lineHeight: 19,
  textAlign: 'center',
  color: '#98A2B3',
},


/* ============================= */
/* Post body                     */
/* ============================= */

reportPostBody: {
  paddingHorizontal: 22,
  paddingTop: 30,
},

reportPostSection: {
  marginBottom: 28,
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
  color: '#1F2937',
},


/* Chips */

reportChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 9,
},

reportChip: {
  paddingHorizontal: 13,
  paddingVertical: 8,
  borderRadius: 999,
},

reportChipText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#FFFFFF',
},

reportTypeChip: {
  backgroundColor: '#66BB6A',
},

reportNoteChip: {
  backgroundColor: '#42A5F5',
},

/* Typed "Other" litter type */

reportOtherTypeChip: {
  backgroundColor: '#F1F8E9',
  borderWidth: 1,
  borderColor: '#A5D6A7',
},

reportOtherTypeText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#2F7D32',
},


/* Additional descriptive text */

reportDetailsCard: {
  padding: 17,
  borderRadius: 16,
  backgroundColor: '#F9FAFB',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportDetailsText: {
  fontSize: 16,
  lineHeight: 24,
  color: '#374151',
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
  borderTopColor: '#E8ECE9',
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
  color: '#303A34',
  fontSize: 15,
  lineHeight: 21,
  fontWeight: '600',
},

cleanupEligibilityText: {
  marginTop: 4,
  color: '#687178',
  fontSize: 13,
  lineHeight: 19,
},

cleanupButton: {
  minHeight: 52,
  marginTop: 17,
  borderRadius: 14,
  borderWidth: 2,
  borderColor: '#66BB6A',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#FFFFFF',
},

cleanupButtonDisabled: {
  opacity: 0.6,
},

cleanupButtonText: {
  color: '#2F7D32',
  fontSize: 16,
  fontWeight: '800',
},

reportFundButton: {
  borderWidth: 2,
  borderColor: '#66BB6A',
  backgroundColor: '#FFFFFF',
},

reportFundButtonText: {
  color: '#2F7D32',
  fontSize: 15,
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
  borderColor: '#9CCB9F',
  backgroundColor: '#EDF8EE',
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
  backgroundColor: '#D4ECD6',
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
  color: '#245F28',
},

cleanupProgressText: {
  marginTop: 5,
  color: '#806715',
  fontSize: 14,
  lineHeight: 20,
},

cleanupCompleteStatusText: {
  color: '#3E7041',
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
  backgroundColor: '#2F7D32',
},

cleanupCompleteButton: {
  borderWidth: 1,
  borderColor: '#8FBC92',
  backgroundColor: '#FFFFFF',
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
  backgroundColor: '#FFFFFF',
},

cleanupPrimaryActionText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

cleanupSecondaryActionText: {
  color: '#2F7D32',
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
  borderColor: '#D8E0D9',
  borderRadius: 16,
  backgroundColor: '#F6F8F6',
},

ownerReportLockCopy: {
  flex: 1,
},

ownerReportLockTitle: {
  color: '#344638',
  fontSize: 15,
  fontWeight: '800',
},

ownerReportLockText: {
  marginTop: 4,
  color: '#5F6E62',
  fontSize: 13,
  lineHeight: 19,
},


/* ============================= */
/* Persistent footer             */
/* ============================= */

reportOwnerMenuOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, elevation: 20 },
reportOwnerMenuBackdrop: { ...StyleSheet.absoluteFillObject },
reportOwnerMenu: { position: 'absolute', right: 20, width: 220, maxWidth: '90%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E2E7E3', shadowColor: '#17251C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 22 },
reportOwnerMenuItem: { minHeight: 52, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
reportOwnerMenuText: { flexShrink: 1, color: '#303A34', fontSize: 15, lineHeight: 21, fontWeight: '500' },
reportOwnerMenuDivider: { height: 1, backgroundColor: '#E8ECE9', marginHorizontal: 14 },
reportOwnerFooter: { flexShrink: 0, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 4 },
reportManageButton: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
reportManageText: { color: '#4F5C63', fontSize: 14, fontWeight: '500' },
reportFooter: {
  zIndex: 3,
  elevation: 3,
  flexShrink: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
  backgroundColor: '#FFFFFF',
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
  backgroundColor: '#FFFFFF',
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
  borderColor: '#CDD5D0',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  backgroundColor: '#FFFFFF',
},

reportShareButtonText: {
  color: '#4F5C63',
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
  backgroundColor: '#FFFFFF',
},

reportDeleteButtonText: {
  color: '#C94747',
  fontSize: 15,
  fontWeight: '800',
},

reportEditButton: {
  borderWidth: 2,
  borderColor: '#66BB6A',
  backgroundColor: '#FFFFFF',
},

reportEditButtonText: {
  color: '#2F7D32',
  fontSize: 15,
  fontWeight: '800',
},

reportCloseButton: {
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#D1D5DB',
},

reportCloseButtonText: {
  color: '#374151',
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
  borderColor: '#8FBC92',
  borderRadius: 999,
  backgroundColor: '#FFFFFF',
},
markerRewardText: {
  color: '#245F2A',
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
  borderColor: '#FFFFFF',
  shadowColor: '#000000',
  shadowOpacity: 0.28,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
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
  backgroundColor: '#FFFFFF',
  borderWidth: 2,
  borderColor: '#374151',
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
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#D9E8DA',
  shadowColor: '#000000',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 5 },
  elevation: 7,
},
savingTitle: {
  marginTop: 17,
  color: '#202428',
  fontSize: 21,
  fontWeight: '900',
  textAlign: 'center',
},
savingStatus: {
  marginTop: 9,
  color: '#2F7D32',
  fontSize: 16,
  fontWeight: '800',
  textAlign: 'center',
},
savingHelper: {
  marginTop: 8,
  color: '#667078',
  fontSize: 14,
  lineHeight: 20,
  textAlign: 'center',
},



});
