import { View, Text, TextInput, Image, TouchableOpacity, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MAX_REPORT_PHOTOS } from '../lib/reportPhotoSelection';
import { formatUsd } from '../lib/funding';
import { calculatePlatformFee } from '../lib/fundingMath';
import FeeExplanationLabel from './FeeExplanationLabel';
import { LoadingButtonContent } from '../BrandedLoadingState';
import styles from '../styles/MapScreen.styles';
import MapView, { Marker } from 'react-native-maps';

export default function ReportWizardSteps({ form, coordinate, onChangeLocation, isEditing, reportPhotoUrls, reportStep, selectedReport, pickImage, isSaving, setForm, removePhoto, hasAttachedReportPhoto, goToNextReportStep, LITTER_OPTIONS, revealBottomReportField, NOTES_OPTIONS, jumpToReportStep, fundingEnabled, wantsStartingFunding, startingContributionCents, hasStartingFundingChoice, submitReport }) {
  const reviewPhotos = form.photos.length > 0 ? form.photos : isEditing ? reportPhotoUrls : [];
  switch (reportStep) {
    case 0: return (<View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            Add photos
          </Text>

          <Text style={styles.wizardDescription}>
            Add 1–3 photos of the littered area. Include nearby landmarks
            or surroundings that will help a cleaner find the location.
          </Text>

          {isEditing
            && form.photos.length === 0
            && (selectedReport?.photo_paths?.length ?? 0) > 0 ? (
            <View style={styles.existingPhotoNotice}>
              <Ionicons
                name="images-outline"
                size={34}
                color="#2F7D32"
              />

              <Text style={styles.existingPhotoTitle}>
                Existing photos will stay attached
              </Text>

              <Text style={styles.existingPhotoText}>
                Keep these photos, or choose a new set below. Saving a new set replaces all existing report photos.
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
                  <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                  <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.wizardPhotoActionButton}
                  onPress={() => pickImage('library')}
                  disabled={isSaving}
                  accessibilityRole="button"
                  accessibilityLabel="Choose replacement report photos"
                >
                  <Ionicons name="images-outline" size={20} color="#2F7D32" />
                  <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {isEditing ? (
                <View style={styles.replacementPhotoNotice}>
                  <Text style={styles.existingPhotoTitle}>New photo set selected</Text>
                  <Text style={styles.existingPhotoText}>These photos will replace the existing set when you save.</Text>
                  <TouchableOpacity
                    onPress={() => setForm((prev) => ({ ...prev, photos: [] }))}
                    disabled={isSaving}
                  >
                    <Text style={styles.keepExistingPhotosText}>Keep existing photos instead</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {form.photos.length < MAX_REPORT_PHOTOS ? (
                <View style={styles.wizardPhotoActions}>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('camera')}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel="Take litter report photo"
                  >
                    <Ionicons name="camera-outline" size={20} color="#2F7D32" />
                    <Text style={styles.wizardPhotoActionText}>Take photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.wizardPhotoActionButton}
                    onPress={() => pickImage('library')}
                    disabled={isSaving}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose up to ${MAX_REPORT_PHOTOS - form.photos.length} report photos`}
                  >
                    <Ionicons name="images-outline" size={20} color="#2F7D32" />
                    <Text style={styles.wizardPhotoActionText}>Choose photos</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {form.photos.length > 0 && (
                <View style={styles.wizardPhotoGrid}>
                  {form.photos.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={styles.wizardPhotoContainer}
                    >
                      <Image
                        source={{ uri }}
                        style={styles.wizardPhotoThumb}
                      />

                      <TouchableOpacity
                        style={styles.deletePhotoButton}
                        onPress={() =>
                          removePhoto(index)
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Remove report photo ${index + 1}`}
                      >
                        <Text style={styles.deletePhotoText}>
                          ✕
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {!hasAttachedReportPhoto() ? (
            <Text style={[styles.requiredHint, { color: '#687178', marginBottom: 16 }]}>
              Add at least one clear photo of the litter.
            </Text>
          ) : null}
<Text style={styles.reviewLabel}>Title (optional)</Text>
<TextInput
            style={styles.input}
            placeholder="Litter Report" accessibilityLabel="Report title (optional)"
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
            returnKeyType="next"
            onSubmitEditing={goToNextReportStep}
          />
</View>);
    case 1: return (<><View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            What kind of litter did you find?
          </Text>

          <Text style={styles.wizardDescription}>
            Select all that apply. You can also type something
            that isn't listed.
          </Text>

          <View style={styles.typeBox}>
            <View style={styles.typeChipRow}>
              {LITTER_OPTIONS.map(({ label, icon }) => {
                const selected =
                  form.selectedTypes?.includes(label);

                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.typeChip,
                      selected &&
                        styles.typeChipSelected,
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
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${label} litter type`}
                  >
                    <Ionicons
                      name={icon}
                      size={17}
                      color={
                        selected ? '#fff' : '#555'
                      }
                      style={styles.typeChipIcon}
                    />

                    <Text
                      style={[
                        styles.typeChipText,
                        selected &&
                          styles.typeChipTextSelected,
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
            Other
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Mattress, appliances, or another type"
            value={form.types}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                types: text,
              }))
            }
          />

          {!(form.selectedTypes?.length || form.types?.trim()) && (
            <Text style={[styles.requiredHint, { color: '#687178', marginBottom: 16 }]}>
              Select at least one litter type to continue.
            </Text>
          )}
        </View><View style={styles.wizardDetailSection}>
          <Text style={styles.wizardSectionTitle}>
            Severity
          </Text>

          <Text style={styles.wizardDescription}>
            Choose the level that best matches what you saw.
          </Text>

          <View style={styles.wizardSeverityList}>
            {[
              {
                level: 'Low',
                icon: 'leaf-outline',
              },
              {
                level: 'Medium',
                icon: 'trash-outline',
              },
              {
                level: 'High',
                icon: 'warning-outline',
              },
            ].map(({ level, icon }) => {
              const selected =
                form.severity === level;

              return (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.wizardSeverityOption,
                    selected &&
                      styles.wizardSeveritySelected,
                  ]}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      severity: level,
                    }))
                  }
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${level} severity`}
                >
                  <Ionicons
                    name={icon}
                    size={27}
                    color={
                      selected
                        ? '#2F7D32'
                        : '#667085'
                    }
                  />

                  <Text
                    style={[
                      styles.wizardSeverityText,
                      selected &&
                        styles.wizardSeverityTextSelected,
                    ]}
                  >
                    {level}
                  </Text>

                  <View
                    style={[
                      styles.wizardRadio,
                      selected &&
                        styles.wizardRadioSelected,
                    ]}
                  >
                    {selected && (
                      <View
                        style={
                          styles.wizardRadioInner
                        }
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {!form.severity && (
            <Text style={[styles.requiredHint, { color: '#687178', marginBottom: 16 }]}>
              Choose a severity level to continue.
            </Text>
          )}
        </View><View style={styles.wizardDetailSection}>
          <Text style={styles.wizardSectionTitle}>
            Site conditions (optional)
          </Text>

          <Text style={styles.wizardDescription}>
            Add details that could help someone safely find and
            understand the site.
          </Text>

          <View style={styles.notesBox}>
            <View style={styles.notesChipRow}>
              {NOTES_OPTIONS.map(
                ({ label, icon }) => {
                  const selected =
                    form.selectedNotes?.includes(
                      label
                    );

                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.notesChip,
                        selected &&
                          styles.notesChipSelected,
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
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={label}
                    >
                      <Ionicons
                        name={icon}
                        size={17}
                        color={
                          selected
                            ? '#fff'
                            : '#555'
                        }
                        style={
                          styles.notesChipIcon
                        }
                      />

                      <Text
                        style={[
                          styles.notesChipText,
                          selected &&
                            styles.notesChipTextSelected,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          </View>

          <Text style={styles.wizardFieldLabel}>
            Other
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Add any extra details"
            value={form.notes}
            onFocus={revealBottomReportField}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                notes: text,
              }))
            }
            maxLength={500}
          />
        </View></>);
    case 2: return (<View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            FINAL STEP
          </Text>

          <Text style={styles.wizardTitle}>
            Review your report
          </Text>

          <Text style={styles.wizardDescription}>
            Make sure everything looks right before you submit it.
          </Text>


          {coordinate && Number.isFinite(coordinate.latitude) && Number.isFinite(coordinate.longitude) ? <View style={{ marginBottom: 20 }}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewLabel}>Report location</Text>
              {!isEditing ? <TouchableOpacity onPress={onChangeLocation} disabled={isSaving} accessibilityRole="button" accessibilityLabel="Change report location" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}><Text style={styles.reviewEdit}>Change</Text></TouchableOpacity> : null}
            </View>
            <View style={{ height: 120, borderRadius: 12, overflow: 'hidden', marginTop: 8 }} pointerEvents="none">
              <MapView style={{ flex: 1 }} initialRegion={{ ...coordinate, latitudeDelta: 0.008, longitudeDelta: 0.008 }} scrollEnabled={false} zoomEnabled={false} rotateEnabled={false} pitchEnabled={false} accessibilityLabel="Confirmed report location">
                <Marker coordinate={coordinate} pinColor="#2F7D32" />
              </MapView>
            </View>
          </View> : null}
          <View style={styles.reviewCard}>

            {/* TITLE */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Title
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(0)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewValue}>
                {form.title?.trim() ||
                  'Litter Report'}
              </Text>
            </View>


            <View style={styles.reviewDivider} />


            {/* PHOTOS */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Photos
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(0)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {reviewPhotos.length > 0 ? (
                <View style={styles.reviewPhotoRow}>
                  {reviewPhotos.map(
                    (uri, index) => (
                      <Image
                        key={`${uri}-${index}`}
                        source={{ uri }}
                        style={styles.reviewPhoto}
                      />
                    )
                  )}
                </View>
              ) : (
                <Text style={styles.reviewMuted}>
                  No photos added
                </Text>
              )}
            </View>


            <View style={styles.reviewDivider} />


            {/* LITTER TYPES */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Litter Types
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(1)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.reviewChipRow}>
                {form.selectedTypes.map(
                  (type) => (
                    <View
                      key={type}
                      style={styles.reviewTypeChip}
                    >
                      <Text
                        style={
                          styles.reviewChipText
                        }
                      >
                        {type}
                      </Text>
                    </View>
                  )
                )}

                {form.types?.trim() ? (
                  <View
                    style={styles.reviewTypeChip}
                  >
                    <Text
                      style={styles.reviewChipText}
                    >
                      {form.types.trim()}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>


            <View style={styles.reviewDivider} />


            {/* SEVERITY */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Severity
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(1)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.reviewValue}>
                {form.severity}
              </Text>
            </View>


            <View style={styles.reviewDivider} />


            {/* NOTES */}
            <View style={styles.reviewSection}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewLabel}>
                  Notes
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    jumpToReportStep(1)
                  }
                >
                  <Text style={styles.reviewEdit}>
                    Edit
                  </Text>
                </TouchableOpacity>
              </View>

              {form.selectedNotes.length > 0 && (
                <View style={styles.reviewChipRow}>
                  {form.selectedNotes.map(
                    (note) => (
                      <View
                        key={note}
                        style={
                          styles.reviewNoteChip
                        }
                      >
                        <Text
                          style={
                            styles.reviewChipText
                          }
                        >
                          {note}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              )}

              {form.notes?.trim() ? (
                <Text style={styles.reviewNotes}>
                  {form.notes.trim()}
                </Text>
              ) : form.selectedNotes.length ===
                0 ? (
                <Text style={styles.reviewMuted}>
                  No additional notes
                </Text>
              ) : null}
            </View>

          </View>

          {fundingEnabled && !isEditing ? (
            <View style={styles.startingFundCard}>
              <View style={styles.startingFundHeading}>
                <Ionicons name="heart-outline" size={23} color="#2F7D32" />
                <View style={styles.startingFundHeadingCopy}>
                  <Text style={styles.startingFundTitle}>Start the cleanup fund</Text>
                  <Text style={styles.startingFundText}>
                    A reward is optional. You can also add one after publishing.
                  </Text>
                </View>
              </View>

              <View style={styles.startingFundChoices}>
                {[
                  { value: 'none', label: 'Not now' },
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
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={choice.value === 'none'
                        ? 'Post without adding funds'
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

              {form.startingFundingChoice === 'other' ? (
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
              ) : null}

              {wantsStartingFunding ? (
                startingContributionCents ? (
                  <View>
                    <Text style={styles.startingFundTotal}>Contribution {formatUsd(startingContributionCents)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <FeeExplanationLabel />
                      <Text>{formatUsd(calculatePlatformFee(startingContributionCents))}</Text>
                    </View>
                    <Text style={styles.startingFundTotal}>Total {formatUsd(startingContributionCents + calculatePlatformFee(startingContributionCents))}</Text>
                  </View>
                ) : (
                  <Text style={[styles.requiredHint, { color: '#687178', marginBottom: 16 }]}>Enter an amount from $1 to $1,000.</Text>
                )
              ) : !hasStartingFundingChoice ? (
                <Text style={[styles.requiredHint, { color: '#687178', marginBottom: 16 }]}>Choose Not now or select a starting amount.</Text>
              ) : (
                <Text style={styles.startingFundHelper}>You can add funds from the report later.</Text>
              )}
            </View>
          ) : null}


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
                  color="#fff"
                />

                <Text
                  style={
                    styles.wizardSubmitText
                  }
                >
                  Submit Report
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>);
    default: return null;
  }
}
