// MapScreen.js
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Modal,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase'
import * as FileSystem from 'expo-file-system/legacy';


// Region Shown on Map
const FALLBACK_REGION = {
  latitude: 35.6009, // Boone-ish fallback
  longitude: -82.5540,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// State Functions
export default function MapScreen() {
  const [region, setRegion] = useState(FALLBACK_REGION);
  const [markers, setMarkers] = useState([]); // saved reports
  const [draftCoord, setDraftCoord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    selectedTypes: [],
    types: '',
    photos: [],   // 👈 we'll use this
    severity: '',
    selectedNotes: [],
    notes: '',
  });
  const [mapType, setMapType] = useState('standard');
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportPhotoUrls, setReportPhotoUrls] = useState([]);
  const [editingReportId, setEditingReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  const PATREON_URL = "https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"; // <-- paste your real link




// Getting the Map Working 
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((r) => ({
          ...r,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }));
      } catch (e) {
        console.log('Location error', e);
      }
    })();
  }, []);


// Pressing Map opens Litter Form 
  const onMapPress = (e) => {
    const coord = e.nativeEvent.coordinate;
    setDraftCoord(coord);
    // reset form each time
    setForm({
      title: '',
      selectedTypes: [],   // ✅ should be an array
      types: '',
      photos: [],
      severity: '',
      selectedNotes: [],
      notes: '',
    });
    setFormOpen(true);
  };


// Save Report Function
  const saveReport = async () => {
    if (isSaving) return; // extra protection
    if (!draftCoord && !isEditing) return;
  
    try {
      // ✅ get user FIRST
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
  
      const createPayload = {
        title: form.title?.trim() || 'Litter report',
        litter_types: form.selectedTypes?.length ? form.selectedTypes : null,
        types: form.types?.trim() || null,
        notes_presets: form.selectedNotes?.length ? form.selectedNotes : null,
        notes_other: form.notes?.trim() || null,
        severity: form.severity || null,
        latitude: draftCoord.latitude,
        longitude: draftCoord.longitude,
        user_id: user?.id ?? null,
      };
  
      const updatePayload = {
        title: form.title?.trim() || 'Litter report',
        litter_types: form.selectedTypes?.length ? form.selectedTypes : null,
        types: form.types?.trim() || null, 
        notes_presets: form.selectedNotes?.length ? form.selectedNotes : null,
        notes_other: form.notes?.trim() || null,
        severity: form.severity || null,
      };
  
      let data, error;
  
      if (isEditing && editingReportId) {
        ({ data, error } = await supabase
          .from('reports')
          .update(updatePayload)
          .eq('id', editingReportId)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('reports')
          .insert(createPayload)
          .select()
          .single());
      }
  
      if (error) {
        Alert.alert('Save failed', error.message);
        return;
      }
  
      // ✅ Photo uploads unchanged
      let photoPaths = [];
      if (!isEditing && form.photos?.length > 0) {
        photoPaths = await uploadReportPhotos(
          form.photos,
          data.id,
          user?.id ?? 'guest'
        );
      }
  
      if (photoPaths.length > 0) {
        await supabase
          .from('reports')
          .update({ photo_paths: photoPaths })
          .eq('id', data.id);
  
        data.photo_paths = photoPaths;
      }
  
      // ✅ Safe map update
      if (data.latitude && data.longitude) {
        setMarkers((prev) =>
          isEditing
            ? prev.map((m) => (m.id === data.id ? { ...m, report: data } : m))
            : [
                ...prev,
                {
                  id: data.id,
                  coordinate: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                  },
                  report: data,
                },
              ]
        );
      }
  
      setDraftCoord(null);
      setFormOpen(false);
      setIsEditing(false);
      setEditingReportId(null);
  
      Alert.alert('Report saved', 'Thanks for helping keep the community clean!');
    } catch (e) {
      console.error('Unexpected save error:', e);
      Alert.alert('Error', 'Something went wrong saving your report.');
    }
  };
  
// Confrim Save Report - Prevents Duplicates 
  const confirmSaveReport = () => {
    // Prevent double taps immediately
    if (isSaving) return;
  
    Alert.alert(
      'Save report?',
      'Are you ready to save this litter report?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Save',
          style: 'default',
          onPress: async () => {
            setIsSaving(true);
            try {
              await saveReport();
            } finally {
              // Always release loading, even if saveReport errors
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };
  

  // Cancel Report
  const cancelDraft = () => {
    setDraftCoord(null);
    setFormOpen(false);
  };

// User Can Sign Out
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign out failed', error.message);
    }
  };

// User Can Center Back to their Location on Map
  const centerOnUser = async () => {
    try {
      const loc = await Location.getCurrentPositionAsync({});
      setRegion((prev) => ({
        ...prev,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }));
    } catch (e) {
      console.log('Center error:', e);
      Alert.alert('Location Error', 'Unable to find your location.');
    }
  };

// Can Change Map Type - Sattelite, Ect 
  const toggleMapType = () => {
    setMapType((prev) => {
      if (prev === 'standard') return 'satellite';
      if (prev === 'satellite') return 'hybrid';
      if (prev === 'hybrid') return Platform.OS === 'android' ? 'terrain' : 'standard';
      if (prev === 'terrain') return 'standard';
      return 'standard';
    });
  };

// Icon Changes When Map Type Changes
  const getMapTypeColor = () => {
    switch (mapType) {
      case 'standard':
        return '#B39DDB'; // light purple
      case 'satellite':
        return '#A5D6A7'; // light green
      case 'hybrid':
        return '#FBC02D'; // yellow
      case 'terrain': // Android only
        return '#66BB6A'; // another green tone
      default:
        return '#2F7D32';
    }
  };


// Preset Litter Options Users Can Choose From 
  const LITTER_OPTIONS = [
    { label: 'Takeout cups', icon: 'cafe-outline' },
    { label: 'Bottles', icon: 'water-outline' },
    { label: 'Cans', icon: 'beer-outline' },
    { label: 'Paper products', icon: 'document-text-outline' },
    { label: 'Food wrappers', icon: 'fast-food-outline' },
    { label: 'Fast food bags', icon: 'bag-handle-outline' },
    { label: 'Plastic bags', icon: 'bag-handle-outline' },
    { label: 'Trash bags', icon: 'trash-outline' },
    { label: 'PPE', icon: 'medkit-outline' },
    { label: 'Construction debris', icon: 'construct-outline' },
    { label: 'Furniture', icon: 'bed-outline' },
    { label: 'Strewn plastic', icon: 'layers-outline' },
    { label: 'Textiles', icon: 'shirt-outline' },
    { label: 'Pet waste', icon: 'paw-outline' },
    { label: 'Tires', icon: 'disc-outline' },
    { label: 'Vehicular debris', icon: 'car-outline' },
  ];


// Preset Notes Options Users Can Choose From
  const NOTES_OPTIONS = [
    { label: 'Scattered',        icon: 'layers-outline' },
    { label: 'In a pile',        icon: 'construct-outline' },
    { label: 'Bagged but left',  icon: 'bag-handle-outline' },
    { label: 'Near roadside',    icon: 'car-outline' },
    { label: 'In Public Park',   icon: 'paw-outline' },          // park / nature-ish
    { label: 'In ditch',         icon: 'water-outline' },
    { label: 'Along trail',      icon: 'walk-outline' },         // if walk-outline isn't used yet, it's a standard Ionicon
    { label: 'Near waterway',    icon: 'water-outline' },
    { label: 'Blocking path',    icon: 'close-circle-outline' }, // or trash-outline if you prefer
    { label: 'Broken glass',     icon: 'alert-circle-outline' },
    { label: 'Hard to access',   icon: 'warning-outline' },
    { label: 'Use Caution',      icon: 'warning-outline' },
  ];
  

// Helper Function for Photo Uploads
  const base64ToUint8Array = (base64) => {
    const binaryString = globalThis.atob ? globalThis.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };
  

  // Photo upload function
  const pickImage = async () => {
    if (isSaving) return;
    console.log('pickImage RUNNING');
  
    // 1. Ask for permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo access in Settings to attach pictures.'
      );
      return;
    }
  
    try {
      // 2. Open the library with NO options (most compatible)
      const result = await ImagePicker.launchImageLibraryAsync();
      console.log('RAW picker result:', result);
  
      // 3. Handle selection
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        console.log('Selected URI:', uri);
  
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, uri].slice(0, 3), // max 3 photos
        }));
      }
    } catch (e) {
      console.log('Image picker error:', e);
      Alert.alert('Error', 'Unable to open the photo library right now.');
    }
  };

    // Delete Photos
    const removePhoto = (index) => {
      setForm((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
      }));
    };

    // Upload Photos to Supabase, helper function
    const uploadReportPhotos = async (photoUris, reportId, userId) => {
      const uploadedPaths = [];
    
      for (let i = 0; i < photoUris.length; i++) {
        const uri = photoUris[i];
    
        try {
          // Read local file as base64
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64',
          });
    
          // Convert base64 -> bytes
          const bytes = base64ToUint8Array(base64);
    
          // File naming
          const fileExt = (uri.split('.').pop() || 'jpg').toLowerCase();
          const filePath = `${userId}/${reportId}/${Date.now()}-${i}.${fileExt}`;
    
          // Upload bytes
          const { error } = await supabase.storage
            .from('report_photos')
            .upload(filePath, bytes, {
              contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
              upsert: false,
            });
    
          if (error) {
            console.error('Upload error:', error);
            continue;
          }
    
          uploadedPaths.push(filePath);
        } catch (err) {
          console.error('Photo upload failed:', err);
        }
      }
    
      return uploadedPaths;
    };
    
    const getSignedPhotoUrl = async (path) => {
      const { data, error } = await supabase.storage
        .from('report_photos')
        .createSignedUrl(path, 60 * 60); // 1 hour
    
      if (error) {
        console.error('Signed URL error:', error);
        return null;
      }
    
      return data.signedUrl;
    };
    
// Set Map Marker Based on Severity 
    const getMarkerStyleBySeverity = (severity) => {
      const s = (severity || '').toLowerCase();
    
      if (s === 'low') {
        return { bg: '#43A047', icon: 'trash-outline' }; // green + bottle-ish
      }
    
      if (s === 'high') {
        return { bg: '#E53935', icon: 'warning-outline' }; // red + hazard/warning
      }
    
      // default = Medium (or missing/unknown)
      return { bg: '#FF8A00', icon: 'trash-outline' }; // your current orange
    };
    



    
// Get User ID to Allow Edit/Delete of Their Reports
    useEffect(() => {
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id ?? null);
      });
    }, []);
    

// Load Reports From Supabase (only unexpired)
useEffect(() => {
  const loadReports = async () => {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .gt('expires_at', nowIso); // only reports that haven't expired

    if (error) {
      console.log('loadReports error:', error);
      return;
    }

    if (data) {
      setMarkers(
        data
          .filter((r) => typeof r.latitude === 'number' && typeof r.longitude === 'number')
          .map((r) => ({
            id: r.id,
            coordinate: {
              latitude: r.latitude,
              longitude: r.longitude,
            },
            report: r,
          }))
      );
    }
  };

  loadReports();
}, []);

    
    // Load Photos into Existing Report
    useEffect(() => {
      const loadPhotoUrls = async () => {
        // start loading whenever selectedReport changes
        setPhotosLoading(true);

        if (!selectedReport?.photo_paths?.length) {
          setReportPhotoUrls([]);
          setPhotosLoading(false);
          return;
        }

        const urls = await Promise.all(
          selectedReport.photo_paths.map((p) => getSignedPhotoUrl(p))
        );

        setReportPhotoUrls(urls.filter(Boolean));
        setPhotosLoading(false);
      };

      loadPhotoUrls();
    }, [selectedReport]);


// Checks if User is Owner of Report
    const isOwner =
    currentUserId &&
    selectedReport &&
    selectedReport.user_id === currentUserId;
  
// Links out to Patreon Account
const openPatreon = async () => {
  try {
    const supported = await Linking.canOpenURL(PATREON_URL);
    if (!supported) {
      Alert.alert("Can't open link", "Unable to open Patreon on this device.");
      return;
    }
    await Linking.openURL(PATREON_URL);
  } catch (e) {
    console.log("Patreon link error:", e);
    Alert.alert("Link error", "Something went wrong opening Patreon.");
  }
};





  // Map View . . .
  return (
    <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={region}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={(e) => {
            if (detailsOpen || isSaving) return;
            onMapPress(e);
          }}          
          showsUserLocation
          followsUserLocation={false}
          mapType={mapType}
        >

        {markers.map((m) => {
          const { bg, icon } = getMarkerStyleBySeverity(m?.report?.severity);

          return (
            <Marker
              key={m.id}
              coordinate={m.coordinate}
              tracksViewChanges={false}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={(e) => {
                e?.stopPropagation?.();
                setSelectedReport(m.report);
                setDetailsOpen(true);
              }}
            >
              <View style={styles.reportMarkerHitLg}>
                <View style={[styles.reportMarkerIconWrapLg, { backgroundColor: bg }]}>
                  <Ionicons name={icon} size={34} color="#fff" />
                </View>
              </View>
            </Marker>
          );
        })}


        {draftCoord && (
          <Marker
            coordinate={draftCoord}
            pinColor="#FFC42E"
            title="Draft report"
            description="Fill the form below to save"
          />
        )}
      </MapView>


      {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Ionicons name="log-out-outline" size={22} color="#444" />
        </TouchableOpacity>

        {/* Support Button (Patreon) */}
        <TouchableOpacity
          style={styles.supportButton}
          onPress={openPatreon}
          accessibilityRole="button"
          accessibilityLabel="Support Litterbugs on Patreon"
        >
          <Ionicons name="heart" size={22} color="#E53935" />
        </TouchableOpacity>


      {/* Center Me Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={centerOnUser}
        accessibilityRole="button"
        accessibilityLabel="Center map on your location"
      >
        <Ionicons name="navigate-outline" size={32} color="#42A5F5" />
      </TouchableOpacity>

      {/* Map Type Toggle Button */}
      <TouchableOpacity style={styles.mapTypeButton} onPress={toggleMapType}>
        <Ionicons name="layers-outline" size={32} color={getMapTypeColor()} />
      </TouchableOpacity>





      {/* Modal for Form */}
      <Modal
        visible={formOpen}
        animationType="slide"
        transparent
        onRequestClose={cancelDraft}
      >
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              {/* Prevent taps inside the sheet from closing it */}
              <TouchableWithoutFeedback>
                <View style={styles.sheet}>
                {isSaving && <View style={styles.savingOverlay} pointerEvents="auto" />}

                    <Text style={styles.sheetTitle}>New Litter Report</Text>
  
                    <View style={styles.divider} />  

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >

                  {/* Title */}
                  <Text style={[styles.label, styles.section]}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Short title (e.g., Bags & cans by trail)"
                    value={form.title}  
                      onChangeText={(t) =>
                        setForm((prev) => ({ ...prev, title: t }))
                      }
                      returnKeyType="next"
                      editable={!isSaving}
                    /> 

                    {/* Litter Types */}
                    <Text style={[styles.label, styles.section]}>Litter Types</Text>

                    <View style={styles.typeBox}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 140 }}  // controls chip area height
                      >
                        <View style={styles.typeChipRow}>
                          {LITTER_OPTIONS.map(({ label, icon }) => {
                            const selected = form.selectedTypes?.includes(label);

                            return (
                              <TouchableOpacity
                                key={label}
                                style={[styles.typeChip, selected && styles.typeChipSelected, isSaving && { opacity: 0.6 },
                                ]}
                                onPress={() => {
                                  setForm((prev) => {
                                    const alreadySelected = prev.selectedTypes?.includes(label);
                                    return {
                                      ...prev,
                                      selectedTypes: alreadySelected
                                        ? prev.selectedTypes.filter((t) => t !== label)
                                        : [...(prev.selectedTypes || []), label],
                                    };
                                  });
                                }}
                                disabled={isSaving}
                              >
                                <Ionicons
                                  name={icon}
                                  size={16}
                                  color={selected ? '#fff' : '#555'}
                                  style={styles.typeChipIcon}
                                />
                                <Text
                                  style={[
                                    styles.typeChipText,
                                    selected && styles.typeChipTextSelected,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>

                    {/* Other (optional) */}
                    <Text style={styles.photoHelper}>Other</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 40 }]}
                      placeholder="Other types (e.g., mattress, appliances)"
                      value={form.otherType}
                      onChangeText={(t) =>
                        setForm((prev) => ({ ...prev, types: t }))
                      }
                      editable={!isSaving}
                    />

                    {/* Photo Uploads */}
                    <Text style={[styles.label, styles.section]}>Upload Photos</Text>
                    <Text style={styles.photoHelper}>Up to 3</Text>

                    <TouchableOpacity
                      style={[styles.photoButton, isSaving && { opacity: 0.5 }]}                      
                      onPress={pickImage}
                      disabled={isSaving}
                      accessibilityRole="button"
                      accessibilityLabel="Add a photo of the litter"
                    >
                      <Ionicons name="camera-outline" size={24} color="#2F7D32" />
                    </TouchableOpacity>

                    {/* Thumbnails */}
                    <View style={styles.photoRow}>
                      {form.photos.map((uri, i) => (
                        <View key={i} style={styles.photoContainer}>
                          <Image
                            source={{ uri }}
                            style={styles.photoThumb}
                          />

                          <TouchableOpacity
                            style={styles.deletePhotoButton}
                            onPress={() => removePhoto(i)}
                          >
                            <Text style={styles.deletePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Severity */}
                    <Text style={[styles.label, styles.section]}>Severity</Text>
                    <View style={styles.severityRow}>
                      {['Low', 'Medium', 'High'].map((level) => {
                        const selected = form.severity === level;
                        return (
                          <TouchableOpacity
                            key={level}
                            style={[
                              styles.severityChip,
                              selected && styles.severityChipSelected,
                              isSaving && { opacity: 0.6 },
                            ]}
                            onPress={() =>
                              setForm((prev) => ({ ...prev, severity: level }))
                            }
                            disabled={isSaving}
                          >
                            <Text
                              style={[
                                styles.severityChipText,
                                selected && styles.severityChipTextSelected,
                              ]}
                            >
                              {level}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Notes */}
                    <Text style={[styles.label, styles.section]}>Notes</Text>

                    {/* Scrollable preset notes */}
                    <View style={styles.notesBox}>
                      <ScrollView
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                        style={{ maxHeight: 120 }}
                      >
                       <View style={styles.notesChipRow}>
                      {NOTES_OPTIONS.map(({ label, icon }) => {
                        const selected = form.selectedNotes?.includes(label);

                        return (
                          <TouchableOpacity
                            key={label}
                            style={[styles.notesChip, selected && styles.notesChipSelected, isSaving && { opacity: 0.6 },
                            ]}
                            onPress={() => {
                              setForm((prev) => {
                                const already = prev.selectedNotes?.includes(label);
                                return {
                                  ...prev,
                                  selectedNotes: already
                                    ? prev.selectedNotes.filter((n) => n !== label)
                                    : [...(prev.selectedNotes || []), label],
                                };
                              });
                            }}
                            disabled={isSaving}
                          >
                            <Ionicons
                              name={icon}
                              size={16}
                              color={selected ? '#fff' : '#555'}
                              style={styles.notesChipIcon}
                            />
                            <Text
                              style={[
                                styles.notesChipText,
                                selected && styles.notesChipTextSelected,
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                      </ScrollView>
                    </View>

                    {/* Thin free-text box underneath */}
                    <Text style={styles.photoHelper}>Other</Text>
                    <TextInput
                      style={[styles.input, { minHeight: 40 }]}
                      placeholder="Add any extra details"
                      value={form.notes}
                      onChangeText={(t) =>
                        setForm((prev) => ({ ...prev, notes: t }))
                      }
                      editable={!isSaving}

                    />

                  </ScrollView>

                  {/* Sticky Footer */}
                    <View style={styles.footerBar}>

                      {/* Cancel Button*/}  
                      <TouchableOpacity
                        style={[
                          styles.btn,
                          styles.cancelBtn,
                          isSaving && { opacity: 0.5 },
                        ]}
                        onPress={cancelDraft}
                        disabled={isSaving}
                      >
                        <Text style={[styles.btnText, { color: '#333' }]}>Cancel</Text>
                      </TouchableOpacity>

                    {/* Save Button */}
                    <TouchableOpacity
                      style={[styles.btn, styles.saveBtn]}
                      onPress={confirmSaveReport}
                      disabled={isSaving}
                    >
                      <Text style={styles.btnText}>
                        {isSaving ? 'Saving…' : 'Save'}
                      </Text>
                    </TouchableOpacity>

                    </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
      </Modal>



{/* Read Reports */}
        <Modal
        visible={detailsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsOpen(false)}
        >
          <View style={styles.modalBackdrop}>
          <View style={styles.reportSheet}>
            
             {/* Title */}
            <Text style={styles.reportTitle}>
                  {selectedReport?.title || 'Litter Report'}
              </Text>
         
            {/* Divider */}
            <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginBottom: 12 }} />
                
              <ScrollView
                showsVerticalScrollIndicator={false}
                bounces
                alwaysBounceVertical
                overScrollMode="always"
                decelerationRate="fast"
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingTop: 12,        // ✅ breathing room above title
                  paddingBottom: 140,    // footer clearance
                }}
                >
            
                {/* Litter Types */}
                {selectedReport?.litter_types?.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionLabel}>Litter Types</Text>

                    <View style={styles.reportChipRow}>
                      {selectedReport.litter_types.map((t) => (
                        <View
                          key={t}
                          style={[styles.reportChip, styles.reportTypeChip]}
                        >
                          <Text style={styles.reportChipText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Other Litter Types */}
                {selectedReport?.types && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportNotesText}>
                      {selectedReport.types}
                    </Text>
                  </View>
                )}

                {/* Severity */}
                {selectedReport?.severity && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionLabel}>Severity</Text>
                    <View
                      style={[
                        styles.reportSeverityPill,
                        selectedReport.severity === 'Low' && styles.severityLow,
                        selectedReport.severity === 'Medium' && styles.severityMedium,
                        selectedReport.severity === 'High' && styles.severityHigh,
                      ]}
                    >
                      <Text style={styles.reportSeverityText}>
                        {selectedReport.severity}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Notes Presets */}
                {selectedReport?.notes_presets?.length > 0 && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportSectionLabel}>Notes</Text>

                    <View style={styles.reportChipRow}>
                      {selectedReport.notes_presets.map((n) => (
                        <View
                          key={n}
                          style={[styles.reportChip, styles.reportNoteChip]}
                        >
                          <Text style={styles.reportChipText}>{n}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Free Text Notes */}
                {selectedReport?.notes_other && (
                  <View style={styles.reportSection}>
                    <Text style={styles.reportNotesText}>
                      {selectedReport.notes_other}
                    </Text>
                  </View>
                )}

                {/* Photos */}
                {(photosLoading || reportPhotoUrls.length > 0) && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={styles.reportSectionLabel}>Photos</Text>

                    {photosLoading ? (
                      <View style={{ paddingVertical: 18 }}>
                        <ActivityIndicator size="small" />
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {reportPhotoUrls.map((uri, i) => (
                          <Image
                            key={`${uri}-${i}`}
                            source={{ uri }}
                            style={{
                              width: 140,
                              height: 140,
                              borderRadius: 14,
                              marginRight: 12,
                              backgroundColor: '#EEE',
                            }}
                          />
                        ))}
                      </ScrollView>
                    )}
                  </View>
                )}

                <View style={styles.divider} />

                {/* Metadata */}
                <View style={styles.reportSection}>
                  <Text style={styles.reportMetaLabel}>Reported</Text>
                  <Text style={styles.reportMetaText}>
                  {selectedReport?.created_at
                    ? new Date(selectedReport.created_at).toLocaleString()
                    : ''}
                  </Text>
                
                  {/* Expires (only show if present) */}
                  {selectedReport?.expires_at ? (
                    <>
                      <Text style={[styles.reportMetaLabel, { marginTop: 10 }]}>Expires</Text>
                      <Text style={styles.reportMetaText}>
                      {new Date(selectedReport.expires_at).toLocaleDateString()}
                      </Text>
                    </>
                  ) : null}      
                </View>
             
              </ScrollView>



              <View style={styles.footerBar}>

                {isOwner && (
                <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#E57373' }]}
                onPress={() => {
                  Alert.alert(
                    'Delete report?',
                    'This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          const { error } = await supabase
                            .from('reports')
                            .delete()
                            .eq('id', selectedReport.id);

                          if (error) {
                            Alert.alert('Delete failed', error.message);
                            return;
                          }

                          setMarkers((prev) =>
                            prev.filter((m) => m.id !== selectedReport.id)
                          );

                          setDetailsOpen(false);
                          setSelectedReport(null);
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>
                    </TouchableOpacity>
                  )}


                  {isOwner && (
                      <TouchableOpacity
                        style={[styles.btn, styles.saveBtn]}
                        onPress={() => {
                          setForm({
                            title: selectedReport.title || '',
                            selectedTypes: selectedReport.litter_types || [],
                            types: selectedReport.types || '',   // ✅ ADD
                            photos: [], // we do NOT re-edit photos in v1
                            severity: selectedReport.severity || '',
                            selectedNotes: selectedReport.notes_presets || [],
                            notes: selectedReport.notes_other || '',
                          });

                          setEditingReportId(selectedReport.id);
                          setIsEditing(true);
                          setDetailsOpen(false);
                          setFormOpen(true);
                        }}
                      >
                <Text style={styles.btnText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.btn, styles.cancelBtn]}
                    onPress={() => setDetailsOpen(false)}
                  >
                    <Text style={[styles.btnText, { color: '#333' }]}>Close</Text>
                  </TouchableOpacity>
            </View> 

      
            </View> 
          </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F7' },
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
    bottom: 130,
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
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
    bottom: 60,
    right: 20,
    backgroundColor: '#fff',
    width: 56,
    height: 56,
    borderRadius: 28,
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
signOutButton: {
  position: 'absolute',
  top: 30,
  right: 15,
  backgroundColor: '#fff',
  width: 44,
  height: 44,
  borderRadius: 22,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: 'rgba(0,0,0,0.15)',
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 3,
},
supportButton: {
  position: "absolute",
  top: 85, // <-- adjust if your signOutButton top differs
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
/* Report Details Modal Styles   */
/* ============================= */

reportSheet: {
  flex: 1, // ✅ REQUIRED
  backgroundColor: '#FFFFFF',
  paddingHorizontal: 20,
  paddingTop: 85,
  paddingBottom: 25, // space for footer
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
},


reportTitle: {
  fontSize: 26,
  fontWeight: '800',
  color: '#111827',
  marginBottom: 20, // ⬅️ increase slightly
},


reportSection: {
  marginBottom: 20,
},

reportSectionLabel: {
  fontSize: 17,
  fontWeight: '700',
  color: '#111827',
  marginBottom: 10,
},

/* Chips – shared visual language */

reportChipRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},

reportChip: {
  paddingHorizontal: 14,
  paddingVertical: 8,
  borderRadius: 999,
},

reportChipText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#FFFFFF',
},

/* Litter Types (green – confirmed) */

reportTypeChip: {
  backgroundColor: '#66BB6A',
},

/* Notes (blue – contextual) */

reportNoteChip: {
  backgroundColor: '#42A5F5',
},

/* Severity */

reportSeverityPill: {
  alignSelf: 'flex-start',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 999,
},

severityLow: {
  backgroundColor: '#81C784',
},

severityMedium: {
  backgroundColor: '#FFB74D',
},

severityHigh: {
  backgroundColor: '#E57373',
},

reportSeverityText: {
  fontSize: 15,
  fontWeight: '700',
  color: '#FFFFFF',
},

/* Free-text notes */

reportNotesText: {
  fontSize: 16,
  lineHeight: 24,
  color: '#374151',
},

/* Metadata */

reportMetaLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#6B7280',
  marginBottom: 4,
},

reportMetaText: {
  fontSize: 14,
  color: '#6B7280',
},



// 2× larger marker hit area + icon wrap (Safety Orange)
reportMarkerHitLg: {
  width: 88,          // was 44
  height: 88,         // was 44
  borderRadius: 44,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,0,0,0.01)', // keeps touch target reliable
},

reportMarkerIconWrapLg: {
  width: 60,          // was ~30
  height: 60,         // was ~30
  borderRadius: 30,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#FF8A00', // Safety Orange
  borderWidth: 3,     // slightly thicker for scale
  borderColor: '#fff',
  shadowColor: '#000',
  shadowOpacity: 0.28,
  shadowRadius: 7,
  shadowOffset: { width: 0, height: 3 },
  elevation: 6,
},
savingOverlay: {
  ...StyleSheet.absoluteFillObject,
  backgroundColor: 'rgba(255,255,255,0.55)',
  zIndex: 999,
},



});
