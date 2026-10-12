import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * app.json plus build-time values that must not be committed. The Google
 * Sign-In plugin needs the iOS URL scheme (the reversed iOS client id); when
 * GOOGLE_IOS_URL_SCHEME is unset the plugin is skipped.
 *
 * The button's visibility does NOT come from here: on iOS googleAvailable()
 * shows it only when EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID is set. So set
 * GOOGLE_IOS_URL_SCHEME in every EAS environment that sets
 * EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID (same client) — a build with the id but
 * without the scheme shows the button and crashes natively on tap.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const scheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = [...(config.plugins ?? [])];
  if (scheme) plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme: scheme }]);
  return { ...(config as ExpoConfig), plugins };
};
