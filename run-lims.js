const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Star LIMS services in detached background mode...');

// 1. Backend
const bOut = fs.openSync('C:\\Star LIMS\\backend.log', 'w');
const bErr = fs.openSync('C:\\Star LIMS\\backend.err', 'w');
const backend = spawn('node', ['dist/src/server.js'], {
  cwd: 'C:\\Star LIMS\\backend',
  detached: true,
  stdio: ['ignore', bOut, bErr]
});
backend.unref();
console.log('Backend spawned with PID:', backend.pid);

// 2. Frontend Next.js
const fOut = fs.openSync('C:\\Star LIMS\\frontend.log', 'w');
const fErr = fs.openSync('C:\\Star LIMS\\frontend.err', 'w');
const frontend = spawn('cmd.exe', ['/c', 'npm.cmd', 'run', 'dev'], {
  cwd: 'C:\\Star LIMS\\frontend',
  detached: true,
  stdio: ['ignore', fOut, fErr]
});
frontend.unref();
console.log('Frontend spawned with PID:', frontend.pid);

console.log('Processes successfully detached and unreferenced.');

