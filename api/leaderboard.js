// Leaderboard API - Self-contained module for tracking winnings
// Stores leaderboard data in-memory (stateless serverless function)

const leaderboard = new Map();
if (!global.leaderboardData) {
    global.leaderboardData = leaderboard;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const storage = global.leaderboardData || leaderboard;

    try {
        if (req.method === 'POST') {
            // Update winnings
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            const { username, winnings } = body;

            if (!username || typeof username !== 'string') {
                return res.status(400).json({ error: 'Username required' });
            }

            if (typeof winnings !== 'number' || isNaN(winnings)) {
                return res.status(400).json({ error: 'Valid winnings amount required' });
            }

            const usernameKey = username.trim().toLowerCase();
            const current = storage.get(usernameKey) || { username: username.trim(), totalWinnings: 0 };
            current.totalWinnings = Math.max(0, current.totalWinnings + winnings);
            storage.set(usernameKey, current);

            return res.status(200).json({ success: true, leaderboard: current });
        } else if (req.method === 'GET') {
            // Get leaderboard (top N)
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;
            const leaderboardArray = Array.from(storage.values())
                .sort((a, b) => b.totalWinnings - a.totalWinnings)
                .slice(0, limit);

            return res.status(200).json({ leaderboard: leaderboardArray });
        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Leaderboard API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

