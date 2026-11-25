import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoadingBee from './components/LoadingBee';
import PrivateView from './components/PrivateView';
import { ErrorText, LoadFailure, PrimaryButton, TextLink } from './components/ui';
import { issueStyles as s } from './components/CleanupIssueUI';
import { loadEditableReport, updateReportContent, issueError } from './lib/cleanupIssues';
import { uploadIssueMedia } from './lib/cleanupIssueMedia';
import { chooseCleanupPhotos } from './lib/cleanupSubmission';
import { supabase } from './lib/supabase';
import { useSession } from './lib/session';
import { permanentUserId } from './lib/reportAccess';
import { useReports } from './lib/reports';
import useFocusedResource from './lib/useFocusedResource';
import { colors } from './lib/theme';

export default function ReportContentEditScreen({ navigation, route }) {
  const { user } = useSession();
  const userId = permanentUserId(user);
  const reportId = route.params?.reportId;
  const { refreshReports } = useReports();
  const resource = useFocusedResource(useCallback(() => loadEditableReport(reportId, userId), [reportId, userId]));
  const [description, setDescription] = useState('');
  const [information, setInformation] = useState('');
  const [existing, setExisting] = useState([]);
  const [assets, setAssets] = useState([]);
  const [baseRevision, setBaseRevision] = useState(null);
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const request = useRef(null);
  const uploaded = useRef([]);
  useEffect(() => {
    if (!resource.data || baseRevision !== null) return;
    setDescription(resource.data.notes_other || ''); setInformation(resource.data.additional_information || '');
    setExisting(resource.data.photo_paths || []); setBaseRevision(resource.data.content_revision);
  }, [resource.data, baseRevision]);
  const addPhotos = async () => {
    try {
      const selected = await chooseCleanupPhotos('library', 3 - existing.length - assets.length);
      setAssets(value => [...value, ...selected].slice(0, 3 - existing.length));
    } catch { setError('Couldn’t open photos. Try again.'); }
  };
  const save = async () => {
    if (busy || !description.trim() || existing.length + assets.length < 1) return;
    setBusy(true); setLocked(true); setError('');
    try {
      const paths = await uploadIssueMedia({ assets, paths: uploaded.current, userId, subjectId: reportId, kind: 'report' });
      if (!request.current) request.current = { target_report_id: reportId, expected_revision: baseRevision, update_id: Crypto.randomUUID(), new_description: description.trim(), new_information: information.trim(), new_photo_paths: [...existing, ...paths] };
      await updateReportContent(request.current);
      await refreshReports(); navigation.goBack();
    } catch (failure) {
      setError(/changed_refresh/.test(failure?.message || '') ? 'There’s a newer update. Reopen the editor to review it.' : issueError(failure));
      if (!request.current && uploaded.current.length === 0) setLocked(false);
    } finally { setBusy(false); }
  };
  if (!resource.data && !resource.error) return <LoadingBee label="Loading report" />;
  if (!resource.data) return <LoadFailure title="Report unavailable" onRetry={resource.refresh} />;
  const report = resource.data;
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={95}><ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled"><PrivateView style={{ gap: 22 }}>
    <Text accessibilityRole="header" style={s.title}>Update report</Text>
    {!!report.funded_amount_cents && <View style={{ borderRadius: 14, backgroundColor: colors.yellowPale, padding: 16, flexDirection: 'row', justifyContent: 'space-between' }}><Text style={s.label}>Cleanup fund</Text><Text style={s.label}>${(report.funded_amount_cents / 100).toFixed(2)}</Text></View>}
    <View style={s.field}><Text style={s.label}>Photos</Text><View style={s.photos}>
      {existing.map((path, index) => <TouchableOpacity key={path} disabled={locked} accessibilityRole="button" accessibilityLabel={`Remove report photo ${index + 1}`} onPress={() => setExisting(value => value.filter(p => p !== path))}><Image source={{ uri: supabase.storage.from('report_photos').getPublicUrl(path).data.publicUrl }} style={s.photo} /><Text style={s.time}>Remove</Text></TouchableOpacity>)}
      {assets.map((asset, index) => <TouchableOpacity key={`${asset.uri}-${index}`} disabled={locked} accessibilityRole="button" accessibilityLabel={`Remove new report photo ${index + 1}`} onPress={() => setAssets(value => value.filter((_, i) => i !== index))}><Image source={{ uri: asset.uri }} style={s.photo} /><Text style={s.time}>Remove</Text></TouchableOpacity>)}
    </View><TextLink label="Add photos" align="start" disabled={locked || existing.length + assets.length >= 3} onPress={addPhotos} /></View>
    <View style={s.field}><Text style={s.label}>Description</Text><TextInput accessibilityLabel="Report description" value={description} onChangeText={setDescription} multiline maxLength={2000} editable={!locked} style={s.input} /></View>
    <View style={s.field}><Text style={s.label}>Additional information</Text><TextInput accessibilityLabel="Additional information" value={information} onChangeText={setInformation} multiline maxLength={2000} editable={!locked} style={s.input} /></View>
    <ErrorText>{error}</ErrorText>
    <PrimaryButton label="Save report" busy={busy} disabled={!description.trim() || existing.length + assets.length < 1 || !!resource.error} onPress={save} />
  </PrivateView></ScrollView></KeyboardAvoidingView>;
}
