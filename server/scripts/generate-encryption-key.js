const crypto = require('crypto');

const key = crypto.randomBytes(32).toString('hex');
const fingerprint = crypto
  .createHash('sha256')
  .update(key, 'utf8')
  .digest('hex')
  .slice(0, 12);

console.log('ENCRYPTION_KEY=' + key);
console.log('FINGERPRINT=' + fingerprint);
