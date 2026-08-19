// MapScreen.js
import { useEffect, useRef, useState } from 'react';
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
  Keyboard,
  Animated,
  PanResponder,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Linking,
  useWindowDimensions,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './lib/supabase'
import { deleteCurrentAccount, signOut } from './lib/auth';
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
  const REPORT_STEPS = [
    'Title',
    'Photos',
    'Litter Types',
    'Severity',
    'Notes',
    'Review',
  ];
  const MAX_REPORT_DISTANCE_MILES = 10;
  const [markers, setMarkers] = useState([]); // saved reports
  const [draftCoord, setDraftCoord] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [reportStep, setReportStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const stepTranslateX = useRef(new Animated.Value(0)).current;
  const stepOpacity = useRef(new Animated.Value(1)).current;
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
  const [currentUser, setCurrentUser] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [photosLoading, setPhotosLoading] = useState(false);
  // Report detail photo carousel
  const [reportPhotoIndex, setReportPhotoIndex] = useState(0);
  const { width: screenWidth } = useWindowDimensions();
  // Leave 20px margin on each side of the main report photo
  const reportHeroWidth = Math.max(screenWidth - 40, 280);


  // const PATREON_URL = "https://patreon.com/litterbugs?utm_medium=unknown&utm_source=join_link&utm_campaign=creatorshare_creator&utm_content=copyLink"; // <-- paste your real link

  // =============================
// Multi-step Report Form
// =============================

const resetReportWizard = () => {
  setReportStep(0);
  stepTranslateX.setValue(0);
  stepOpacity.setValue(1);
  setIsTransitioning(false);
};

// Determines whether the user can move forward from a given step
const canAdvanceFromStep = (step = reportStep) => {
  // Litter Types are required.
  // Either a preset selection OR something typed in "Other" counts.
  if (step === 2) {
    return (
      (form.selectedTypes?.length ?? 0) > 0 ||
      Boolean(form.types?.trim())
    );
  }

  // Severity is required
  if (step === 3) {
    return Boolean(form.severity);
  }

  // All other steps are optional
  return true;
};

// Animate between report screens
const transitionToReportStep = (nextStep, direction) => {
  if (
    isTransitioning ||
    nextStep < 0 ||
    nextStep >= REPORT_STEPS.length ||
    nextStep === reportStep
  ) {
    return;
  }

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
    setReportStep(nextStep);

    // Position incoming screen on opposite side
    stepTranslateX.setValue(direction > 0 ? 80 : -80);

    // Slide new screen in
    Animated.parallel([
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
    ]).start(() => {
      setIsTransitioning(false);
    });
  });
};

const goToNextReportStep = () => {
  if (reportStep >= REPORT_STEPS.length - 1) return;

  if (!canAdvanceFromStep(reportStep)) return;

  transitionToReportStep(reportStep + 1, 1);
};

const goToPreviousReportStep = () => {
  if (reportStep <= 0) return;

  transitionToReportStep(reportStep - 1, -1);
};

// Used by the Edit buttons on the review screen
const jumpToReportStep = (step) => {
  if (step === reportStep) return;

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

// Calculate distance between two GPS coordinates using the Haversine formula
const getDistanceMiles = (pointA, pointB) => {
  const EARTH_RADIUS_MILES = 3958.8;

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const lat1 = toRadians(pointA.latitude);
  const lon1 = toRadians(pointA.longitude);
  const lat2 = toRadians(pointB.latitude);
  const lon2 = toRadians(pointB.longitude);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
};

// Pressing Map opens Litter Form
// Reports can only be created near the user's current GPS location
const onMapPress = async (e) => {
  const coord = e.nativeEvent.coordinate;

  try {
    // Check whether location permission is available
    let { status } = await Location.getForegroundPermissionsAsync();

    if (status !== 'granted') {
      const permissionResult =
        await Location.requestForegroundPermissionsAsync();

      status = permissionResult.status;
    }

    if (status !== 'granted') {
      Alert.alert(
        'Location Required',
        'Litterbugs needs your location to verify that a report is near you.'
      );
      return;
    }

    // Get the user's current GPS location
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const userCoord = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    };

    // Calculate distance from user to selected report location
    const distanceMiles = getDistanceMiles(userCoord, coord);

    // Block reports that are outside the permitted radius
    if (distanceMiles > MAX_REPORT_DISTANCE_MILES) {
      Alert.alert(
        'Report Location Too Far Away',
        `Litterbugs reports can only be created within ${MAX_REPORT_DISTANCE_MILES} miles of your current location. You can still browse and view reports anywhere on the map.`
      );
      return;
    }

    // Location is valid — continue opening the report form
    setDraftCoord(coord);

    setForm({
      title: '',
      selectedTypes: [],
      types: '',
      photos: [],
      severity: '',
      selectedNotes: [],
      notes: '',
    });

    resetReportWizard();
    setFormOpen(true);

  } catch (error) {
    console.log('Report location verification error:', error);

    Alert.alert(
      'Unable to Verify Location',
      'Litterbugs could not determine your current location. Please try again.'
    );
  }
};


// Save Report Function
  const saveReport = async () => {
    if (!draftCoord && !isEditing) return;
  
    try {
      // ✅ get user FIRST
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
  
      const createPayload = {
        title: form.title?.trim() || 'Litter Report',
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
        title: form.title?.trim() || 'Litter Report',
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
      resetReportWizard();

      Alert.alert(
        'Report saved',
        'Thanks for helping keep the community clean!'
      );
    } catch (e) {
      console.error('Unexpected save error:', e);
      Alert.alert('Error', 'Something went wrong saving your report.');
    }
  };
  
// Final submit from Review screen
const submitReport = async () => {
  if (isSaving) return;

  setIsSaving(true);

  try {
    await saveReport();
  } finally {
    setIsSaving(false);
  }
};

  // Cancel Report
  const cancelDraft = () => {
    setDraftCoord(null);
    setFormOpen(false);
    setIsEditing(false);
    setEditingReportId(null);
    resetReportWizard();
  };

// User Can Sign Out
// Confirm before signing the user out

const handleSignOut = () => {
  if (signingOut) return;

  const guestWarning = currentUser?.is_anonymous
    ? 'Are you sure you want to sign out? This guest account cannot be recovered or transferred.'
    : 'Are you sure you want to sign out?';

  Alert.alert(
    'Sign Out',
    guestWarning,
    [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          const { error } = await signOut();

          if (error) {
            setSigningOut(false);
            Alert.alert('Couldn’t sign out', 'Check your connection and try again.');
            return;
          }

          setAccountOpen(false);
        },
      },
    ]
  );
};

const handleDeleteAccount = () => {
  if (signingOut || deletingAccount) return;

  Alert.alert(
    'Delete Account',
    'This permanently deletes your account and uploaded photos. Community report locations, categories, severity, status, and dates will remain without your identity. This cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Account',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingAccount(true);
            await deleteCurrentAccount();
            setAccountOpen(false);
          } catch (error) {
            Alert.alert(
              'Couldn’t delete account',
              'No additional changes were made. Check your connection and try again.'
            );
          } finally {
            setDeletingAccount(false);
          }
        },
      },
    ]
  );
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
        setCurrentUser(data.user ?? null);
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
    // Always begin a newly opened report on its first photo
    setReportPhotoIndex(0);
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

  const isGuest = Boolean(currentUser?.is_anonymous);
  const accountStatus = isGuest ? 'Guest account' : 'Signed in';

// Links out to Patreon Account
// const openPatreon = async () => {
//   try {
//     const supported = await Linking.canOpenURL(PATREON_URL);
//     if (!supported) {
//       Alert.alert("Can't open link", "Unable to open Patreon on this device.");
//       return;
//     }
//     await Linking.openURL(PATREON_URL);
//   } catch (e) {
//     console.log("Patreon link error:", e);
//     Alert.alert("Link error", "Something went wrong opening Patreon.");
//   }
// };

// =============================
// Report Form Step Content
// =============================

const renderReportStep = () => {
  const reviewPhotos =
    form.photos.length > 0
      ? form.photos
      : isEditing
        ? reportPhotoUrls
        : [];

  switch (reportStep) {

    // =============================
    // STEP 1 — TITLE
    // =============================
    case 0:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            OPTIONAL
          </Text>

          <Text style={styles.wizardTitle}>
            Give this report a title
          </Text>

          <Text style={styles.wizardDescription}>
            Keep it short and recognizable. If you leave this blank,
            we'll use “Litter Report.”
          </Text>

          <TextInput
            style={[
              styles.input,
              styles.wizardLargeInput,
            ]}
            placeholder="Litter Report"
            value={form.title}
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
        </View>
      );


    // =============================
    // STEP 2 — PHOTOS
    // =============================
    case 1:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            OPTIONAL · RECOMMENDED
          </Text>

          <Text style={styles.wizardTitle}>
            Add photos
          </Text>

          <Text style={styles.wizardDescription}>
            Photos make the site easier to identify and help show
            what the area looked like before cleanup.
          </Text>

          {isEditing ? (
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
                Photo replacement isn't enabled while editing a report yet.
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
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.wizardPhotoButton,
                  form.photos.length >= 3 &&
                    styles.wizardDisabled,
                ]}
                onPress={pickImage}
                disabled={
                  isSaving ||
                  form.photos.length >= 3
                }
              >
                <View style={styles.wizardPhotoIcon}>
                  <Ionicons
                    name="camera-outline"
                    size={34}
                    color="#2F7D32"
                  />
                </View>

                <Text style={styles.wizardPhotoButtonTitle}>
                  {form.photos.length >= 3
                    ? '3 photos added'
                    : 'Add a photo'}
                </Text>

                <Text style={styles.wizardPhotoHelper}>
                  Up to 3 photos
                </Text>
              </TouchableOpacity>

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
        </View>
      );


    // =============================
    // STEP 3 — LITTER TYPES
    // =============================
    case 2:
      return (
        <View style={styles.wizardStep}>
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
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                types: text,
              }))
            }
          />

          {!canAdvanceFromStep(2) && (
            <Text style={styles.requiredHint}>
              Select at least one litter type to continue.
            </Text>
          )}
        </View>
      );


    // =============================
    // STEP 4 — SEVERITY
    // =============================
    case 3:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            REQUIRED
          </Text>

          <Text style={styles.wizardTitle}>
            How severe is it?
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
            <Text style={styles.requiredHint}>
              Choose a severity level to continue.
            </Text>
          )}
        </View>
      );


    // =============================
    // STEP 5 — NOTES
    // =============================
    case 4:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            OPTIONAL · RECOMMENDED
          </Text>

          <Text style={styles.wizardTitle}>
            Anything else people should know?
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
            style={[
              styles.input,
              styles.wizardNotesInput,
            ]}
            placeholder="Add any extra details"
            value={form.notes}
            onChangeText={(text) =>
              setForm((prev) => ({
                ...prev,
                notes: text,
              }))
            }
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
        </View>
      );


    // =============================
    // STEP 6 — REVIEW & SUBMIT
    // =============================
    case 5:
      return (
        <View style={styles.wizardStep}>
          <Text style={styles.wizardEyebrow}>
            FINAL STEP
          </Text>

          <Text style={styles.wizardTitle}>
            Review your report
          </Text>

          <Text style={styles.wizardDescription}>
            Make sure everything looks right before you submit it.
          </Text>


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
                    jumpToReportStep(1)
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
                    jumpToReportStep(2)
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
                    jumpToReportStep(3)
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
                    jumpToReportStep(4)
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


          <TouchableOpacity
            style={[
              styles.wizardSubmitButton,
              isSaving && styles.wizardDisabled,
            ]}
            onPress={submitReport}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
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
        </View>
      );

    default:
      return null;
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


      {/* Account Button */}
        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => setAccountOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open account menu"
        >
          <Ionicons name="person-circle-outline" size={25} color="#444" />
        </TouchableOpacity>

        <Modal
          visible={accountOpen}
          animationType="slide"
          transparent
          onRequestClose={() => {
            if (!signingOut && !deletingAccount) setAccountOpen(false);
          }}
        >
          <View style={styles.accountBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              accessible={false}
              onPress={() => {
                if (!signingOut && !deletingAccount) setAccountOpen(false);
              }}
            />
            <View style={styles.accountSheet}>
              <View style={styles.accountHandle} />
              <View style={styles.accountHeadingRow}>
                <View style={styles.accountIcon}>
                  <Ionicons name={isGuest ? 'person-outline' : 'person-circle-outline'} size={28} color="#2F7D32" />
                </View>
                <View style={styles.accountCopy}>
                  <Text style={styles.accountTitle}>Account</Text>
                  <Text style={styles.accountStatus}>{accountStatus}</Text>
                  {!isGuest && currentUser?.email ? (
                    <Text style={styles.accountEmail} numberOfLines={1}>{currentUser.email}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.accountCloseButton, (signingOut || deletingAccount) && { opacity: 0.5 }]}
                  onPress={() => setAccountOpen(false)}
                  disabled={signingOut || deletingAccount}
                  accessibilityLabel="Close account menu"
                >
                  <Ionicons name="close" size={24} color="#555" />
                </TouchableOpacity>
              </View>

              {isGuest ? (
                <Text style={styles.accountGuestNote}>
                  Guest accounts cannot be recovered or transferred after signing out.
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.accountSignOutButton, (signingOut || deletingAccount) && { opacity: 0.65 }]}
                onPress={handleSignOut}
                disabled={signingOut || deletingAccount}
                accessibilityRole="button"
                accessibilityLabel={signingOut ? 'Signing out' : 'Sign out'}
              >
                {signingOut ? (
                  <ActivityIndicator size="small" color="#B42318" />
                ) : (
                  <Ionicons name="log-out-outline" size={21} color="#B42318" />
                )}
                <Text style={styles.accountSignOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.accountDeleteButton, (signingOut || deletingAccount) && { opacity: 0.65 }]}
                onPress={handleDeleteAccount}
                disabled={signingOut || deletingAccount}
                accessibilityRole="button"
                accessibilityLabel={deletingAccount ? 'Deleting account' : 'Delete account'}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="trash-outline" size={21} color="#FFFFFF" />
                )}
                <Text style={styles.accountDeleteText}>
                  {deletingAccount ? 'Deleting account…' : 'Delete account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Support Button (Patreon) */}
        {/* <TouchableOpacity
          style={styles.supportButton}
          onPress={openPatreon}
          accessibilityRole="button"
          accessibilityLabel="Support Litterbugs on Patreon"
        >
          <Ionicons name="heart" size={22} color="#E53935" />
        </TouchableOpacity> */}


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

{/* Multi-step Report Form */}
<Modal
  visible={formOpen}
  animationType="slide"
  transparent
  onRequestClose={cancelDraft}
>
  <View style={styles.modalBackdrop}>
    <KeyboardAvoidingView
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : 'height'
      }
      style={styles.wizardKeyboardView}
    >
      <View style={styles.wizardSheet}>

        {isSaving && (
          <View
            style={styles.savingOverlay}
            pointerEvents="auto"
          />
        )}


        {/* Persistent Header */}
        <View style={styles.wizardHeader}>

          <View style={{ flex: 1 }}>
            <Text style={styles.wizardHeaderTitle}>
              {isEditing
                ? 'Edit Litter Report'
                : 'New Litter Report'}
            </Text>

            <Text style={styles.wizardHeaderStep}>
              {REPORT_STEPS[reportStep]}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.wizardCloseButton}
            onPress={cancelDraft}
            disabled={isSaving}
          >
            <Ionicons
              name="close"
              size={25}
              color="#374151"
            />
          </TouchableOpacity>

        </View>


        <View style={styles.wizardDivider} />


        {/* Animated Page */}
        <Animated.View
          {...reportStepPanResponder.panHandlers}
          style={[
            styles.wizardPage,
            {
              opacity: stepOpacity,

              transform: [
                {
                  translateX:
                    stepTranslateX,
                },
              ],
            },
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.wizardScrollContent
            }
          >
            {renderReportStep()}
          </ScrollView>
        </Animated.View>


        {/* Persistent bottom navigation */}
        <View style={styles.wizardFooter}>

          {/* LEFT */}
          <TouchableOpacity
            style={styles.wizardArrowButton}
            onPress={goToPreviousReportStep}
            disabled={
              reportStep === 0 ||
              isTransitioning ||
              isSaving
            }
          >
            <Ionicons
              name="arrow-back-circle"
              size={39}
              color={
                reportStep === 0 ||
                isTransitioning ||
                isSaving
                  ? '#D1D5DB'
                  : '#4B5563'
              }
            />
          </TouchableOpacity>


          {/* DOTS */}
          <View style={styles.wizardDots}>
            {REPORT_STEPS.map(
              (step, index) => (
                <View
                  key={step}
                  style={[
                    styles.wizardDot,

                    index === reportStep &&
                      styles.wizardDotActive,
                  ]}
                />
              )
            )}
          </View>


          {/* RIGHT */}
          <TouchableOpacity
            style={styles.wizardArrowButton}
            onPress={goToNextReportStep}
            disabled={
              reportStep ===
                REPORT_STEPS.length - 1 ||
              !canAdvanceFromStep(
                reportStep
              ) ||
              isTransitioning ||
              isSaving
            }
          >
            <Ionicons
              name="arrow-forward-circle"
              size={39}
              color={
                reportStep ===
                  REPORT_STEPS.length - 1 ||
                !canAdvanceFromStep(
                  reportStep
                ) ||
                isTransitioning ||
                isSaving
                  ? '#D1D5DB'
                  : '#2F7D32'
              }
            />
          </TouchableOpacity>

        </View>
      </View>
    </KeyboardAvoidingView>
  </View>
</Modal>

{/* ============================= */}
{/* Redesigned Report Detail View */}
{/* ============================= */}

<Modal
  visible={detailsOpen}
  animationType="slide"
  transparent
  onRequestClose={() => setDetailsOpen(false)}
>
  <View style={styles.modalBackdrop}>
    <View style={styles.reportSheet}>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={styles.reportPostScrollContent}
      >

        {/* ============================= */}
        {/* Report Header                 */}
        {/* ============================= */}

        <View style={styles.reportPostHeader}>

          {/*
            Future profile integration:
            reporter avatar / display name can eventually
            be inserted here without restructuring the report.
          */}

          <Text style={styles.reportPostTitle}>
            {selectedReport?.title || 'Litter Report'}
          </Text>

          {/* Report dates */}
          <View style={styles.reportMetaStack}>

            {selectedReport?.created_at && (
              <View style={styles.reportMetaItem}>
                <Ionicons
                  name="time-outline"
                  size={17}
                  color="#667085"
                />

                <View>
                  <Text style={styles.reportMetaItemLabel}>
                    Reported
                  </Text>

                  <Text style={styles.reportMetaItemText}>
                    {new Date(
                      selectedReport.created_at
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {selectedReport?.expires_at && (
              <View style={styles.reportMetaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color="#667085"
                />

                <View>
                  <Text style={styles.reportMetaItemLabel}>
                    Expires
                  </Text>

                  <Text style={styles.reportMetaItemText}>
                    {new Date(
                      selectedReport.expires_at
                    ).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}

          </View>


          {/* Severity */}
          {selectedReport?.severity && (
            <View
              style={[
                styles.reportSeverityPill,

                selectedReport.severity === 'Low' &&
                  styles.severityLow,

                selectedReport.severity === 'Medium' &&
                  styles.severityMedium,

                selectedReport.severity === 'High' &&
                  styles.severityHigh,
              ]}
            >
              <Ionicons
                name={
                  selectedReport.severity === 'High'
                    ? 'warning-outline'
                    : selectedReport.severity === 'Low'
                      ? 'leaf-outline'
                      : 'trash-outline'
                }
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.reportSeverityText}>
                {selectedReport.severity} Severity
              </Text>
            </View>
          )}

        </View>


        {/* ============================= */}
        {/* Main Photo / Carousel         */}
        {/* ============================= */}

        {photosLoading ? (

          <View style={styles.reportPhotoLoadingCard}>
            <ActivityIndicator
              size="large"
              color="#66BB6A"
            />

            <Text style={styles.reportPhotoLoadingText}>
              Loading photos…
            </Text>
          </View>

        ) : reportPhotoUrls.length > 0 ? (

          <View
            style={[
              styles.reportPhotoCarousel,
              {
                width: reportHeroWidth,
              },
            ]}
          >

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={reportHeroWidth}
              onMomentumScrollEnd={(event) => {
                const offsetX =
                  event.nativeEvent.contentOffset.x;

                const nextIndex = Math.round(
                  offsetX / reportHeroWidth
                );

                setReportPhotoIndex(nextIndex);
              }}
            >

              {reportPhotoUrls.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  resizeMode="cover"
                  style={[
                    styles.reportHeroImage,
                    {
                      width: reportHeroWidth,
                    },
                  ]}
                />
              ))}

            </ScrollView>


            {/* Instagram-style photo count */}
            {reportPhotoUrls.length > 1 && (
              <View style={styles.reportPhotoCounter}>
                <Text style={styles.reportPhotoCounterText}>
                  {reportPhotoIndex + 1}/{reportPhotoUrls.length}
                </Text>
              </View>
            )}

          </View>

        ) : (

          /* Graceful layout for reports without photos */
          <View style={styles.reportNoPhotoCard}>

            <View style={styles.reportNoPhotoIcon}>
              <Ionicons
                name="image-outline"
                size={32}
                color="#98A2B3"
              />
            </View>

            <Text style={styles.reportNoPhotoTitle}>
              No photo added
            </Text>

            <Text style={styles.reportNoPhotoText}>
              This report was submitted without a photo.
            </Text>

          </View>
        )}


        {/* Photo pagination dots */}
        {!photosLoading &&
          reportPhotoUrls.length > 1 && (

          <View style={styles.reportPhotoDots}>

            {reportPhotoUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.reportPhotoDot,

                  index === reportPhotoIndex &&
                    styles.reportPhotoDotActive,
                ]}
              />
            ))}

          </View>
        )}


        {/* ============================= */}
        {/* Main Report Information       */}
        {/* ============================= */}

        <View style={styles.reportPostBody}>


          {/* Litter Types */}
          {(
            selectedReport?.litter_types?.length > 0 ||
            selectedReport?.types
          ) && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="#2F7D32"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Litter Types
                </Text>

              </View>


              <View style={styles.reportChipRow}>

                {selectedReport?.litter_types?.map((type) => (

                  <View
                    key={type}
                    style={[
                      styles.reportChip,
                      styles.reportTypeChip,
                    ]}
                  >
                    <Text style={styles.reportChipText}>
                      {type}
                    </Text>
                  </View>

                ))}


                {/* User-entered "Other" litter type */}
                {selectedReport?.types && (

                  <View
                    style={[
                      styles.reportChip,
                      styles.reportOtherTypeChip,
                    ]}
                  >
                    <Text style={styles.reportOtherTypeText}>
                      {selectedReport.types}
                    </Text>
                  </View>

                )}

              </View>

            </View>
          )}


          {/* Notes */}
          {selectedReport?.notes_presets?.length > 0 && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="information-circle-outline"
                  size={21}
                  color="#1E88E5"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Notes
                </Text>

              </View>


              <View style={styles.reportChipRow}>

                {selectedReport.notes_presets.map((note) => (

                  <View
                    key={note}
                    style={[
                      styles.reportChip,
                      styles.reportNoteChip,
                    ]}
                  >
                    <Text style={styles.reportChipText}>
                      {note}
                    </Text>
                  </View>

                ))}

              </View>

            </View>
          )}


          {/* Additional descriptive information */}
          {selectedReport?.notes_other && (

            <View style={styles.reportPostSection}>

              <View style={styles.reportSectionHeader}>

                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="#667085"
                />

                <Text style={styles.reportPostSectionTitle}>
                  Additional Details
                </Text>

              </View>

              <View style={styles.reportDetailsCard}>

                <Text style={styles.reportDetailsText}>
                  {selectedReport.notes_other}
                </Text>

              </View>

            </View>
          )}


          {/*
            Version 2:
            Cleanup status, cleaner identity, claim button,
            bounty/payment information and before/after
            cleanup information can be inserted here.
          */}

        </View>

      </ScrollView>


      {/* ============================= */}
      {/* Persistent Footer             */}
      {/* ============================= */}

      <View style={styles.reportFooter}>


        {/* DELETE — signed-in owner only */}
        {isOwner && (

          <TouchableOpacity
            style={[
              styles.reportFooterButton,
              styles.reportDeleteButton,
            ]}
            onPress={() => {

              Alert.alert(
                'Delete report?',
                'This action cannot be undone.',
                [
                  {
                    text: 'Cancel',
                    style: 'cancel',
                  },
                  {
                    text: 'Delete',
                    style: 'destructive',

                    onPress: async () => {

                      const { error } = await supabase
                        .from('reports')
                        .delete()
                        .eq(
                          'id',
                          selectedReport.id
                        );

                      if (error) {
                        Alert.alert(
                          'Delete failed',
                          error.message
                        );

                        return;
                      }

                      setMarkers((prev) =>
                        prev.filter(
                          (marker) =>
                            marker.id !==
                            selectedReport.id
                        )
                      );

                      setDetailsOpen(false);
                      setSelectedReport(null);
                    },
                  },
                ]
              );
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete report"
          >

            <Ionicons
              name="trash-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.reportDeleteButtonText}>
              Delete
            </Text>

          </TouchableOpacity>
        )}


        {/* EDIT — signed-in owner only */}
        {isOwner && (

          <TouchableOpacity
            style={[
              styles.reportFooterButton,
              styles.reportEditButton,
            ]}
            onPress={() => {

              setForm({
                title:
                  selectedReport.title || '',

                selectedTypes:
                  selectedReport.litter_types || [],

                types:
                  selectedReport.types || '',

                // Photos remain unchanged in v1
                photos: [],

                severity:
                  selectedReport.severity || '',

                selectedNotes:
                  selectedReport.notes_presets || [],

                notes:
                  selectedReport.notes_other || '',
              });


              setEditingReportId(
                selectedReport.id
              );

              setIsEditing(true);


              // Keep original report location
              setDraftCoord({
                latitude:
                  selectedReport.latitude,

                longitude:
                  selectedReport.longitude,
              });


              resetReportWizard();

              setDetailsOpen(false);
              setFormOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Edit report"
          >

            <Ionicons
              name="create-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.reportEditButtonText}>
              Edit
            </Text>

          </TouchableOpacity>
        )}


        {/* CLOSE — everyone */}
        <TouchableOpacity
          style={[
            styles.reportFooterButton,
            styles.reportCloseButton,
          ]}
          onPress={() => setDetailsOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Close report"
        >

          <Ionicons
            name="close-outline"
            size={20}
            color="#374151"
          />

          <Text style={styles.reportCloseButtonText}>
            Close
          </Text>

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

wizardPhotoButton: {
  minHeight: 190,
  borderRadius: 20,
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: '#A5D6A7',
  backgroundColor: '#F1F8E9',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
},

wizardPhotoIcon: {
  width: 64,
  height: 64,
  borderRadius: 32,
  backgroundColor: '#FFFFFF',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 12,
},

wizardPhotoButtonTitle: {
  fontSize: 18,
  fontWeight: '800',
  color: '#2F7D32',
},

wizardPhotoHelper: {
  marginTop: 5,
  fontSize: 13,
  color: '#667085',
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


/* Severity */

wizardSeverityList: {
  gap: 14,
},

wizardSeverityOption: {
  minHeight: 74,
  borderRadius: 18,
  borderWidth: 1.5,
  borderColor: '#D1D5DB',
  backgroundColor: '#F9FAFB',
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 20,
  gap: 14,
},

wizardSeveritySelected: {
  borderColor: '#66BB6A',
  backgroundColor: '#F1F8E9',
},

wizardSeverityText: {
  flex: 1,
  fontSize: 18,
  fontWeight: '700',
  color: '#374151',
},

wizardSeverityTextSelected: {
  color: '#2F7D32',
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

wizardNotesInput: {
  minHeight: 120,
  paddingTop: 14,
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
  height: 52,
  alignItems: 'center',
  justifyContent: 'center',
},

wizardDots: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  flex: 1,
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
accountButton: {
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
accountBackdrop: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0,0,0,0.34)',
},
accountSheet: {
  backgroundColor: '#fff',
  paddingHorizontal: 22,
  paddingTop: 10,
  paddingBottom: Platform.OS === 'ios' ? 34 : 22,
  borderTopLeftRadius: 22,
  borderTopRightRadius: 22,
},
accountHandle: {
  width: 42,
  height: 5,
  borderRadius: 3,
  backgroundColor: '#D3D7DB',
  alignSelf: 'center',
  marginBottom: 18,
},
accountHeadingRow: {
  flexDirection: 'row',
  alignItems: 'center',
},
accountIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#EAF5EA',
},
accountCopy: {
  flex: 1,
  marginLeft: 12,
},
accountTitle: {
  fontSize: 20,
  fontWeight: '800',
  color: '#333',
},
accountStatus: {
  color: '#53606B',
  fontSize: 14,
  marginTop: 2,
},
accountEmail: {
  color: '#737E87',
  fontSize: 13,
  marginTop: 2,
},
accountCloseButton: {
  width: 44,
  height: 44,
  alignItems: 'center',
  justifyContent: 'center',
},
accountGuestNote: {
  marginTop: 16,
  padding: 12,
  borderRadius: 10,
  backgroundColor: '#FFF7E6',
  color: '#6F4B00',
  fontSize: 13,
  lineHeight: 19,
},
accountSignOutButton: {
  minHeight: 50,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  marginTop: 20,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#F1B8B4',
  backgroundColor: '#FFF7F6',
},
accountSignOutText: {
  color: '#B42318',
  fontSize: 16,
  fontWeight: '800',
},
accountDeleteButton: {
  minHeight: 50,
  marginTop: 12,
  borderRadius: 12,
  backgroundColor: '#B42318',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
},
accountDeleteText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '800',
},
supportButton: {
  position: "absolute",
  top: 85, // <-- adjust if your accountButton top differs
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


/* Main vertical report scroll */

reportPostScrollContent: {
  paddingTop: 72,
  paddingBottom: 125,
},


/* ============================= */
/* Header                        */
/* ============================= */

reportPostHeader: {
  paddingHorizontal: 22,
  paddingBottom: 22,
},

reportPostTitle: {
  fontSize: 30,
  lineHeight: 36,
  fontWeight: '800',
  color: '#1F2937',
  marginBottom: 18,
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


/* ============================= */
/* Persistent footer             */
/* ============================= */

reportFooter: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  flexDirection: 'row',
  gap: 10,
  paddingHorizontal: 16,
  paddingTop: 12,
  paddingBottom: 20,
  backgroundColor: '#FFFFFF',
  borderTopWidth: 1,
  borderTopColor: 'rgba(0,0,0,0.08)',
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
  backgroundColor: '#E57373',
},

reportDeleteButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

reportEditButton: {
  backgroundColor: '#66BB6A',
},

reportEditButtonText: {
  color: '#FFFFFF',
  fontSize: 15,
  fontWeight: '800',
},

reportCloseButton: {
  backgroundColor: '#F3F4F6',
  borderWidth: 1,
  borderColor: '#E5E7EB',
},

reportCloseButtonText: {
  color: '#374151',
  fontSize: 15,
  fontWeight: '800',
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
