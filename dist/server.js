const path = require('path');
const backendDir = path.resolve(__dirname, 'referral-os-backend');

try {
  process.chdir(backendDir);
} catch (e) {
  console.warn('Could not chdir to referral-os-backend:', e.message);
}

require(path.join(backendDir, 'dist', 'server.js'));
