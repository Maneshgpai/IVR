# Real-time Audio Transcription with OpenAI API

This project implements a WebSocket server using Node.js that connects to OpenAI's real-time API for streaming audio transcription.

## Prerequisites

- Node.js (v14 or later recommended)
- npm (comes with Node.js)
- An OpenAI API key with access to the real-time API

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-username/IVR.git
   cd IVR
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the project root:
     ```
     touch .env
     ```
   - Open the `.env` file and add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_openai_api_key_here
     ```

## Running the Server

To start the WebSocket server:

```
node server.js
```

The server will start and listen on port 8080.

## Usage

The WebSocket server accepts streaming audio data from clients, sends it to OpenAI's real-time API for transcription, and returns the transcribed text to the client.

### Testing with the provided client

1. Start the server as described above.

2. Open the `client.html` file in a web browser. You can do this by running:
   ```
   open client.html
   ```

3. In the browser:
   - Click the "Start Recording" button and speak into your microphone.
   - You should see real-time transcription updates appear on the page.
   - Click "Stop Recording" when you're done speaking.

### Implementing your own client

To implement your own client:

1. Connect to the WebSocket server at `ws://localhost:8080`
2. Send audio data as binary messages (Float32Array)
3. Send a text message "END_OF_AUDIO" to signal the end of the audio stream
4. Receive transcription updates as JSON messages with the format:
   ```json
   { "type": "transcription", "data": "transcribed text here" }
   ```

## Note

This README provides basic setup and usage instructions. The current implementation uses the OpenAI real-time API, which may have specific access requirements or be in a preview state. Ensure you have the necessary permissions and are using the most up-to-date API endpoints and parameters.

Remember to keep your OpenAI API key secure and not to expose it in any public repositories or client-side code. Also, be aware of the usage and pricing associated with OpenAI's API to manage costs effectively.