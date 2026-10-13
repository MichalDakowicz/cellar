const { withAndroidManifest, withMainApplication, withDangerousMod, withAppBuildGradle } = require('expo/config-plugins');
const { mkdir, copyFile } = require('node:fs/promises');
const { join } = require('node:path');

module.exports = function withCellarPush(config) {
  config = withAppBuildGradle(config, (mod) => {
    const dependency = 'implementation("com.google.firebase:firebase-messaging:25.0.1")';
    if (!mod.modResults.contents.includes(dependency)) mod.modResults.contents = mod.modResults.contents.replace('dependencies {', `dependencies {\n    ${dependency}`);
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    const app = manifest.application[0];
    app.service = (app.service ?? []).filter((s) => !['expo.modules.notifications.service.ExpoFirebaseMessagingService', '.CellarPushService'].includes(s.$['android:name']));
    app.service.push({ $: { 'android:name': 'expo.modules.notifications.service.ExpoFirebaseMessagingService', 'tools:node': 'remove' } });
    app.service.push({ $: { 'android:name': '.CellarPushService', 'android:exported': 'false' },
      'intent-filter': [{ action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }] }] });
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes('add(CellarPushPackage())')) mod.modResults.contents = mod.modResults.contents.replace('PackageList(this).packages.apply {', 'PackageList(this).packages.apply {\n          add(CellarPushPackage())');
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const target = join(mod.modRequest.platformProjectRoot, 'app/src/main/java/com/michaldakowicz/cellar');
    await mkdir(target, { recursive: true });
    for (const file of ['CellarPushService.kt', 'CellarPushPackage.kt']) await copyFile(join(__dirname, 'push', file), join(target, file));
    return mod;
  }]);
};
