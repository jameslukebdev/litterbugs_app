import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PrivateView from './components/PrivateView';
import LoadingBee from './components/LoadingBee';
import { ErrorText, LoadFailure, PrimaryButton, SecondaryButton, TextLink } from './components/ui';
import { IssuePhoto, issueStyles as s } from './components/CleanupIssueUI';
import { ISSUE_REASONS, isTeamIssue, issueActions, issueError, issueStatus, loadIssue, loadIssueRequest, openIssue, replyIssue, resumeIssue } from './lib/cleanupIssues';
import { uploadIssueMedia } from './lib/cleanupIssueMedia';
import { chooseCleanupPhotos } from './lib/cleanupSubmission';
import { useSession } from './lib/session';
import { permanentUserId } from './lib/reportAccess';
import { useReports } from './lib/reports';
import useFocusedResource from './lib/useFocusedResource';
import { colors } from './lib/theme';

export default function CleanupIssueScreen({ navigation, route }) {
  const { user } = useSession();
  const userId = permanentUserId(user);
  const { refreshReports, getReportPhotoUrl } = useReports();
  const { issueId, cleanupId } = route.params || {};
  const creating = !issueId;
  const resource = useFocusedResource(useCallback(() => {
    if (!userId) throw new Error('issue_not_allowed');
    return creating ? loadIssueRequest(cleanupId, userId) : loadIssue(issueId, userId, getReportPhotoUrl);
  }, [creating, cleanupId, issueId, userId, getReportPhotoUrl]));
  useFocusEffect(useCallback(() => {
    if (creating) return undefined;
    const timer = setInterval(resource.refresh, 15000);
    return () => clearInterval(timer);
  }, [creating, resource.refresh]));
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('access');
  const [keepsClaim, setKeepsClaim] = useState(true);
  const [body, setBody] = useState('');
  const [assets, setAssets] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [followUp, setFollowUp] = useState(false);
  const [earlierOpen, setEarlierOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const request = useRef(null);
  const uploaded = useRef([]);
  const data = resource.data;
  const issue = data?.issue;
  const report = data?.report;
  const actions = issueActions(issue, userId);
  useEffect(() => {
    if (!request.current || !issue) return;
    // Recover a committed reply whose HTTP response was lost, rather than
    // offering to send the same message again with a new idempotency key.
    if (data.messages.some(row => row.id === request.current.message_id)) {
      request.current = null; uploaded.current = []; setAssets([]); setBody('');
      setLocked(false); setFollowUp(false); setError('');
    } else if (request.current.expected_version !== issue.version) {
      request.current = null; setLocked(false);
      setError('There’s a newer update. Review it before sending.');
    }
  }, [issue?.version, data?.messages]);
  const addPhotos = async () => {
    try {
      const selected = await chooseCleanupPhotos('library', 3 - assets.length);
      setAssets(value => [...value, ...selected].slice(0, 3));
    } catch { setError('Couldn’t open photos. Try again.'); }
  };
  const send = async () => {
    if (busy || !body.trim() || resource.error) return;
    setBusy(true); setError('');
    try {
      setLocked(true);
      const photoPaths = await uploadIssueMedia({ assets, paths: uploaded.current, userId, subjectId: creating ? cleanupId : issue.cleanup_attempt_id });
      if (!request.current) request.current = creating ? {
        target_cleanup_id: cleanupId, request_id: Crypto.randomUUID(), issue_reason: reason,
        message_body: body.trim(), keeps_claim: keepsClaim, message_photos: photoPaths,
      } : {
        target_issue_id: issue.id, message_id: Crypto.randomUUID(), expected_version: issue.version,
        message_body: body.trim(), message_photos: photoPaths,
      };
      const saved = creating ? await openIssue(request.current) : await replyIssue(request.current);
      request.current = null; uploaded.current = []; setAssets([]); setBody(''); setLocked(false); setFollowUp(false);
      await refreshReports();
      if (creating) navigation.replace('CleanupIssue', { issueId: saved.id });
      else await resource.refresh();
    } catch (failure) {
      setError(issueError(failure));
      if (/changed_refresh/.test(failure?.message || '')) { request.current = null; setLocked(false); await resource.refresh(); }
      else if (!request.current && uploaded.current.length === 0) setLocked(false);
    } finally { setBusy(false); }
  };
  const resume = async () => {
    if (busy || resource.error) return;
    setBusy(true); setError('');
    try {
      await resumeIssue(issue); await refreshReports();
      if (issue.keeps_claim) navigation.replace('CleanupSubmission', { cleanupId: issue.cleanup_attempt_id });
      else navigation.navigate('App', { screen: 'Map', params: { reportId: issue.report_id } });
    } catch (failure) { setError(issueError(failure)); await resource.refresh(); }
    finally { setBusy(false); }
  };
  if (!data && !resource.error) return <LoadingBee label="Loading cleanup issue" />;
  if (!data) return <LoadFailure title="Cleanup issue unavailable" onRetry={resource.refresh} />;
  const latest = data.messages?.at(-1);
  const canCompose = creating || (actions.canReply && (!actions.canResume || followUp));
  const renderMessage = row => <View key={row.id} style={[s.message, row.author_id === issue.reporter_id && { backgroundColor: colors.reportSoft }]}>
    <View><Text style={s.author}>{row.author_id === userId ? 'You' : data.names[row.author_id] || 'Former member'}</Text><Text style={s.time}>{new Date(row.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</Text></View>
    <Text style={s.text}>{row.body}</Text>
    {!!row.photo_paths?.length && <View style={s.photos}>{row.photo_paths.map(path => <IssuePhoto key={path} uri={data.photos[path]} label="Private cleanup message photo" />)}</View>}
  </View>;
  return <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={95}>
    <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <PrivateView style={{ gap: 20 }}>
        {!creating && <View style={[s.tag, issue.status === 'resolved' && { backgroundColor: '#b9e9dd' }]}><Text style={s.link}>{issueStatus(issue, userId)}</Text></View>}
        <View style={{ gap: 8 }}>
          <Text style={s.title} accessibilityRole="header">{creating ? 'Report an issue' : ISSUE_REASONS.find(([key]) => key === issue.reason)?.[1] || 'Cleanup issue'}</Text>
          <Text style={s.subtitle}>{report.title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.muted} accessible={false} />
            <Text style={[s.time, { flex: 1, lineHeight: 18 }]}>Private · Cleaner, reporter & Litterbugs</Text>
          </View>
        </View>
        {resource.error && <LoadFailure title="Couldn’t refresh updates" onRetry={resource.refresh} />}
        {creating ? <View style={{ gap: 8 }}>
          <View accessibilityRole="radiogroup" accessibilityLabel="Issue reason">{ISSUE_REASONS.map(([key, label]) => <TouchableOpacity key={key} style={s.choice} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: reason === key, disabled: locked }} disabled={locked} onPress={() => { setReason(key); setKeepsClaim(!isTeamIssue(key)); }}><Ionicons name={reason === key ? 'radio-button-on' : 'radio-button-off'} size={23} color={colors.reportInk} /><Text style={[s.text, { flex: 1 }]}>{label}</Text></TouchableOpacity>)}</View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Cleanup claim"><TouchableOpacity disabled={locked} onPress={() => setKeepsClaim(true)} style={s.choice} accessibilityRole="radio" accessibilityLabel="Keep my cleanup" accessibilityState={{ checked: keepsClaim }}><Ionicons name={keepsClaim ? 'radio-button-on' : 'radio-button-off'} size={23} color={colors.reportInk} /><Text style={s.text}>Keep my cleanup</Text></TouchableOpacity><TouchableOpacity disabled={locked} onPress={() => setKeepsClaim(false)} style={s.choice} accessibilityRole="radio" accessibilityLabel="Give cleanup back" accessibilityState={{ checked: !keepsClaim }}><Ionicons name={!keepsClaim ? 'radio-button-on' : 'radio-button-off'} size={23} color={colors.reportInk} /><Text style={s.text}>Give cleanup back</Text></TouchableOpacity></View>
          <Text style={s.time}>{isTeamIssue(reason) ? 'Litterbugs review required.' : keepsClaim ? 'Your cleanup clock pauses until this is resolved.' : 'The site stays paused until this is resolved.'}</Text>
        </View> : <>
          {latest && renderMessage(latest)}
          {data.messages.length > 1 && <><TextLink align="start" label={`${earlierOpen ? 'Hide' : 'Earlier'} messages (${data.messages.length - 1})`} onPress={() => setEarlierOpen(value => !value)} />{earlierOpen && data.messages.slice(0, -1).map(renderMessage)}</>}
          {Number(report.content_revision) > 1 && <View style={{ gap: 8 }}><Text style={s.label}>Public report updated</Text><Text style={s.text}>{report.notes_other}</Text>{!!report.additional_information && <><Text style={s.label}>Additional information</Text><Text style={s.text}>{report.additional_information}</Text></>}<View style={s.photos}>{report.photo_paths.map(path => <IssuePhoto key={path} uri={data.reportPhotoUrls[path]} label="Updated public report photo" />)}</View></View>}
          {actions.canEdit && <SecondaryButton label="Edit public report" disabled={busy} onPress={() => navigation.navigate('ReportContentEdit', { reportId: issue.report_id })} />}
        </>}
        {canCompose && <View style={s.field}>
          <Text style={s.label}>{creating ? 'Details' : 'Reply'}</Text>
          <TextInput accessibilityLabel={creating ? 'Issue details' : 'Reply'} multiline value={body} onChangeText={setBody} editable={!locked} maxLength={2000} style={s.input} />
          <TextLink align="start" label="Add photo" disabled={locked || assets.length >= 3} onPress={addPhotos} />
          {!!assets.length && <View style={s.photos}>{assets.map((asset, index) => <TouchableOpacity key={`${asset.uri}-${index}`} disabled={locked} accessibilityRole="button" accessibilityLabel={`Remove attached photo ${index + 1}`} onPress={() => setAssets(value => value.filter((_, i) => i !== index))}><Image source={{ uri: asset.uri }} style={s.photo} /><Text style={s.time}>Remove</Text></TouchableOpacity>)}</View>}
          <PrimaryButton label={creating ? 'Send issue' : 'Send reply'} busy={busy} disabled={!body.trim() || !!resource.error} onPress={send} />
          {followUp && <TextLink label="Cancel" disabled={busy} onPress={() => setFollowUp(false)} />}
        </View>}
        {!creating && actions.canResume && !followUp && <View style={{ gap: 10 }}><PrimaryButton label={issue.keeps_claim ? 'Resume cleanup' : 'Confirm update'} busy={busy} disabled={!!resource.error} onPress={resume} /><SecondaryButton label="Still an issue" disabled={busy} onPress={() => setFollowUp(true)} /></View>}
        {!creating && issue.requires_team_review && issue.status !== 'resolved' && <Text style={s.time}>Litterbugs is reviewing this site. The cleanup stays paused.</Text>}
        <ErrorText>{error}</ErrorText>
      </PrivateView>
    </ScrollView>
  </KeyboardAvoidingView>;
}
