import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

export default function BrandedLoadingState({
  title = 'Loading Litterbugs…',
  message = 'This should only take a moment.',
  compact = false,
  logoOnly = false,
  onLogoReady,
  working = false,
}) {
  const { width } = useWindowDimensions();
  const launchLogoWidth = Math.min(width - 64, 244);

  return (
    <View
      style={[styles.container, compact && styles.containerCompact]}
      accessibilityRole="progressbar"
      accessibilityLabel={logoOnly ? 'Loading Litterbugs' : `${title} ${message}`}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.card, compact && styles.cardCompact, logoOnly && styles.logoOnlyCard]}>
        <View
          style={[
            styles.logoStage,
            logoOnly && {
              width: launchLogoWidth,
              height: launchLogoWidth * (433 / 636),
            },
          ]}
        >
          <Image
            source={require('./assets/LB_Logo_PNG.png')}
            style={[styles.logo, logoOnly && styles.launchLogo]}
            resizeMode="contain"
            accessible={false}
            onLoad={logoOnly ? onLogoReady : undefined}
          />
        </View>
        {!logoOnly ? (
          <>
            {working ? (
              <ActivityIndicator style={styles.workingIndicator} size="small" color="#2F7D32" />
            ) : null}
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

export function LoadingButtonContent({ label, color = '#FFFFFF' }) {
  return (
    <View style={styles.buttonContent} accessibilityLabel={label}>
      <ActivityIndicator size="small" color={color} />
      <Text style={[styles.buttonLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  containerCompact: {
    minHeight: 280,
    paddingVertical: 28,
  },
  card: {
    width: '100%',
    maxWidth: 370,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderWidth: 1,
    borderColor: '#DCE8DD',
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  cardCompact: {
    paddingVertical: 22,
  },
  logoOnlyCard: {
    borderWidth: 0,
    backgroundColor: '#FFFFFF',
    shadowOpacity: 0,
    elevation: 0,
  },
  logoStage: {
    width: 120,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 112, height: 68 },
  launchLogo: { width: '100%', height: '100%' },
  workingIndicator: { marginTop: 12 },
  title: {
    marginTop: 12,
    color: '#202428',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    maxWidth: 310,
    marginTop: 7,
    color: '#667078',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonLabel: { fontSize: 15, fontWeight: '900' },
});
