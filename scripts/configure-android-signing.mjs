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

const storePassword = process.env.ANDROID_KEYSTORE_PASSWORD || 'VdV_Key_2026_Secure';
const keyAlias = process.env.ANDROID_KEY_ALIAS || 'upload';
const keyPassword = process.env.ANDROID_KEY_PASSWORD || storePassword;

// Update version code and version name
content = content.replace(/versionCode \d+/, `versionCode ${runNumber}`);
content = content.replace(/versionName "[^"]+"/, `versionName "1.${runNumber}"`);

// Remove any existing signingConfigs block to prevent duplicate definitions
content = content.replace(/signingConfigs\s*\{[\s\S]*?\}\s*\}\s*/g, '');
content = content.replace(/signingConfig\s+signingConfigs\.release\s*/g, '');

// Clean signing block with explicit rootDir path and credentials
const signingBlock = `    signingConfigs {
        release {
            storeFile file("\${rootDir}/../signing/release.keystore")
            storePassword "${storePassword}"
            keyAlias "${keyAlias}"
            keyPassword "${keyPassword}"
        }
    }
`;

content = content.replace('buildTypes {', `${signingBlock}\n    buildTypes {`);
content = content.replace(/buildTypes\s*\{\s*release\s*\{/, 'buildTypes {\n        release {\n            signingConfig signingConfigs.release');

fs.writeFileSync(buildGradlePath, content, 'utf8');
console.log(`[CI Signing] Successfully configured Android release signing (Build #${runNumber}, Alias: ${keyAlias}).`);
