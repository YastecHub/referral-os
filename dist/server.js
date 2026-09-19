const path = require('path');
const fs = require('fs');

// Resolve the real backend server entrypoint across different execution directories
const candidates = [
  path.resolve(__dirname, '..', 'referral-os-backend', 'dist', 'server.js'),
  path.resolve(__dirname, 'referral-os-backend', 'dist', 'server.js'),
  path.resolve(process.cwd(), 'referral-os-backend', 'dist', 'server.js')
];

let target = candidates.find((candidatePath) => fs.existsSync(candidatePath));

if (!target) {
  console.error('[Forwarder] Current working directory:', process.cwd());
  console.error('[Forwarder] Searched candidate paths:', candidates);
  throw new Error('referral-os-backend/dist/server.js not found. Please ensure the build step ran successfully.');
}

// Switch working directory to referral-os-backend so .env and relative imports resolve cleanly
const backendDir = path.dirname(path.dirname(target));
try {
  process.chdir(backendDir);
} catch (err) {
  console.warn('[Forwarder] Could not chdir to backend directory:', err.message);
}

require(target);
