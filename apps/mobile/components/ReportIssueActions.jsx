import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Text, View } from 'react-native';
import { canEditReportContent, issueStatus, loadReportIssue } from '../lib/cleanupIssues';
import useFocusedResource from '../lib/useFocusedResource';
import { SecondaryButton, TextLink } from './ui';
import { IssueNotice, IssueUtility } from './CleanupIssueUI';
import { colors } from '../lib/theme';

export default function ReportIssueActions({ report, attempt, userId, visible, onIssue, onEdit, onRelease, utilityOnly = false }) {
  const canLookup = Boolean(userId);
  const knownParticipant = Boolean(userId && (report?.user_id === userId || attempt?.cleaner_id === userId));
  const resource = useFocusedResource(useCallback(() => loadReportIssue(report?.id), [report?.id, userId]), { enabled: visible && canLookup });
  const [optionsOpen, setOptionsOpen] = useState(false);
  useEffect(() => { setOptionsOpen(false); }, [report?.id]);
  // Poll only the visible participant view, so replies remain discoverable even
  // while the same report stays open. No private data is loaded for bystanders.
  useFocusEffect(useCallback(() => {
    if (!visible || !canLookup) return undefined;
    const timer = setInterval(resource.refresh, 15000);
    return () => clearInterval(timer);
  }, [visible, canLookup, resource.refresh]));
  const issue = resource.data;
  const participant = knownParticipant || Boolean(issue && [issue.reporter_id, issue.cleaner_id].includes(userId));
  const canRequest = attempt?.status === 'claimed' && attempt?.cleaner_id === userId && report?.user_id !== userId && !report?.cleanup_issue_hold && !attempt?.issue_paused_at;
  const canEdit = canEditReportContent(report, userId);
  if (!visible) return null;
  if (!participant) return report?.cleanup_issue_hold && !utilityOnly ? <Text style={{ color: colors.reportInk, marginVertical: 12 }}>Update requested</Text> : null;
  return <View style={{ gap: 12, marginVertical: 12 }}>
    {resource.error ? <TextLink label="Retry cleanup updates" align="start" onPress={resource.refresh} /> : issue && !utilityOnly ? <IssueNotice label={issueStatus(issue, userId)} resolved={issue.status === 'resolved'} onPress={() => onIssue({ issueId: issue.id })} /> : null}
    {!utilityOnly && canEdit && (report?.funding_locked_at || report?.cleanup_state === 'claimed' || report?.cleanup_issue_hold) && <SecondaryButton label="Edit report" onPress={onEdit} />}
    {canRequest && !resource.error && <><IssueUtility onPress={() => setOptionsOpen(value => !value)} expanded={optionsOpen} />{optionsOpen && <View style={{ gap: 6 }}><TextLink label="Report an issue" align="start" onPress={() => { setOptionsOpen(false); onIssue({ cleanupId: attempt.id }); }} />{onRelease && <TextLink label="Give cleanup back" align="start" onPress={onRelease} />}</View>}</>}
  </View>;
}
