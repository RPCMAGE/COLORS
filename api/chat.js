// Chat API - Self-contained module for site-wide chat
// Stores messages in-memory (stateless serverless function)

const messages = new Map();
if (!global.chatMessages) {
    global.chatMessages = messages;
}

// Keep only last 100 messages
const MAX_MESSAGES = 100;

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storage = global.chatMessages || messages;

    try {
        if (req.method === 'POST') {
            // Send message
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { username, message } = body;

            if (!username || !message || typeof username !== 'string' || typeof message !== 'string') {
                return res.status(400).json({ error: 'Username and message required' });
            }

            if (username.trim().length === 0 || message.trim().length === 0) {
                return res.status(400).json({ error: 'Username and message cannot be empty' });
            }

            if (username.length > 20) {
                return res.status(400).json({ error: 'Username too long (max 20 characters)' });
            }

            if (message.length > 500) {
                return res.status(400).json({ error: 'Message too long (max 500 characters)' });
            }

            const chatMessage = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                username: username.trim(),
                message: message.trim(),
                timestamp: Date.now()
            };

            // Add to storage
            const messageArray = Array.from(storage.values());
            messageArray.push(chatMessage);

            // Keep only last MAX_MESSAGES
            if (messageArray.length > MAX_MESSAGES) {
                messageArray.shift();
            }

            // Clear and repopulate
            storage.clear();
            messageArray.forEach(msg => {
                storage.set(msg.id, msg);
            });

            return res.status(200).json({ success: true, message: chatMessage });
        } else if (req.method === 'GET') {
            // Get messages
            const since = req.query.since ? parseInt(req.query.since) : 0;
            const messageArray = Array.from(storage.values())
                .filter(msg => msg.timestamp > since)
                .sort((a, b) => a.timestamp - b.timestamp);

            return res.status(200).json({ messages: messageArray });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Chat API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

