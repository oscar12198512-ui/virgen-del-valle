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

// Copy keystore directly into android/app/ for zero-ambiguity relative path
const rootSigningKeystore = path.join(rootDir, 'signing', 'release.keystore');
const appKeystore = path.join(rootDir, 'android', 'app', 'release.keystore');

if (fs.existsSync(rootSigningKeystore)) {
  fs.copyFileSync(rootSigningKeystore, appKeystore);
  console.log('[CI Signing] Copied keystore to android/app/release.keystore');
}

let content = fs.readFileSync(buildGradlePath, 'utf8');
const runNumber = process.env.RUN_NUMBER || '1';

const storePassword = (process.env.ANDROID_KEYSTORE_PASSWORD || '').trim();
const keyAlias = (process.env.ANDROID_KEY_ALIAS || 'upload').trim();
const keyPassword = (process.env.ANDROID_KEY_PASSWORD || storePassword).trim();

if (!storePassword) {
  console.error('[CI Signing] ERROR: ANDROID_KEYSTORE_PASSWORD environment variable is not defined.');
  console.error('[CI Signing] In accordance with security standards, hardcoded password fallback has been eliminated.');
  console.error('[CI Signing] Please configure the secret in GitHub Actions Secrets or export it in your environment.');
  process.exit(1);
}

// Update version code and version name
content = content.replace(/versionCode \d+/, `versionCode ${runNumber}`);
content = content.replace(/versionName "[^"]+"/, `versionName "1.${runNumber}"`);

// Clean any old signingConfigs and signingConfig assignments
content = content.replace(/signingConfigs\s*\{[\s\S]*?\}\s*\}\s*/g, '');
content = content.replace(/signingConfig\s+signingConfigs\.release\s*/g, '');
content = content.replace(/lint\s*\{[\s\S]*?\}\s*/g, '');

// Clean signing and lint block
const signingBlock = `    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword "${storePassword}"
            keyAlias "${keyAlias}"
            keyPassword "${keyPassword}"
        }
    }

    lint {
        abortOnError false
        checkReleaseBuilds false
    }
`;

content = content.replace('buildTypes {', `${signingBlock}\n    buildTypes {`);
content = content.replace(/buildTypes\s*\{\s*release\s*\{/, 'buildTypes {\n        release {\n            signingConfig signingConfigs.release');

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log(`[CI Signing] Successfully configured Android release signing (Build #${runNumber}, Alias: ${keyAlias}).`);
