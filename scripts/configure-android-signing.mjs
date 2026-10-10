import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const buildGradlePath = path.join(rootDir, 'android', 'app', 'build.gradle');

if (!fs.existsSync(buildGradlePath)) {
  console.log('[CI Signing] android/app/build.gradle not found, skipping.');
  process.exit(0);
}

let content = fs.readFileSync(buildGradlePath, 'utf8');
const runNumber = process.env.RUN_NUMBER || '1';

// Update version code and version name
content = content.replace(/versionCode \d+/, `versionCode ${runNumber}`);
content = content.replace(/versionName "[^"]+"/, `versionName "1.${runNumber}"`);

// Add signingConfigs if not present
const signingBlock = `    signingConfigs {
        release {
            storeFile file("../../signing/release.keystore")
            storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
            keyAlias System.getenv("ANDROID_KEY_ALIAS")
            keyPassword System.getenv("ANDROID_KEY_PASSWORD")
        }
    }
`;

if (!content.includes('signingConfigs {')) {
  content = content.replace('buildTypes {', `${signingBlock}\n    buildTypes {`);
}

// Attach signingConfig to release build type if not present
if (!content.includes('signingConfig signingConfigs.release')) {
  content = content.replace('minifyEnabled false', 'signingConfig signingConfigs.release\n            minifyEnabled false');
}

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log(`[CI Signing] Successfully configured Android release signing (Build #${runNumber}).`);
