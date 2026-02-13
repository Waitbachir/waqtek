import WebSocket from 'ws';

const url = 'ws://localhost:5000';
console.log('Connecting to', url);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('OPEN');
  ws.send(JSON.stringify({ type: 'init', clientType: 'tester', establishmentId: null }));
});

ws.on('message', (data) => {
  console.log('MESSAGE:', data.toString());
});

ws.on('error', (err) => {
  console.error('ERROR:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('CLOSED', code, reason && reason.toString());
  process.exit(0);
});

// Timeout to force exit if no response
setTimeout(() => {
  console.log('Timeout, exiting');
  process.exit(2);
}, 5000);
