import { strToU8, zipSync } from "fflate";

type Kit = { name: string; slug: string; url: string; bundleId: string; version: string };

export function buildCapacitorKit(k: Kit): Uint8Array {
  const pkg = {
    name: k.slug,
    version: k.version,
    private: true,
    scripts: {
      "cap:sync": "npx cap sync",
      "android:add": "npx cap add android",
      "ios:add": "npx cap add ios",
      "android:apk": "cd android && ./gradlew assembleRelease",
    },
    dependencies: {
      "@capacitor/core": "^7.0.0",
      "@capacitor/android": "^7.0.0",
      "@capacitor/ios": "^7.0.0",
      "@capacitor/app": "^7.0.0",
      "@capacitor/browser": "^7.0.0",
      "@capacitor/haptics": "^7.0.0",
      "@capacitor/keyboard": "^7.0.0",
      "@capacitor/network": "^7.0.0",
      "@capacitor/preferences": "^7.0.0",
      "@capacitor/push-notifications": "^7.0.0",
      "@capacitor/share": "^7.0.0",
      "@capacitor/splash-screen": "^7.0.0",
      "@capacitor/status-bar": "^7.0.0",
    },
    devDependencies: { "@capacitor/cli": "^7.0.0", "@capacitor/assets": "^3.0.0" },
  };
  const config = {
    appId: k.bundleId,
    appName: k.name,
    webDir: "www",
    server: { url: k.url, cleartext: false, allowNavigation: [new URL(k.url || "https://example.com").hostname] },
    ios: { contentInset: "always", scheme: k.name.replace(/[^A-Za-z0-9]/g, "") || "App" },
    android: { allowMixedContent: false },
    plugins: {
      SplashScreen: { launchShowDuration: 1200, backgroundColor: "#0b0b0d", showSpinner: false },
      StatusBar: { style: "DARK", backgroundColor: "#0b0b0d" },
      Keyboard: { resize: "body" },
      PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
    },
  };
  const index = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${k.name}</title></head><body style="background:#0b0b0d"><script>location.replace(${JSON.stringify(k.url)})</script></body></html>`;

  const workflow = `name: Build ${k.name}
on: { workflow_dispatch: {}, push: { branches: [main] } }
jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: 21 }
      - run: npm install
      - run: npx cap add android && npx capacitor-assets generate --android || true
      - run: npx cap sync android
      - run: cd android && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with: { name: ${k.slug}-android, path: android/app/build/outputs/apk/**/*.apk }
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm install
      - run: npx cap add ios && npx capacitor-assets generate --ios || true
      - run: npx cap sync ios
      # Signing: add secrets IOS_CERT_P12 (base64), IOS_CERT_PASSWORD, IOS_PROFILE (base64 .mobileprovision)
      - uses: apple-actions/import-codesign-certs@v3
        with: { p12-file-base64: \${{ secrets.IOS_CERT_P12 }}, p12-password: \${{ secrets.IOS_CERT_PASSWORD }} }
      - run: |
          mkdir -p ~/Library/MobileDevice/Provisioning\\ Profiles
          echo "\${{ secrets.IOS_PROFILE }}" | base64 --decode > ~/Library/MobileDevice/Provisioning\\ Profiles/app.mobileprovision
      - run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App -configuration Release -archivePath build/App.xcarchive archive
          xcodebuild -exportArchive -archivePath build/App.xcarchive -exportPath build/ipa -exportOptionsPlist ../../ExportOptions.plist
      - uses: actions/upload-artifact@v4
        with: { name: ${k.slug}-ios, path: ios/App/build/ipa/*.ipa }
`;
  const exportOptions = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>method</key><string>ad-hoc</string><key>compileBitcode</key><false/></dict></plist>`;
  const readme = `# ${k.name} — native build kit (Spoiled Store)

Wraps ${k.url} as a native Android (.apk) and iPhone (.ipa) app with Capacitor.
Bundle ID: ${k.bundleId}

Automatic: push this folder to a GitHub repo — the included workflow builds both files.
Download them from the Actions run, then upload them to the app in Spoiled Store admin and press Publish.

Local:
  npm install
  npx cap add android && npx cap add ios
  npx cap sync
  Android: npx cap open android (Build > Build APK)
  iOS (Mac + Xcode): npx cap open ios (Product > Archive)

Put a 1024x1024 icon at assets/icon.png and a 2732x2732 splash at assets/splash.png,
then run: npx capacitor-assets generate

iPhone installs outside the App Store require an ad-hoc or enterprise signed .ipa.
`;
  return zipSync({
    [`${k.slug}/package.json`]: strToU8(JSON.stringify(pkg, null, 2)),
    [`${k.slug}/capacitor.config.json`]: strToU8(JSON.stringify(config, null, 2)),
    [`${k.slug}/www/index.html`]: strToU8(index),
    [`${k.slug}/ExportOptions.plist`]: strToU8(exportOptions),
    [`${k.slug}/.github/workflows/build.yml`]: strToU8(workflow),
    [`${k.slug}/README.md`]: strToU8(readme),
  });
}
