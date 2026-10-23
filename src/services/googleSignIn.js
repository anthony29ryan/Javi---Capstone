import { isRunningInExpoGo } from 'expo';

// Google sign-in is native code that Expo Go does not contain, so the library
// is only loaded in a development or release build. In Expo Go the Google
// buttons hide and everything else keeps working.
const GoogleSignin = isRunningInExpoGo()
  ? null
  : require('@react-native-google-signin/google-signin').GoogleSignin;

// The web client ID is what makes Google hand back an ID token Firebase
// accepts. It is a public identifier, not a secret.
GoogleSignin?.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID });

export const googleAvailable = GoogleSignin !== null;

/**
 * Opens Google's account picker. Returns { idToken, givenName, familyName },
 * or null when the user backs out of the picker.
 */
export async function pickGoogleAccount() {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') return null;
  const { idToken, user } = response.data;
  return { idToken, givenName: user.givenName, familyName: user.familyName };
}

/** Forgets the picked account, so the next tap shows the picker again. */
export function forgetGoogleAccount() {
  return GoogleSignin?.signOut().catch(() => {});
}
