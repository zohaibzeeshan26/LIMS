const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Starting Star LIMS services in detached background mode...');

const ROOT = __dirname;
const bOut = fs.openSync(path.join(ROOT, 'backend.log'), 'a');
const bErr = fs.openSync(path.join(ROOT, 'backend.err'), 'a');
const backend = spawn('cmd.exe', ['/c', 'run.bat'], {
  cwd: path.join(ROOT, 'backend'),
  detached: true,
  stdio: ['ignore', bOut, bErr]
});
backend.unref();
console.log('Backend spawned with PID:', backend.pid);

const fOut = fs.openSync(path.join(ROOT, 'frontend.log'), 'a');
const fErr = fs.openSync(path.join(ROOT, 'frontend.err'), 'a');
const frontend = spawn('cmd.exe', ['/c', 'run.bat'], {
  cwd: path.join(ROOT, 'frontend'),
  detached: true,
  stdio: ['ignore', fOut, fErr]
});
frontend.unref();
console.log('Frontend spawned with PID:', frontend.pid);

console.log('Processes successfully detached and unreferenced.');
