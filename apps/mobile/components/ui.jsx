import { Ionicons } from '@expo/vector-icons';
import { RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import BrandBug from './BrandBug';
import SteadyButtonContent from './SteadyButtonContent';
import { hapticSelect, hapticTap } from '../lib/haptics';
import { colors, fonts } from '../lib/theme';

// Shared building blocks, matched to the website. Screens use these instead of
// styling their own buttons, links, empty states, errors and tabs.

// The purple action button. `busy` keeps the label in place and shows progress
// only when a request runs long (see SteadyButtonContent).
export function PrimaryButton({ label, onPress, busy = false, busyLabel, disabled = false, style, accessibilityLabel, accessibilityHint }) {
  const inactive = busy || disabled;
  return (
    <TouchableOpacity
      style={[styles.primaryButton, inactive && styles.inactive, style]}
      onPress={(event) => { hapticTap(); onPress?.(event); }}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy }}
    >
      <SteadyButtonContent label={label} busy={busy} busyLabel={busyLabel} />
    </TouchableOpacity>
  );
}

// The quieter second choice beside a PrimaryButton: white with a thin line.
export function SecondaryButton({ label, onPress, disabled = false, style, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, disabled && styles.inactive, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
    >
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// Words-only action: purple for links and retries, red for destructive choices.
export function TextLink({ label, onPress, tone = 'primary', disabled = false, align = 'center', style, accessibilityLabel }) {
  return (
    <TouchableOpacity
      style={[styles.textLink, align === 'start' && styles.textLinkStart, disabled && styles.inactive, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled }}
    >
      <Text style={[styles.textLinkLabel, tone === 'danger' && styles.textLinkDanger, tone === 'muted' && styles.textLinkMuted]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Inline error words in the theme red, announced to screen readers.
export function ErrorText({ children, style }) {
  if (!children) return null;
  return <Text accessibilityRole="alert" style={[styles.errorText, style]}>{children}</Text>;
}

// Website empty state: a bug (or a plain icon passed as `icon`) that labels the
// state, a heading, one line of help and at most one action.
export function EmptyState({ bug, icon = null, title, text, action = null, actionStyle = 'button', style }) {
  return (
    <View style={[styles.empty, style]}>
      {/* Website empty lists: the ladybug walks in and looks around; other bugs do their own move. */}
      {bug ? <BrandBug kind={bug} size={40} entrance={bug === 'ladybug' ? 'walk' : null} playOnMount /> : icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      {text ? <Text style={styles.emptyText}>{text}</Text> : null}
      {action ? (
        actionStyle === 'link'
          ? <TextLink label={action.label} onPress={action.onPress} style={styles.emptyLink} />
          : <PrimaryButton label={action.label} onPress={action.onPress} style={styles.emptyButton} />
      ) : null}
    </View>
  );
}

// Shown in place of content that failed to load: says what is missing and
// offers one retry. Failed actions (save, send, pay) use a system alert instead.
export function LoadFailure({ title = 'Couldn’t load this', text = 'Check your connection and try again.', onRetry, retryLabel = 'Try again', style }) {
  return (
    <EmptyState
      icon={<Ionicons name="cloud-offline-outline" size={32} color={colors.subtle} />}
      title={title}
      text={text}
      action={onRetry ? { label: retryLabel, onPress: onRetry } : null}
      actionStyle="link"
      style={style}
    />
  );
}

// Pull-to-refresh in the brand purple on both platforms. Pass it as a list's
// `refreshControl`; extra props (such as the scroll view's own) pass through.
export function PullRefresh({ refreshing, onRefresh, ...props }) {
  return <RefreshControl {...props} refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />;
}

// Outlined pill tabs: the selected one gets the purple line and darker words,
// never a tinted fill. `options` is a list of [value, label].
export function PillTabs({ options, value, onChange, stacked = false, fill = true, style }) {
  return (
    <View style={[styles.tabs, stacked && styles.tabsStacked, !fill && styles.tabsWrap, style]} accessibilityRole="tablist">
      {options.map(([optionValue, label]) => {
        const selected = optionValue === value;
        return (
          <TouchableOpacity
            key={optionValue}
            style={[styles.tab, fill && !stacked && styles.tabFill, selected && styles.tabSelected]}
            onPress={() => { if (!selected) hapticSelect(); onChange(optionValue); }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.tabText, selected && styles.tabTextSelected]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  primaryButton: { minHeight: 54, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.primary },
  secondaryButton: { minHeight: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineStrong, borderRadius: 14, backgroundColor: colors.white },
  secondaryButtonLabel: { color: colors.primary, fontSize: 15, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  inactive: { opacity: 0.6 },
  textLink: { minHeight: 44, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  textLinkStart: { alignItems: 'flex-start', paddingHorizontal: 0 },
  textLinkLabel: { color: colors.primary, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  textLinkDanger: { color: colors.red },
  textLinkMuted: { color: colors.body },
  errorText: { marginTop: 6, color: colors.red, fontSize: 14, lineHeight: 20 },
  empty: { minHeight: 210, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.white },
  emptyTitle: { marginTop: 12, color: colors.ink, fontSize: 18, lineHeight: 24, fontFamily: fonts.heading, textAlign: 'center' },
  emptyText: { maxWidth: 300, marginTop: 6, color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  emptyButton: { minHeight: 48, marginTop: 18, paddingHorizontal: 8, alignSelf: 'center', minWidth: 190 },
  emptyLink: { marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8 },
  tabsStacked: { flexDirection: 'column' },
  tabsWrap: { flexWrap: 'wrap' },
  tab: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.white },
  tabFill: { flex: 1, paddingHorizontal: 6 },
  tabSelected: { borderWidth: 2, borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  tabTextSelected: { color: colors.primaryDark },
});
