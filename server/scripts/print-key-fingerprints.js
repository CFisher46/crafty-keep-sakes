const crypto = require('crypto');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function fingerprint(name, value) {
  const normalized = (value || '').trim();
  if (!normalized) {
    console.log(`${name}=<missing>`);
    return;
  }
  const output = crypto
    .createHash('sha256')
    .update(normalized, 'utf8')
    .digest('hex')
    .slice(0, 12);
  console.log(`${name} fingerprint=${output}`);
}

fingerprint('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
fingerprint('ENCRYPTION_KEY_PREVIOUS', process.env.ENCRYPTION_KEY_PREVIOUS);
