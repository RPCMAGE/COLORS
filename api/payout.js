// Payout API - Processes Solana payouts from house wallet to players
// Verifies game results and sends SOL transactions

// Payout multipliers (must match main.js)
const payouts = {
    normal: {
        1: 1.04,   // Per-match multiplier for 5% house edge
        '3jackpot': 4.5  // Jackpot multiplier (all 3 dice same color)
    },
    timeattack: {
        1: 1.08,   // Per-match multiplier for 3% house edge
        '3jackpot': 5.0  // Jackpot multiplier (all 3 dice same color)
    }
};

// Calculate expected payout (replicates frontend logic)
function calculateExpectedPayout(diceResults, selectedColors, betAmount, gameMode) {
    const results = [...diceResults];
    let totalWin = 0;
    let allSame = results[0] === results[1] && results[1] === results[2];

    selectedColors.forEach(color => {
        const colorMatches = results.filter(r => r === color).length;
        if (colorMatches > 0) {
            let win = betAmount; // Start with the bet amount
            
            const isJackpot = colorMatches === 3 && allSame && results[0] === color;
            
            if (isJackpot) {
                // Jackpot: bet + (bet * jackpot multiplier)
                win += betAmount * payouts[gameMode]['3jackpot'];
            } else {
                // For each matching die, add the winnings
                const profitMultiplierPerMatch = payouts[gameMode][1];
                win += betAmount * profitMultiplierPerMatch * colorMatches;
            }
            
            totalWin += win;
        }
    });

    return totalWin;
}

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { publicKey, winAmount, diceResults, selectedColors, betAmount, gameMode = 'normal' } = body;

        // Validate input
        if (!publicKey || typeof publicKey !== 'string') {
            return res.status(400).json({ error: 'Public key required' });
        }

        if (typeof winAmount !== 'number' || winAmount <= 0) {
            return res.status(400).json({ error: 'Valid win amount required' });
        }

        if (!Array.isArray(diceResults) || diceResults.length !== 3) {
            return res.status(400).json({ error: 'Invalid dice results' });
        }

        if (!Array.isArray(selectedColors) || selectedColors.length === 0) {
            return res.status(400).json({ error: 'Selected colors required' });
        }

        if (typeof betAmount !== 'number' || betAmount <= 0) {
            return res.status(400).json({ error: 'Valid bet amount required' });
        }

        // Validate colors
        const validColors = ['yellow', 'orange', 'pink', 'blue', 'green', 'red'];
        if (!diceResults.every(c => validColors.includes(c))) {
            return res.status(400).json({ error: 'Invalid dice result colors' });
        }

        if (!selectedColors.every(c => validColors.includes(c))) {
            return res.status(400).json({ error: 'Invalid selected colors' });
        }

        // Verify payout calculation
        const expectedWin = calculateExpectedPayout(diceResults, selectedColors, betAmount, gameMode);
        const tolerance = 0.0001; // Allow small floating point differences

        if (Math.abs(expectedWin - winAmount) > tolerance) {
            console.error('Payout mismatch:', { expectedWin, winAmount, diceResults, selectedColors, betAmount, gameMode });
            return res.status(400).json({ error: 'Payout calculation mismatch' });
        }

        // Get house wallet private key from environment variable
        const housePrivateKey = process.env.HOUSE_WALLET_PRIVATE_KEY;
        if (!housePrivateKey) {
            console.error('House wallet private key not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        // Import Solana Web3.js
        // In Vercel, we use the npm package (installed via package.json)
        let Connection, Keypair, PublicKey, Transaction, SystemProgram;
        try {
            const solana = await import('@solana/web3.js');
            Connection = solana.Connection;
            Keypair = solana.Keypair;
            PublicKey = solana.PublicKey;
            Transaction = solana.Transaction;
            SystemProgram = solana.SystemProgram;
        } catch (importError) {
            console.error('Failed to load Solana Web3.js:', importError);
            return res.status(500).json({ 
                error: 'Failed to load Solana library',
                message: 'Make sure @solana/web3.js is installed. Run: npm install @solana/web3.js'
            });
        }

        // Parse house wallet private key
        let houseKeypair;
        try {
            // Private key can be in different formats:
            // 1. Base58 string
            // 2. Array of numbers (JSON string)
            // 3. Comma-separated string
            let privateKeyArray;
            if (housePrivateKey.startsWith('[')) {
                privateKeyArray = JSON.parse(housePrivateKey);
            } else if (housePrivateKey.includes(',')) {
                privateKeyArray = housePrivateKey.split(',').map(n => parseInt(n));
            } else {
                // Try base58 decode
                const bs58 = await import('bs58').catch(() => null);
                if (bs58) {
                    privateKeyArray = Array.from(bs58.default.decode(housePrivateKey));
                } else {
                    // Fallback: assume it's a JSON array string
                    privateKeyArray = JSON.parse(housePrivateKey);
                }
            }
            houseKeypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
        } catch (keyError) {
            // Log error without exposing private key
            console.error('Error parsing house wallet key:', keyError.message || 'Invalid format');
            return res.status(500).json({ error: 'Invalid house wallet configuration' });
        }

        // Connect to Solana network
        // Default to devnet for testing, use mainnet-beta for production
        const network = process.env.SOLANA_NETWORK || 'devnet';
        const connection = new Connection(
            network === 'mainnet-beta'
                ? 'https://api.mainnet-beta.solana.com'
                : 'https://api.devnet.solana.com',
            'confirmed'
        );

        // Verify house wallet has sufficient balance
        const houseBalance = await connection.getBalance(houseKeypair.publicKey);
        const payoutLamports = Math.floor(winAmount * 1e9); // Convert SOL to lamports
        const minBalance = payoutLamports + 5000; // Add buffer for transaction fee

        if (houseBalance < minBalance) {
            console.error('Insufficient house balance:', {
                houseBalance: houseBalance / 1e9,
                required: minBalance / 1e9,
                payout: winAmount
            });
            return res.status(500).json({ error: 'Insufficient house balance' });
        }

        // Create payout transaction
        const playerPublicKey = new PublicKey(publicKey);
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: houseKeypair.publicKey,
                toPubkey: playerPublicKey,
                lamports: payoutLamports
            })
        );

        // Get recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = houseKeypair.publicKey;

        // Sign transaction
        transaction.sign(houseKeypair);

        // Send transaction
        const signature = await connection.sendRawTransaction(transaction.serialize());

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        // Return success with transaction signature
        return res.status(200).json({
            success: true,
            signature,
            winAmount,
            message: 'Payout successful'
        });

    } catch (error) {
        console.error('Payout API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

