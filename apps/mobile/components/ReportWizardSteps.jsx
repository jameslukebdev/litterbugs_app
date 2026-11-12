import { View, Text, TextInput, Image, TouchableOpacity, Keyboard, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAX_REPORT_PHOTOS } from '../lib/reportPhotoSelection';
import { formatUsd } from '../lib/funding';
import FeeExplanationLabel from './FeeExplanationLabel';
import { LoadingButtonContent } from '../BrandedLoadingState';
// Website report form: one soft blue for every selected litter type and site condition.
const TILE_SELECTED = Object.freeze({ backgroundColor: colors.reportSoft, borderColor: colors.reportEdge, foregroundColor: colors.reportInk });
import { getSeveritySelectionColors } from '../lib/severitySelectionColors';
import styles from '../styles/MapScreen.styles';
import MapView, { Marker } from 'react-native-maps';
import MapPin from './MapPin';
import { CALM_MAP_STYLE } from '../lib/calmMapStyle';
import { colors } from '../lib/theme';

const SEVERITY_OPTIONS = [
  { level: 'Low', icon: 'leaf-outline', description: 'A few items' },
  { level: 'Medium', icon: 'trash-outline', description: 'A noticeable buildup' },
  { level: 'High', icon: 'layers-outline', description: 'A large amount' },
];

export default function ReportWizardSteps({ form, coordinate, onChangeLocation, isEditing, reportPhotoUrls, reportStep, selectedReport, pickImage, isSaving, showPhotoPreparation, setForm, removePhoto, hasAttachedReportPhoto, LITTER_OPTIONS, revealBottomReportField, NOTES_OPTIONS, jumpToReportStep, fundingEnabled, wantsStartingFunding, startingContributionCents, hasStartingFundingChoice, submitReport }) {
  const reviewPhotos = form.photos.length > 0 ? form.photos : isEditing ? reportPhotoUrls : [];
  const renderPhotoSlot = (index) => {
    const uri = form.photos[index];
    return (
      <View key={index} style={[styles.reportPhotoSlot, uri && styles.reportPhotoSlotFilled]}>
        {uri ? (
          <>
            <Image source={{ uri }} style={styles.reportPhotoPreview} accessibilityLabel={`Report photo ${index + 1}`} />
            <TouchableOpacity style={styles.reportPhotoRemove} onPress={() => removePhoto(index)}
              disabled={isSaving} accessibilityRole="button" accessibilityLabel={`Remove report photo ${index + 1}`}>
              <View style={styles.reportPhotoRemoveDot}><Ionicons name="close" size={18} color={colors.ink} /></View>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.reportPhotoEmpty} onPress={() => pickImage('library')}
            disabled={isSaving} accessibilityRole="button" accessibilityLabel={`Add report photo ${index + 1}`}>
            <Ionicons name={index === 0 ? 'images-outline' : 'add'} size={index === 0 ? 44 : 28} color={colors.primaryDark} />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  switch (reportStep) {
    case 0: return (<View style={styles.wizardStep}>
          {/* Step name lives in the form header, as on the website. */}



          {isEditing
            && form.photos.length === 0
            && (selectedReport?.photo_paths?.length ?? 0) > 0 ? (
            <View style={styles.existingPhotoNotice}>
              <Ionicons
                name="images-outline"
                size={34}
                color={colors.primary}
              />

              <Text style={styles.existingPhotoTitle}>
                Existing photos will stay attached
              </Text>



              {reportPhotoUrls.length > 0 && (
                <View style={styles.wizardPhotoGrid}>
                  {reportPhotoUrls.map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={styles.wizardPhotoThumb}
                    />
                  ))}
                </View>
              )}

              <View style={styles.wizardPhotoActions}>
                <TouchableOpacity
                  style={styles.wizardPhotoActionButton}
                  onPress={() => pickImage('camera')}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Take replacement report photo"
                >
                  <Ionicons name="camera-outline" size={20} color={colors.primary} />
                  <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wizardPhotoActionButton}
                  onPress={() => pickImage('library')}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Choose replacement report photos"
                >
                  <Ionicons name="images-outline" size={20} color={colors.primary} />
                  <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isEditing ? (
                <View style={styles.replacementPhotoNotice}>
                  <Text style={styles.existingPhotoTitle}>New photo set selected</Text>

                  <TouchableOpacity
                    onPress={() => setForm((prev) => ({ ...prev, photos: [] }))}
                    disabled={isSaving}
                  >
                    <Text style={styles.keepExistingPhotosText}>Keep existing photos instead</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <View style={styles.reportPhotoStage}>
                <View style={styles.reportPhotoMain}>{renderPhotoSlot(0)}</View>
                <View style={styles.reportPhotoSide}>{renderPhotoSlot(1)}{renderPhotoSlot(2)}</View>
              </View>
              {(
                <View style={styles.wizardPhotoActions}>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('camera')}
                    disabled={isSaving || form.photos.length >= MAX_REPORT_PHOTOS}
                    accessibilityRole="button"
                    accessibilityLabel="Take litter report photo"
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('library')}
                    disabled={isSaving || form.photos.length >= MAX_REPORT_PHOTOS}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose up to ${MAX_REPORT_PHOTOS - form.photos.length} report photos`}
                  >
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                  </TouchableOpacity>
                </View>
              )}

            </>
          )}


<View style={styles.photoPreparationSlot}>
  {showPhotoPreparation ? (
    <View style={styles.photoPreparationInline} accessibilityRole="progressbar" accessibilityLabel="Getting photos ready">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.photoPreparationText}>Getting photos ready…</Text>
    </View>
  ) : null}
</View>
<Text style={styles.reportTitleLabel}>Report title (optional)</Text>
<TextInput
            style={styles.wizardTitleInput}
            placeholder="Trash at the trail head" placeholderTextColor={colors.subtle} accessibilityLabel="Report title (optional)"
            value={form.title}
            onFocus={revealBottomReportField}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                title: text,
              }))
            }
            editable={!isSaving}
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
</View>);
    case 1: return (<View style={styles.wizardStep}>
          {/* Step name lives in the form header, as on the website. */}



          <View style={styles.litterTileSection}>
            <View style={styles.litterTileGrid}>
              {LITTER_OPTIONS.map(({ label, icon }, optionIndex) => {
                const selected =
                  form.selectedTypes?.includes(label);
                const selectionColors = TILE_SELECTED;

                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.litterTile,
                      selected &&
                        styles.litterTileSelected,
                      selected && {
                        backgroundColor: selectionColors.backgroundColor,
                        borderColor: selectionColors.borderColor,
                      },
                    ]}
                    onPress={() => {
                      setForm((prev) => {
                        const alreadySelected =
                          prev.selectedTypes?.includes(
                            label
                          );

                        return {
                          ...prev,

                          selectedTypes:
                            alreadySelected
                              ? prev.selectedTypes.filter(
                                  (type) =>
                                    type !== label
                                )
                              : [
                                  ...(prev.selectedTypes ||
                                    []),
                                  label,
                                ],
                        };
                      });
                    }}
                    disabled={isSaving}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${label} litter type`}
                  >
                    <Ionicons
                      name={selected ? 'checkmark-circle' : icon}
                      size={20}
                      color={
                        selected ? selectionColors.foregroundColor : colors.muted
                      }
                      style={styles.litterTileIcon}
                    />

                    <Text
                      style={[
                        styles.litterTileText,
                        selected &&
                          styles.litterTileTextSelected,
                        selected && { color: selectionColors.foregroundColor },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={styles.wizardFieldLabel}>
            Other type of litter
          </Text>

          <TextInput
            style={[styles.wizardTitleInput, styles.wizardSingleLineDetailsInput]}
            editable={!isSaving}
            accessibilityLabel="Other type of litter"
            placeholder="Add another type"
            placeholderTextColor={colors.subtle}
            value={form.types}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                types: text,
              }))
            }
          />


        </View>);
    case 2: return (
      <View style={styles.wizardStep}>
        <View style={styles.wizardSeverityList}>
          {SEVERITY_OPTIONS.map(({ level, icon, description }, severityIndex) => {
            const selected = form.severity === level;
            const selectionColors = getSeveritySelectionColors(severityIndex);
            return (
              <TouchableOpacity
                key={level}
                style={[
                  styles.wizardSeverityOption,
                  selected && styles.wizardSeveritySelected,
                  selected && {
                    backgroundColor: selectionColors.backgroundColor,
                    borderColor: selectionColors.borderColor,
                  },
                ]}
                onPress={() => setForm((prev) => ({ ...prev, severity: level }))}
                disabled={isSaving}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${level} severity`}
                accessibilityHint={description}
              >
                <Ionicons name={icon} size={32} color={selectionColors.iconColor} />
                <View style={styles.wizardSeverityCopy}>
                  <Text style={[
                    styles.wizardSeverityText,
                    selected && styles.wizardSeverityTextSelected,
                    selected && { color: selectionColors.foregroundColor },
                  ]}>{level}</Text>
                  <Text style={[
                    styles.wizardSeverityDescription,
                    selected && { color: selectionColors.secondaryColor },
                  ]}>{description}</Text>
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={26}
                  color={selected ? selectionColors.iconColor : colors.lineStrong} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
    case 3: return (<View style={styles.wizardStep}>



          <View style={styles.litterTileSection}>
            <View style={styles.litterTileGrid}>
              {NOTES_OPTIONS.map(
                ({ label, icon }, optionIndex) => {
                  const selected =
                    form.selectedNotes?.includes(
                      label
                    );
                  const selectionColors = TILE_SELECTED;

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.litterTile,
                        selected &&
                          styles.litterTileSelected,
                        selected && {
                          backgroundColor: selectionColors.backgroundColor,
                          borderColor: selectionColors.borderColor,
                        },
                      ]}
                      onPress={() => {
                        setForm((prev) => {
                          const alreadySelected =
                            prev.selectedNotes?.includes(
                              label
                            );

                          return {
                            ...prev,

                            selectedNotes:
                              alreadySelected
                                ? prev.selectedNotes.filter(
                                    (note) =>
                                      note !== label
                                  )
                                : [
                                    ...(prev.selectedNotes ||
                                      []),
                                    label,
                                  ],
                          };
                        });
                      }}
                      disabled={isSaving}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={label}
                    >
                      <Ionicons
                        name={selected ? 'checkmark-circle' : icon}
                        size={20}
                        color={
                          selected
                            ? selectionColors.foregroundColor
                            : colors.muted
                        }
                        style={
                          styles.litterTileIcon
                        }
                      />

                      <Text
                        style={[
                          styles.litterTileText,
                          selected &&
                            styles.litterTileTextSelected,
                          selected && { color: selectionColors.foregroundColor },
                        ]}
                      >
                        {label === 'In Public Park' ? 'In public park' : label === 'Use Caution' ? 'Use caution' : label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>

          <Text style={styles.wizardFieldLabel}>
            Extra details
          </Text>

          <TextInput
            style={[styles.wizardTitleInput, styles.wizardSingleLineDetailsInput]}
            editable={!isSaving}
            placeholderTextColor={colors.subtle}
            accessibilityLabel="Extra site details (optional)"
            placeholder="Add any extra details"
            value={form.notes}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                notes: text,
              }))
            }
            maxLength={500}
          />
        </View>);
    case 4: return (<View style={styles.wizardStep}>
          {form.title?.trim() ? (
          <View style={styles.reportReviewRow}>
            <View style={styles.reportReviewCopy}>
              <Text style={styles.reportReviewLabel}>Title</Text>
              <Text style={styles.reportReviewTitle}>{form.title.trim()}</Text>
            </View>
            <TouchableOpacity style={styles.reportReviewEditButton} onPress={() => jumpToReportStep(0)}
              disabled={isSaving} accessibilityRole="button" accessibilityLabel="Edit report title">
              <Text style={styles.reviewEdit}>Edit</Text>
            </TouchableOpacity>
          </View>
          ) : (
            <TouchableOpacity style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}
              onPress={() => jumpToReportStep(0)} disabled={isSaving}
              accessibilityRole="button" accessibilityLabel="Add a report title">
              <Text style={styles.reviewEdit}>Add a title</Text>
            </TouchableOpacity>
          )}

          <View style={styles.reportReviewMediaSection}>
            <View style={styles.reportReviewHeader}>
              <Text style={styles.reportReviewLabel}>Photos</Text>
              <TouchableOpacity style={[styles.reportReviewEditButton, { marginTop: 0 }]} onPress={() => jumpToReportStep(0)}
                disabled={isSaving} accessibilityRole="button" accessibilityLabel="Edit report photos">
                <Text style={styles.reviewEdit}>Edit</Text>
              </TouchableOpacity>
            </View>
            {reviewPhotos.length > 0 ? (
              <View style={styles.reportReviewPhotos}>
                {reviewPhotos.map((uri, index) => (
                  <Image key={`${uri}-${index}`} source={{ uri }} style={styles.reportReviewPhoto}
                    accessibilityLabel={`Report photo ${index + 1}`} />
                ))}
              </View>
            ) : <Text style={styles.reviewMuted}>No photos added</Text>}
          </View>

          {coordinate && Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude) ? (
            <View style={styles.reportReviewMediaSection}>
              <View style={styles.reportReviewHeader}>
                <Text style={styles.reportReviewLabel}>Location</Text>
                {!isEditing ? (
                  <TouchableOpacity onPress={onChangeLocation} disabled={isSaving} accessibilityRole="button"
                    accessibilityLabel="Change report location" style={[styles.reportReviewEditButton, { marginTop: 0 }]}>
                    <Text style={styles.reviewEdit}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={styles.reportReviewMap} pointerEvents="none">
                <MapView style={{ flex: 1 }} initialRegion={{ ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
                  scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false}
                  mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
                  showsPointsOfInterest={false}
                  {...(Platform.OS === 'android' ? { customMapStyle: CALM_MAP_STYLE } : {})}
                  accessibilityLabel="Confirmed report location">
                  <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 1 }}><MapPin kind="open" /></Marker>
                </MapView>
              </View>
            </View>
          ) : null}

          <View style={styles.reportReviewRow}>
            <View style={styles.reportReviewCopy}>
              <Text style={styles.reportReviewLabel}>Type of litter</Text>
              <View style={styles.reportReviewChipList}>
                {(form.selectedTypes || []).map((label) => {
                  const option = LITTER_OPTIONS.find((item) => item.label === label);
                  return (
                    <View key={label} style={[styles.reportReviewChip, styles.reportReviewLitterChip]}>
                      <Ionicons name={option?.icon || 'trash-outline'} size={17} color={colors.reportInk} />
                      <Text style={[styles.reportReviewChipText, styles.reportReviewLitterChipText]}>{label}</Text>
                    </View>
                  );
                })}
                {form.types?.trim() ? (
                  <View style={[styles.reportReviewChip, styles.reportReviewLitterChip]}>
                    <Ionicons name="create-outline" size={17} color={colors.reportInk} />
                    <Text style={[styles.reportReviewChipText, styles.reportReviewLitterChipText]}>{form.types.trim()}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.reportReviewEditButton} onPress={() => jumpToReportStep(1)}
              disabled={isSaving} accessibilityRole="button" accessibilityLabel="Edit type of litter">
              <Text style={styles.reviewEdit}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportReviewRow}>
            <View style={styles.reportReviewCopy}>
              <Text style={styles.reportReviewLabel}>Severity</Text>
              {(() => {
                const severityIndex = Math.max(0, SEVERITY_OPTIONS.findIndex(({ level }) => level === form.severity));
                const severityOption = SEVERITY_OPTIONS[severityIndex];
                const selectionColors = getSeveritySelectionColors(severityIndex);
                return (
                  <View style={[
                    styles.reportReviewSeverityChip,
                    {
                      backgroundColor: selectionColors.backgroundColor,
                      borderColor: selectionColors.borderColor,
                    },
                  ]}>
                    <Ionicons name={severityOption.icon} size={19} color={selectionColors.iconColor} />
                    <Text style={[styles.reportReviewSeverityText, { color: selectionColors.foregroundColor }]}>
                      {form.severity}
                    </Text>
                  </View>
                );
              })()}
            </View>
            <TouchableOpacity style={styles.reportReviewEditButton} onPress={() => jumpToReportStep(2)}
              disabled={isSaving} accessibilityRole="button" accessibilityLabel="Edit severity">
              <Text style={styles.reviewEdit}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reportReviewRow}>
            <View style={styles.reportReviewCopy}>
              <Text style={styles.reportReviewLabel}>Site conditions</Text>
              {(form.selectedNotes || []).length > 0 || form.notes?.trim() ? (
                <View style={styles.reportReviewChipList}>
                  {(form.selectedNotes || []).map((label) => {
                    const option = NOTES_OPTIONS.find((item) => item.label === label);
                    const displayLabel = label === 'In Public Park'
                      ? 'In public park'
                      : label === 'Use Caution' ? 'Use caution' : label;
                    return (
                      <View key={label} style={[styles.reportReviewChip, styles.reportReviewConditionChip]}>
                        <Ionicons name={option?.icon || 'information-circle-outline'} size={17} color={colors.reportInk} />
                        <Text style={[styles.reportReviewChipText, styles.reportReviewConditionChipText]}>{displayLabel}</Text>
                      </View>
                    );
                  })}
                  {form.notes?.trim() ? (
                    <View style={[styles.reportReviewChip, styles.reportReviewConditionChip]}>
                      <Ionicons name="document-text-outline" size={17} color={colors.reportInk} />
                      <Text style={[styles.reportReviewChipText, styles.reportReviewConditionChipText]}>{form.notes.trim()}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.reviewMuted}>None added</Text>
              )}
            </View>
            <TouchableOpacity style={styles.reportReviewEditButton} onPress={() => jumpToReportStep(3)}
              disabled={isSaving} accessibilityRole="button" accessibilityLabel="Edit site conditions">
              <Text style={styles.reviewEdit}>Edit</Text>
            </TouchableOpacity>
          </View>

          {fundingEnabled && !isEditing ? (
            <View style={styles.startingFundCard}>
              <View style={styles.startingFundHeading}>
                <Image source={require('../assets/bugs/bee.png')} style={{ width: 22, height: 22 }} resizeMode="contain" accessible={false} />
                <View style={styles.startingFundHeadingCopy}>
                  <Text style={styles.startingFundTitle}>Start the cleanup fund</Text>
                  <Text style={[styles.optionalStepLabel, { color: colors.yellow }]}>Optional</Text>
                </View>
              </View>

              <View style={styles.startingFundChoices}>
                {[
                  { value: 'none', label: 'No contribution now' },
                  { value: '1', label: '$1' },
                  { value: '5', label: '$5' },
                  { value: '10', label: '$10' },
                  { value: '25', label: '$25' },
                  { value: 'other', label: 'Other' },
                ].map((choice) => {
                  const selected = form.startingFundingChoice === choice.value;
                  return (
                    <TouchableOpacity
                      key={choice.value}
                      style={[
                        styles.startingFundChoice,
                        selected && styles.startingFundChoiceSelected,
                      ]}
                      onPress={() => setForm((current) => ({
                        ...current,
                        startingFundingChoice: choice.value,
                      }))}
                      accessibilityRole="radio"
                      disabled={isSaving}
                      accessibilityState={{ checked: selected, disabled: isSaving }}
                      accessibilityLabel={choice.value === 'none'
                        ? 'Post without adding funds'
                        : choice.value === 'other' ? 'Enter a custom cleanup fund amount'
                          : `Start cleanup fund with ${choice.label}`}
                    >
                      <Text style={[
                        styles.startingFundChoiceText,
                        selected && styles.startingFundChoiceTextSelected,
                      ]}>
                        {choice.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {form.startingFundingChoice === 'none' ? (
                <Text style={styles.startingFundSummaryText}>
                  Post without paying. Others can still contribute to this cleanup.
                </Text>
              ) : null}

              {form.startingFundingChoice === 'other' ? (
                <View style={styles.startingFundCustom}>
                  <Text style={styles.reportTitleLabel}>Amount</Text>
                  <View style={styles.startingFundOtherRow}>
                  <Text style={styles.startingFundDollar}>$</Text>
                  <TextInput
                    value={form.startingFundingOther}
                    onFocus={revealBottomReportField}
                    onChangeText={(value) => setForm((current) => ({
                      ...current,
                      startingFundingOther: value,
                    }))}
                    keyboardType="decimal-pad"
                    placeholder="1.00"
                    maxLength={7}
                    style={styles.startingFundOtherInput}
                    editable={!isSaving}
                    accessibilityLabel="Starting cleanup fund amount"
                  />
                  </View>
                </View>
              ) : null}

              {wantsStartingFunding ? (
                startingContributionCents ? (
                  <View style={styles.startingFundSummary}>
                    <View style={styles.startingFundSummaryRow}>
                      <Text style={styles.startingFundSummaryText}>Contribution</Text>
                      <Text style={styles.startingFundSummaryText}>{formatUsd(startingContributionCents)}</Text>
                    </View>
                    <View style={styles.startingFundSummaryRow}>
                      <FeeExplanationLabel />
                      <Text style={styles.startingFundSummaryText}>Shown at checkout</Text>
                    </View>
                    <View style={[styles.startingFundSummaryRow, styles.startingFundTotalRow]}>
                      <Text style={styles.startingFundTotal}>Total</Text>
                      <Text style={styles.startingFundTotal}>Confirmed before payment</Text>
                    </View>
                  </View>
                ) : (
                  null
                )
              ) : !hasStartingFundingChoice ? (
                null
              ) : (
                null
              )}
            </View>
          ) : null}

          {/* Website review: says what posting needs before the button is pressed. */}
          {!isEditing ? <Text style={styles.reportPostingNote}>To post, allow location access and be within 50 miles of the pin.</Text> : null}

          <TouchableOpacity
            style={[
              styles.wizardSubmitButton,
              isSaving && styles.wizardDisabled,
            ]}
            onPress={submitReport}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Submit litter report"
            accessibilityState={{ disabled: isSaving, busy: isSaving }}
          >
            {isSaving ? (
              <LoadingButtonContent label="Creating report…" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={23}
                  color={colors.white}
                />

                <Text
                  style={
                    styles.wizardSubmitText
                  }
                >
                  Submit report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>);
    default: return null;
  }
}
