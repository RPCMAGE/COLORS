// Solana Wallet Integration Module
// Handles wallet connection and balance management
// Requires @solana/web3.js to be loaded via CDN

class WalletManager {
    constructor() {
        this.wallet = null;
        this.connection = null;
        this.publicKey = null;
        this.balance = 0;
        this.isConnected = false;
        this.listeners = [];
        this.solanaWeb3 = null;
    }

    // Wait for Solana Web3.js to load
    async waitForSolanaWeb3() {
        // Check if already loaded
        if (window.solanaWeb3) {
            this.solanaWeb3 = window.solanaWeb3;
            return true;
        }
        
        // Check if solanaWeb3 global exists (from IIFE)
        if (typeof solanaWeb3 !== 'undefined') {
            window.solanaWeb3 = solanaWeb3;
            this.solanaWeb3 = solanaWeb3;
            return true;
        }
        
        // Check if Solana is available as window.solana (browser bundle)
        if (typeof window.solana !== 'undefined' && window.solana.web3) {
            window.solanaWeb3 = window.solana.web3;
            this.solanaWeb3 = window.solana.web3;
            return true;
        }
        
        // Wait up to 5 seconds for it to load
        for (let i = 0; i < 50; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (window.solanaWeb3) {
                this.solanaWeb3 = window.solanaWeb3;
                return true;
            }
            if (typeof solanaWeb3 !== 'undefined') {
                window.solanaWeb3 = solanaWeb3;
                this.solanaWeb3 = solanaWeb3;
                return true;
            }
            if (typeof window.solana !== 'undefined' && window.solana.web3) {
                window.solanaWeb3 = window.solana.web3;
                this.solanaWeb3 = window.solana.web3;
                return true;
            }
        }
        return false;
    }

    // Initialize Solana connection
    async init() {
        try {
            // Wait for Solana Web3.js library
            const web3Loaded = await this.waitForSolanaWeb3();
            if (!web3Loaded) {
                console.error('Solana Web3.js library not loaded');
                return false;
            }

            const { Connection, PublicKey } = this.solanaWeb3;
            
            // Wait for wallet to be available (Phantom might inject itself asynchronously)
            let walletFound = false;
            for (let i = 0; i < 20; i++) {
                if (typeof window.solana !== 'undefined') {
                    // Check for Phantom
                    if (window.solana.isPhantom) {
                        this.wallet = window.solana;
                        walletFound = true;
                        break;
                    }
                    // Check for other Solana wallets
                    if (window.solana && typeof window.solana.connect === 'function') {
                        this.wallet = window.solana;
                        walletFound = true;
                        break;
                    }
                }
                if (!walletFound) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
            
            if (!walletFound) {
                console.warn('Solana wallet not found. Please install Phantom wallet.');
                return false;
            }
            
            if (this.wallet) {
                
                // Use devnet for testing, mainnet for production
                // Set via environment variable or default to devnet for testing
                const network = 'devnet'; // Change to 'mainnet-beta' for production
                this.connection = new Connection(
                    network === 'mainnet-beta' 
                        ? 'https://api.mainnet-beta.solana.com'
                        : 'https://api.devnet.solana.com',
                    'confirmed'
                );
                this.PublicKey = PublicKey;

                // Check if already connected
                if (this.wallet.isConnected) {
                    this.publicKey = new PublicKey(this.wallet.publicKey.toString());
                    await this.updateBalance();
                    this.isConnected = true;
                    this.notifyListeners();
                }

                // Listen for wallet disconnect
                this.wallet.on('disconnect', () => {
                    this.disconnect();
                });

                // Listen for account changes
                this.wallet.on('accountChanged', (publicKey) => {
                    if (publicKey) {
                        this.publicKey = new PublicKey(publicKey.toString());
                        this.updateBalance();
                    } else {
                        this.disconnect();
                    }
                });

                return true;
            } else {
                console.warn('Solana wallet not found. Please install Phantom wallet.');
                return false;
            }
        } catch (error) {
            console.error('Error initializing wallet:', error);
            return false;
        }
    }

    // Connect wallet
    async connect() {
        try {
            // First check if wallet is already available
            if (typeof window.solana !== 'undefined' && !this.wallet) {
                if (window.solana.isPhantom || typeof window.solana.connect === 'function') {
                    this.wallet = window.solana;
                }
            }
            
            // Ensure Solana Web3.js is loaded and PublicKey is available
            if (!this.solanaWeb3 || !this.PublicKey) {
                const web3Loaded = await this.waitForSolanaWeb3();
                if (!web3Loaded) {
                    throw new Error('Solana Web3.js library not loaded');
                }
                
                // Extract PublicKey from solanaWeb3
                const { PublicKey } = this.solanaWeb3;
                if (!PublicKey) {
                    throw new Error('PublicKey not available in Solana Web3.js');
                }
                this.PublicKey = PublicKey;
            }
            
            if (!this.wallet) {
                const initialized = await this.init();
                if (!initialized) {
                    // Try one more time to find wallet
                    if (typeof window.solana !== 'undefined') {
                        if (window.solana.isPhantom || typeof window.solana.connect === 'function') {
                            this.wallet = window.solana;
                            // Also set up connection if not already done
                            if (!this.connection) {
                                const { Connection } = this.solanaWeb3;
                                const network = 'devnet';
                                this.connection = new Connection(
                                    network === 'mainnet-beta' 
                                        ? 'https://api.mainnet-beta.solana.com'
                                        : 'https://api.devnet.solana.com',
                                    'confirmed'
                                );
                            }
                        } else {
                            throw new Error('Wallet not available. Please install Phantom wallet.');
                        }
                    } else {
                        throw new Error('Wallet not available. Please install Phantom wallet.');
                    }
                }
            }

            const response = await this.wallet.connect();
            this.publicKey = new this.PublicKey(response.publicKey.toString());
            await this.updateBalance();
            this.isConnected = true;
            this.notifyListeners();
            return true;
        } catch (error) {
            console.error('Error connecting wallet:', error);
            if (error.code === 4001) {
                throw new Error('User rejected connection request');
            }
            throw error;
        }
    }

    // Disconnect wallet
    disconnect() {
        if (this.wallet && this.wallet.isConnected) {
            this.wallet.disconnect();
        }
        this.publicKey = null;
        this.balance = 0;
        this.isConnected = false;
        this.notifyListeners();
    }

    // Update SOL balance
    async updateBalance() {
        if (!this.connection || !this.publicKey) {
            this.balance = 0;
            this.notifyListeners();
            return;
        }

        try {
            const balance = await this.connection.getBalance(this.publicKey);
            this.balance = balance / 1e9; // Convert lamports to SOL
            this.notifyListeners();
        } catch (error) {
            console.error('Error updating balance:', error);
            this.balance = 0;
            this.notifyListeners();
        }
    }

    // Get current balance in SOL
    getBalance() {
        return this.balance;
    }

    // Get public key as string
    getPublicKey() {
        return this.publicKey ? this.publicKey.toString() : null;
    }

    // Get shortened address for display
    getShortAddress() {
        if (!this.publicKey) return null;
        const address = this.publicKey.toString();
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    // Subscribe to wallet state changes
    onStateChange(callback) {
        this.listeners.push(callback);
        // Immediately call with current state
        callback({
            isConnected: this.isConnected,
            balance: this.balance,
            publicKey: this.getPublicKey(),
            shortAddress: this.getShortAddress()
        });
    }

    // Notify all listeners
    notifyListeners() {
        this.listeners.forEach(callback => {
            callback({
                isConnected: this.isConnected,
                balance: this.balance,
                publicKey: this.getPublicKey(),
                shortAddress: this.getShortAddress()
            });
        });
    }

    // Check if wallet is available
    isWalletAvailable() {
        return typeof window.solana !== 'undefined' && window.solana.isPhantom;
    }
}

// Create global wallet manager instance
window.walletManager = new WalletManager();

