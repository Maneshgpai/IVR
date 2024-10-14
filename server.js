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
    let userTranscription = '';
    let botTranscription = '';

    try {
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

            try {
                // Send response.create event
                openaiWs.send(JSON.stringify({
                    type: "response.create",
                    response: {
                        modalities: ['audio', 'text'],
                        instructions: "Please assist the user.",
                        voice: "alloy",
                        temperature: 0,
                        max_output_tokens: 200
                    }
                }));
                console.log("Sent response.create event");
            } catch (error) {
                console.error("Error in openaiWs.on('open') handler:", error);
            }
        });

        openaiWs.on("message", function incoming(message) {
            try {
                const parsedMessage = JSON.parse(message.toString());
                console.log("Received from OpenAI:", parsedMessage.type);
                // Log the entire message for debugging
                console.log("Full message from OpenAI:", JSON.stringify(parsedMessage, null, 2));

                if (parsedMessage.type === 'response.audio.delta' && parsedMessage.delta) {
                    ws.send(JSON.stringify({ 
                        type: 'audio_delta', 
                        data: parsedMessage.delta
                    }));
                } else if (parsedMessage.type === 'response.audio_transcript.done') {
                    botTranscription = parsedMessage.transcript;
                    ws.send(JSON.stringify({ 
                        type: 'bot_transcript',
                        transcript: botTranscription
                    }));
                } else if (parsedMessage.type === 'response.end') {
                    ws.send(JSON.stringify({ 
                        type: 'audio_end',
                        userTranscription: userTranscription,
                        botTranscription: botTranscription
                    }));
                } else if (parsedMessage.type === 'conversation.item.transcription.completed') {
                    userTranscription = parsedMessage.transcription;
                    ws.send(JSON.stringify({
                        type: 'user_transcript',
                        transcript: userTranscription
                    }));

                    // Create a conversation item with the user's transcription
                    const conversationItem = {
                        type: "conversation.item.create",
                        item: {
                            id: "item_" + Date.now(),
                            role: "user",
                            content: [
                                {
                                    type: "text",
                                    text: userTranscription
                                }
                            ]
                        }
                    };

                    // Send the conversation item create event
                    openaiWs.send(JSON.stringify(conversationItem));

                    // Print the user input message to the console
                    console.log("User Input Message:", userTranscription);
                }
            } catch (error) {
                console.error("Error in openaiWs.on('message') handler:", error);
            }
        });

        openaiWs.on("error", function error(err) {
            console.error("OpenAI WebSocket error:", err);
        });

        openaiWs.on("close", function close(code, reason) {
            console.log("OpenAI WebSocket closed. Code:", code, "Reason:", reason);
        });

    } catch (error) {
        console.error("Error in main WebSocket connection handler:", error);
    }

    ws.on('message', function incoming(message) {
        try {
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
        } catch (error) {
            console.error("Error in ws.on('message') handler:", error);
        }
    });

    ws.on('close', function () {
        console.log('Client disconnected');
        if (openaiWs) {
            openaiWs.close();
        }
    });
});

wss.on('error', function error(err) {
    console.error("WebSocket server error:", err);
});

console.log('WebSocket server is running on port 8080');
