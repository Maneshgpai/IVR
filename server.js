const WebSocket = require('ws');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const wss = new WebSocket.Server({ port: 8080 });

// Converts ArrayBuffer to base64-encoded string
function arrayBufferToBase64(buffer) {
    return Buffer.from(buffer).toString('base64');
}

wss.on('connection', function connection(ws) {
    console.log('Client connected');

    let openaiWs = null;

    // Connect to OpenAI WebSocket
    const openaiUrl = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openaiWs = new WebSocket(openaiUrl, {
        headers: {
            "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
            "OpenAI-Beta": "realtime=v1",
        },
    });

    openaiWs.on("open", function open() {
        console.log("Connected to OpenAI server.");
        openaiWs.send(JSON.stringify({
            type: "response.create",
            response: {
                modalities: ["audio"],
                instructions: "Please assist the user.",
                input_audio_transcription: {
                    "enabled": true,
                    "model": "whisper-1"
                },
                temperature: 0
            }
        }));
    });

    openaiWs.on("message", function incoming(message) {
        const parsedMessage = JSON.parse(message.toString());
        console.log("Received from OpenAI:", parsedMessage.type);
        if (parsedMessage.type === 'response.audio.delta' && parsedMessage.delta) {
            ws.send(JSON.stringify({ 
                type: 'audio_delta', 
                data: parsedMessage.delta,
                eventId: parsedMessage.event_id,
                responseId: parsedMessage.response_id,
                itemId: parsedMessage.item_id,
                outputIndex: parsedMessage.output_index,
                contentIndex: parsedMessage.content_index
            }));
        } else if (parsedMessage.type === 'response.end') {
            ws.send(JSON.stringify({ type: 'audio_end' }));
        }
    });

    ws.on('message', function incoming(message) {
        if (message instanceof Buffer) {
            // Process audio data (already in PCM16 format from client)
            const base64Audio = arrayBufferToBase64(message);

            // Send audio chunk to OpenAI
            openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: base64Audio
            }));
        } else if (message === 'END_OF_AUDIO') {
            console.log('Received end of audio signal');
            openaiWs.send(JSON.stringify({type: 'input_audio_buffer.commit'}));
        } else {
            console.log('Received message:', message);
        }
    });

    ws.on('close', function () {
        console.log('Client disconnected');
        if (openaiWs) {
            openaiWs.close();
        }
    });
});

console.log('WebSocket server is running on port 8080');
