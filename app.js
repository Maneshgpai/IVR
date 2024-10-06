const WebSocket = require('ws');
const vad = require('node-vad');
const mic = require('mic');
const speech = require('@google-cloud/speech');
const readline = require('readline');

// Initialize Google Cloud Speech-to-Text client
const speechClient = new speech.SpeechClient();

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
    headers: {
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
        "OpenAI-Beta": "realtime=v1",
    },
});

ws.on("open", function open() {
    console.log("Connected to OpenAI server.");
    ws.send(JSON.stringify({
        type: "response.create",
        response: {
            modalities: ["text"],
            instructions: "You are an AI assistant in a phone conversation. Respond concisely as if speaking.",
        }
    }));
});

ws.on("message", function incoming(message) {
    const response = JSON.parse(message.toString());
    if (response.content) {
        console.log(`AI: ${response.content}`);
    }
});

// Initialize VAD
const vadInstance = new vad(vad.Mode.NORMAL);

// Initialize variables for recording
let recording = false;
let audioBuffer = [];

// Initialize microphone
const micInstance = mic({
    rate: '16000',
    channels: '1',
    encoding: 'signed-integer',
    bitwidth: 16,
    debug: false,
    exitOnSilence: 6
});

const micInputStream = micInstance.getAudioStream();

micInputStream.on('data', (data) => {
    if (recording) {
        // Perform VAD
        vadInstance.processAudio(data, 16000).then((result) => {
            if (result === vad.Event.VOICE) {
                audioBuffer.push(data);
            } else if (result === vad.Event.SILENCE && audioBuffer.length > 0) {
                // Stop recording if silence is detected after voice
                toggleRecording();
            }
        });
    }
});

micInputStream.on('error', (err) => {
    console.log("Error in Input Stream: " + err);
});

// Function to start/stop recording
function toggleRecording() {
    if (!recording) {
        console.log("Recording started. Speak now...");
        recording = true;
        audioBuffer = [];
        micInstance.start();
    } else {
        console.log("Recording stopped. Processing...");
        recording = false;
        micInstance.stop();

        // Process recorded audio
        const audioData = Buffer.concat(audioBuffer);

        // Perform speech-to-text
        const request = {
            audio: {
                content: audioData.toString('base64'),
            },
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
        };

        speechClient.recognize(request)
            .then(([response]) => {
                const transcription = response.results
                    .map(result => result.alternatives[0].transcript)
                    .join('\n');
                console.log(`You: ${transcription}`);

                // Send transcription to OpenAI
                ws.send(JSON.stringify({
                    type: "message.create",
                    message: {
                        content: transcription,
                        role: "user"
                    }
                }));
            })
            .catch((err) => {
                console.error('ERROR:', err);
            });
    }
}

// Set up readline interface for button press simulation
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("Press Enter to start/stop recording...");

rl.on('line', (input) => {
    toggleRecording();
});

// Handle cleanup
process.on('SIGINT', () => {
    micInstance.stop();
    ws.close();
    rl.close();
    process.exit();
});
