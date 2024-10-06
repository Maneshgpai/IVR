const WebSocket = require('ws');

// Connect to the local WebSocket server
const ws = new WebSocket('ws://localhost:8080');

// Open WebSocket connection
ws.on('open', function open() {
  console.log('Connected to the WebSocket server');
  
  // Simulate sending messages like in a phone conversation
  setTimeout(() => {
    ws.send('Hello, this is client 1 speaking.');
  }, 2000);

  setTimeout(() => {
    ws.send('I have another question.');
  }, 7000);
});

// Listen for messages from the server
ws.on('message', function incoming(data) {
  console.log('Server response: %s', data);
});

// Handle disconnection
ws.on('close', function close() {
  console.log('Disconnected from the WebSocket server');
});

