// Solana Betting Module
// Handles real Solana transactions for betting
// Requires @solana/web3.js to be loaded via CDN

class SolanaBetting {
    constructor(walletManager) {
        this.walletManager = walletManager;
        this.houseWallet = null; // House wallet public key - SET THIS TO YOUR HOUSE WALLET
        this.minBet = 0.01; // Minimum bet in SOL
        this.maxBet = 10; // Maximum bet in SOL
    }

    // Initialize with house wallet address
    init(houseWalletAddress) {
        if (!houseWalletAddress) {
            console.error('House wallet address required');
            return false;
        }
        try {
            if (!this.walletManager.PublicKey) {
                console.error('Solana Web3.js not loaded');
                return false;
            }
            this.houseWallet = new this.walletManager.PublicKey(houseWalletAddress);
            return true;
        } catch (error) {
            console.error('Invalid house wallet address:', error);
            return false;
        }
    }

    // Place bet - send SOL to house wallet
    async placeBet(betAmount, selectedColors) {
        if (!this.walletManager.isConnected || !this.walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (!this.houseWallet) {
            throw new Error('House wallet not configured');
        }

        if (!this.walletManager.solanaWeb3) {
            throw new Error('Solana Web3.js not loaded');
        }

        const { Transaction, SystemProgram } = this.walletManager.solanaWeb3;
        const totalBet = betAmount * selectedColors.length;

        // Validate bet amount
        if (totalBet < this.minBet) {
            throw new Error(`Minimum bet is ${this.minBet} SOL`);
        }
        if (totalBet > this.maxBet) {
            throw new Error(`Maximum bet is ${this.maxBet} SOL`);
        }

        // Check balance
        const balance = this.walletManager.getBalance();
        if (totalBet > balance) {
            throw new Error('Insufficient SOL balance');
        }

        try {
            // Create transaction
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.walletManager.publicKey,
                    toPubkey: this.houseWallet,
                    lamports: Math.floor(totalBet * 1e9) // Convert SOL to lamports
                })
            );

            // Get recent blockhash
            const { blockhash } = await this.walletManager.connection.getLatestBlockhash();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = this.walletManager.publicKey;

            // Use Phantom's sendTransaction method instead of manual serialization
            // This avoids Buffer issues as Phantom handles serialization internally
            const signature = await this.walletManager.wallet.sendTransaction(transaction, this.walletManager.connection);

            // Wait for confirmation
            await this.walletManager.connection.confirmTransaction(signature, 'confirmed');

            // Update balance
            await this.walletManager.updateBalance();

            return {
                success: true,
                signature,
                totalBet
            };
        } catch (error) {
            console.error('Error placing bet:', error);
            if (error.code === 4001) {
                throw new Error('Transaction rejected by user');
            }
            throw error;
        }
    }

    // Payout winnings - handled by backend API
    // In production, this should call your backend API to process the payout
    async payoutWinnings(winAmount, diceResults, selectedColors, betAmount, gameMode = 'normal') {
        if (!this.walletManager.isConnected || !this.walletManager.publicKey) {
            throw new Error('Wallet not connected');
        }

        if (winAmount <= 0) {
            return { success: true, signature: null }; // No payout needed
        }

        try {
            // Call backend API to process payout
            // The backend will verify the results and send the payout transaction
            const response = await fetch('/api/payout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    publicKey: this.walletManager.getPublicKey(),
                    winAmount,
                    diceResults,
                    selectedColors,
                    betAmount,
                    gameMode
                })
            });

            if (!response.ok) {
                throw new Error('Payout failed');
            }

            const data = await response.json();
            
            // Update balance after payout
            await this.walletManager.updateBalance();

            return {
                success: true,
                signature: data.signature,
                winAmount
            };
        } catch (error) {
            console.error('Error processing payout:', error);
            throw error;
        }
    }

    // Validate bet amount
    validateBetAmount(betAmount, selectedColors) {
        const totalBet = betAmount * selectedColors.length;
        
        if (totalBet < this.minBet) {
            return { valid: false, error: `Minimum bet is ${this.minBet} SOL` };
        }
        if (totalBet > this.maxBet) {
            return { valid: false, error: `Maximum bet is ${this.maxBet} SOL` };
        }
        
        const balance = this.walletManager.getBalance();
        if (totalBet > balance) {
            return { valid: false, error: 'Insufficient SOL balance' };
        }

        return { valid: true };
    }
}

// Create global betting instance
window.solanaBetting = null; // Will be initialized when wallet connects

