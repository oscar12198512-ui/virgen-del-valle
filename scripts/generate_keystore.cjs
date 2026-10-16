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

const crypto = require('crypto');

const alias = (process.env.ANDROID_KEY_ALIAS || 'upload').trim();
// Exigir contraseña por variable de entorno o generar una criptográficamente segura al vuelo
const password = (process.env.ANDROID_KEYSTORE_PASSWORD || crypto.randomBytes(24).toString('base64url')).trim();

const dname = 'CN=VirgenDelValle, OU=Mobile, O=VirgenDelValle, L=Caracas, ST=Miranda, C=VE';
const cmd = `keytool -genkeypair -v -keystore "${keystorePath}" -alias "${alias}" -keyalg RSA -keysize 2048 -validity 10000 -storepass "${password}" -keypass "${password}" -dname "${dname}"`;

console.log('Generating secure Android release keystore...');
execSync(cmd, { stdio: 'inherit' });

const keystoreBuffer = fs.readFileSync(keystorePath);
const base64Content = keystoreBuffer.toString('base64');

fs.writeFileSync(path.join(signingDir, 'keystore_base64.txt'), base64Content, 'utf8');

// Eliminar cualquier archivo legado de secretos en texto claro
const legacySecretsFile = path.join(signingDir, 'secrets_info.txt');
if (fs.existsSync(legacySecretsFile)) {
  fs.unlinkSync(legacySecretsFile);
}

console.log('\n--- KEYSTORE GENERATED SUCCESSFULLY (SECURE) ---');
console.log(`Keystore file: ${keystorePath}`);
console.log(`Alias: ${alias}`);
console.log(`Base64 length: ${base64Content.length} chars`);
console.log('Base64 saved to signing/keystore_base64.txt');
console.log('\n[SECURITY ACTION REQUIRED]');
console.log('1. Set GitHub Secret ANDROID_KEYSTORE_BASE64 with the contents of signing/keystore_base64.txt');
console.log('2. Set GitHub Secret ANDROID_KEYSTORE_PASSWORD with the password provided/generated');
console.log(`3. Set GitHub Secret ANDROID_KEY_ALIAS with: ${alias}`);
console.log('\nNEVER commit keystore files or cleartext passwords into git repositories.');
