// Local native UI check only. This entry never imports App/MapScreen or publishes
// reports. It reads one real public cleanup; the normal wizard's final action is
// deliberately intercepted. Production index.js does not import this module.
import 'react-native-url-polyfill/auto';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { registerRootComponent } from 'expo';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ReportSiteActivity from '../components/ReportSiteActivity';
import ReportWizardModal from '../components/ReportWizardModal';
import useReportWizardNavigation from '../lib/useReportWizardNavigation';
import { colors, fonts } from '../lib/theme';

const report = { id: 'e930e42c-a238-4786-b0e5-dd0ce1e5b319', cleanup_state: 'completed' };
const empty = { title: '', selectedTypes: [], types: '', photos: [], severity: '', selectedNotes: [], notes: '', startingFundingChoice: 'none', startingFundingOther: '' };
function NativeCheck() {
  const [loaded] = useFonts({ [fonts.heading]: require('../assets/fonts/Nunito-Black.ttf') });
  useEffect(() => { if (loaded) void SplashScreen.hideAsync(); }, [loaded]);
  const [source, setSource] = useState(null);
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const scroll = useRef(null);
  const wizard = useReportWizardNavigation({ form, isEditing: false, selectedReport: null, photoPreparationStatus: null });
  const pickImage = async kind => {
    const result = kind === 'camera' ? await ImagePicker.launchCameraAsync({ quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) setForm(value => ({ ...value, photos: [...value.photos, ...result.assets.map(asset => asset.uri)].slice(0, 5) }));
  };
  if (!loaded) return null;
  return <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }}>
    <ScrollView contentContainerStyle={{ padding: 22 }}>
      <Text style={{ color: colors.muted, fontSize: 12 }}>LOCAL NATIVE QA · public data · no publication</Text>
      <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: colors.ink, marginVertical: 16 }}>Hobby lobby cleanup pt 2</Text>
      <Text style={{ color: colors.body }}>Reported by James Luke Barber</Text>
      <ReportSiteActivity report={report} visible onReportAgain={row => { setSource(row); setForm({ ...empty, title: row.title }); setAccepted(false); wizard.resetReportWizard(); setOpen(true); }} onOpenReport={() => Alert.alert('Read-only check', 'Report navigation is covered by the application tests.')} />
    </ScrollView>
    <ReportWizardModal {...wizard} form={form} setForm={setForm} formOpen={open} siteReport draftCoord={source?.location} isEditing={false}
      reportWizardScrollRef={scroll} cancelDraft={() => setOpen(false)} reportPhotoUrls={[]} pickImage={pickImage}
      removePhoto={index => setForm(value => ({ ...value, photos: value.photos.filter((_, i) => index !== i) }))}
      hasAttachedReportPhoto={form.photos.length > 0} fundingEnabled={false} hasStartingFundingChoice wantsStartingFunding={false}
      startingContributionCents={0} photoReviewAccepted={accepted} setPhotoReviewAccepted={setAccepted}
      submitReport={() => Alert.alert('Local UI check complete', 'No report was sent.')} revealBottomReportField={() => {}} />
  </SafeAreaView>;
}
registerRootComponent(() => <SafeAreaProvider><NativeCheck /></SafeAreaProvider>);
