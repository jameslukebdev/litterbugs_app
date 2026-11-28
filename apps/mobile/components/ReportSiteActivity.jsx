import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BrandBug from './BrandBug';
import PrivateView from './PrivateView';
import { loadReportSite, sitePhotoUrl, siteTimeline } from '../lib/reportSites';
import { colors, fonts } from '../lib/theme';
const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
function CleanupEvidence({ report }) {
  const [open, setOpen] = useState(false);
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={s.evidenceToggle}>
      <Text style={s.eventText}>{`Cleaned up${report.cleanerName ? ` by ${report.cleanerName}` : ''}`}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} color={colors.muted} size={16} />
    </TouchableOpacity>
    {open ? <View style={s.evidence}>
      <View style={s.photos}>{[['Before', report.beforePhotoUrl], ['After', report.afterPhotoUrl]].map(([label, path]) => sitePhotoUrl(path) ? <View style={s.photo} key={label}><Image source={{ uri: sitePhotoUrl(path) }} style={s.image} accessibilityLabel={`${label} cleanup on ${date(report.completionDate)}`} /><Text style={s.photoLabel}>{label}</Text></View> : null)}</View>
      {report.cleanupDescription ? <Text style={s.description}>{report.cleanupDescription}</Text> : null}
      <Text style={s.meta}>{[report.bagsOrItemsRemoved != null ? `${report.bagsOrItemsRemoved} bags/items` : null, report.weightPounds != null ? `${report.weightPounds} lb` : null, report.cleanupMinutes != null ? `${report.cleanupMinutes} min` : null].filter(Boolean).join(' · ')}</Text>
    </View> : null}
  </>;
}
function Round({ report, initialOpen, selected, onOpenReport }) {
  const [open, setOpen] = useState(initialOpen);
  const status = report.state === 'completed' ? 'Cleaned' : report.state === 'expired' ? 'Expired' : 'Current report';
  return <View style={s.round}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`${date(report.reportDate)}, reported by ${report.reporterName || 'Community member'}, ${status}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)} style={s.roundToggle}>
      <View style={s.roundCopy}><Text style={s.roundDate}>{date(report.reportDate)}</Text><Text style={s.meta}>Reported by {report.reporterName || 'Community member'}</Text></View>
      <Text style={[s.badge, report.state !== 'completed' && s.current]}>{status}</Text><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
    </TouchableOpacity>
    {open ? <View style={s.events}>{siteTimeline(report).map((event, index) => <View style={s.event} key={`${event.at}-${index}`}><View style={s.dot} /><Text style={s.meta}>{date(event.at)}</Text>{event.cleanup ? <CleanupEvidence report={report} /> : <Text style={s.eventText}>{event.label}</Text>}</View>)}
      {!selected ? <TouchableOpacity style={s.reportLink} accessibilityRole="button" onPress={() => onOpenReport(report.id)}><Text style={s.link}>View report</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></TouchableOpacity> : null}
    </View> : null}
  </View>;
}
export default function ReportSiteActivity({ report, visible, blockedIds = [], onReportAgain, onOpenReport }) {
  const [resource, setResource] = useState({ id: null, site: null, failed: false });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!visible || !report?.id) return undefined;
    let active = true; let controller;
    const refresh = async () => {
      controller?.abort(); controller = new AbortController();
      const current = controller; const timer = setTimeout(() => current.abort(), 15000);
      try { const site = await loadReportSite(report.id, current.signal); if (active && current === controller) setResource({ id: report.id, site, failed: false }); }
      catch { if (active && current === controller) setResource(previous => ({ id: report.id, site: previous.id === report.id ? previous.site : null, failed: true })); }
      finally { clearTimeout(timer); }
    };
    void refresh();
    const interval = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { active = false; controller?.abort(); clearInterval(interval); subscription.remove(); };
  }, [visible, report?.id, report?.cleanup_state, revision]);
  if (!visible) return null;
  if (resource.id !== report?.id) return <ActivityIndicator style={s.loading} accessibilityLabel="Loading Timeline" color={colors.reportInk} />;
  const site = resource.site;
  const rounds = site?.reports.filter(row => !blockedIds.includes(row.reporterId)) ?? [];
  const latest = site?.reports.at(-1)?.id;
  const source = rounds.filter(row => row.state === 'completed').at(-1);
  const current = site?.reports.find(row => row.id === site.currentReportId);
  return <PrivateView style={s.root}>
    {resource.failed ? <View style={s.retry}><Text style={s.meta}>Timeline could not be refreshed.</Text><TouchableOpacity accessibilityRole="button" onPress={() => setRevision(value => value + 1)} style={s.retryButton}><Text style={s.link}>Try again</Text></TouchableOpacity></View> : null}
    {site?.canReportAgain && source?.location && !resource.failed ? <TouchableOpacity accessibilityRole="button" style={s.again} onPress={() => onReportAgain(source)}><BrandBug kind="dragonfly" size={26} /><Text style={s.againText}>Needs cleaning again</Text></TouchableOpacity> : null}
    {current && current.id !== report.id && !blockedIds.includes(current.reporterId) ? <TouchableOpacity style={s.latest} accessibilityRole="button" onPress={() => onOpenReport(current.id)}><Text style={s.link}>View latest report</Text><Ionicons name="arrow-forward" color={colors.primary} size={18} /></TouchableOpacity> : null}
    {rounds.length ? <View style={s.timeline}><View style={s.heading}><Text accessibilityRole="header" style={s.title}>Timeline</Text><Text style={s.meta}>{rounds.filter(row => row.state === 'completed').length} {rounds.filter(row => row.state === 'completed').length === 1 ? 'cleanup' : 'cleanups'}</Text></View>{rounds.map(row => <Round key={row.id} report={row} initialOpen={row.id === report.id || row.id === latest} selected={row.id === report.id} onOpenReport={onOpenReport} />)}</View> : null}
  </PrivateView>;
}
const s = StyleSheet.create({
  root: { marginTop: 18 }, loading: { marginVertical: 16 },
  again: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, minHeight: 48, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.reportEdge, borderRadius: 16, backgroundColor: colors.reportSoft },
  againText: { color: colors.reportInk, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  latest: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeline: { marginTop: 24 }, heading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 14 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: colors.ink }, meta: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  round: { borderTopWidth: 1, borderTopColor: colors.line }, roundToggle: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 76, paddingVertical: 14 },
  roundCopy: { flex: 1 }, roundDate: { fontSize: 14, fontWeight: '700', color: colors.ink, marginBottom: 4 },
  badge: { borderWidth: 1, borderColor: '#8ED7C5', backgroundColor: '#B9E9DD', color: '#25483E', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, maxWidth: 110 }, current: { backgroundColor: colors.redSoft, borderColor: '#F4C8CC', color: colors.red },
  events: { marginLeft: 5, paddingLeft: 20, borderLeftWidth: 2, borderLeftColor: '#E3EEE9', marginBottom: 18, gap: 14 },
  event: { gap: 5 }, dot: { position: 'absolute', top: 5, left: -27, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#8ED7C5', backgroundColor: colors.white },
  eventText: { color: colors.ink, fontSize: 15, lineHeight: 22, flexShrink: 1 }, evidenceToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7 },
  evidence: { gap: 10 }, photos: { flexDirection: 'row', gap: 8 }, photo: { flex: 1 }, image: { width: '100%', aspectRatio: 4 / 3, borderRadius: 10 }, photoLabel: { fontSize: 12, color: colors.body, marginTop: 5 }, description: { fontSize: 14, color: colors.body, lineHeight: 20 },
  reportLink: { minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center' }, link: { color: colors.primary, fontSize: 14, fontWeight: '700' }, retry: { gap: 4 }, retryButton: { minHeight: 44, justifyContent: 'center' },
});
