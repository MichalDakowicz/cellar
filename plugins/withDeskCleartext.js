/**
 * Lets the release build talk plain HTTP — to the paired pc on the LAN.
 *
 * Android blocks cleartext traffic in release builds by default (the debug
 * manifest turns it back on, which is why this works in development and fails
 * silently in the APK). The pc's LAN server has no certificate a phone could
 * trust, so the app's requests to it are http://<lan address>; without this
 * flag every one of them dies before leaving the phone, and the pc screen reads
 * "not answering" while the pc is listening fine.
 *
 * App-wide, because a network security config cannot name an IP range. The
 * only cleartext the app sends is to the host in its saved pairing.
 */
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withDeskCleartext(config) {
  return withAndroidManifest(config, (mod) => {
    const application = mod.modResults.manifest.application?.[0];
    if (application) application.$['android:usesCleartextTraffic'] = 'true';
    return mod;
  });
};
