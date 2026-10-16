import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Text from '../components/AppText';
import Mascot from '../components/Mascot';
import Wordmark from '../components/Wordmark';
import AuthAnimatedScreen from '../components/auth/AuthAnimatedScreen';
import AuthButton from '../components/auth/AuthButton';
import { authColors, authType, centeredColumn, contentWidth, authFonts } from '../theme/authTheme';

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <AuthAnimatedScreen>
        {/* flexGrow lets the mascot area stretch to fill a tall screen, while
            the scroll view lets a short screen scroll instead of squashing
            the mascot into the headline. */}
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <Wordmark style={styles.wordmark} />

          <View style={styles.mascotArea}>
            {/* No rise-in: coming from the splash it would read as a delay. */}
            <Mascot variant="greeting" px={200} animate={false} />
          </View>

          <Text style={styles.headline}>Learn Java at your own pace</Text>
          <Text style={styles.body}>Ten minutes a day is enough. Start with one lesson today.</Text>

          <AuthButton label="Sign up" onPress={() => navigation.navigate('Signup')} />

          <Pressable
            onPress={() => navigation.navigate('Login')}
            hitSlop={6}
            style={({ pressed }) => [styles.footer, pressed && styles.footerPressed]}
          >
            <Text style={styles.footerText}>
              ALREADY HAVE AN ACCOUNT? <Text style={styles.footerAccent}>LOG IN</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </AuthAnimatedScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.bg,
  },
  content: {
    ...centeredColumn(contentWidth.form),
    flexGrow: 1,
    paddingHorizontal: 24,
    // Only the wordmark, mascot, and footer are centered per the design —
    // the headline, body and button are a left-aligned, full-width block, so
    // this wrapper keeps the default stretch alignment.
  },
  wordmark: {
    textAlign: 'center',
    marginTop: 8,
  },
  mascotArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
  },
  headline: {
    ...authType.welcomeHeadline,
    color: authColors.ink,
    marginBottom: 12,
  },
  body: {
    ...authType.welcomeBody,
    color: authColors.ink2,
    maxWidth: 300,
    marginBottom: 26,
  },
  footer: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerPressed: {
    opacity: 0.6,
  },
  footerText: {
    fontFamily: authFonts.semiBold,
    fontSize: 12,
    letterSpacing: 12 * 0.08,
    textTransform: 'uppercase',
    color: authColors.muted,
  },
  footerAccent: {
    color: authColors.accentDeep,
  },
});
