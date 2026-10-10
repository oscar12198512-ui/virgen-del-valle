const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const signingDir = path.join(rootDir, 'signing');
if (!fs.existsSync(signingDir)) {
  fs.mkdirSync(signingDir, { recursive: true });
}

const keystorePath = path.join(signingDir, 'release.keystore');
if (fs.existsSync(keystorePath)) {
  fs.unlinkSync(keystorePath);
}

const alias = 'upload';
const password = 'VdV_Key_2026_Secure';

const dname = 'CN=VirgenDelValle, OU=Mobile, O=VirgenDelValle, L=Caracas, ST=Miranda, C=VE';
const cmd = `keytool -genkeypair -v -keystore "${keystorePath}" -alias "${alias}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${password}" -keypass "${password}" -dname "${dname}"`;

console.log('Generating keystore...');
execSync(cmd, { stdio: 'inherit' });

const keystoreBuffer = fs.readFileSync(keystorePath);
const base64Content = keystoreBuffer.toString('base64');

fs.writeFileSync(path.join(signingDir, 'keystore_base64.txt'), base64Content, 'utf8');

const info = `ANDROID_KEY_ALIAS: ${alias}\nANDROID_KEYSTORE_PASSWORD: ${password}\nANDROID_KEY_PASSWORD: ${password}\n`;
fs.writeFileSync(path.join(signingDir, 'secrets_info.txt'), info, 'utf8');

console.log('\n--- KEYSTORE GENERATED SUCCESSFULLY ---');
console.log(`Keystore file: ${keystorePath}`);
console.log(`Alias: ${alias}`);
console.log(`Password: ${password}`);
console.log(`Base64 length: ${base64Content.length} chars`);
console.log('Base64 saved to signing/keystore_base64.txt');
