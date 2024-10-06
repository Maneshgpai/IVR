const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', function connection(ws) {
  console.log('Client connected');

  // Send a welcome message when a client connects
  ws.send('Welcome to the API Call Simulator!');

  // Listen for messages from the client
  ws.on('message', function incoming(message) {
    console.log('Received from client: %s', message);

    // Simulate a response from the API
    const apiResponse = `Simulated API Response for: ${message}`;
    ws.send(apiResponse);
  });

  // Simulate periodic messages like keeping the line open
  setInterval(() => {
    ws.send("API is still on the line, waiting for your next input...");
  }, 5000); // Sends a message every 5 seconds

  ws.on('close', function () {
    console.log('Client disconnected');
  });
});

