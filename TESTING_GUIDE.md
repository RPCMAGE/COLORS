# Testing with Devnet (Test SOL) Guide

## Quick Setup for Testing

### Step 1: Set Environment Variable in Vercel

1. Go to your Vercel project → Settings → Environment Variables
2. Find `SOLANA_NETWORK` variable
3. Change the value from `mainnet-beta` to:
   ```
   devnet
   ```
4. Save and redeploy

**OR** if you haven't added it yet:
- Key: `SOLANA_NETWORK`
- Value: `devnet`
- Sensitive: OFF
- Environments: All Environments

### Step 2: Get Test SOL for Your House Wallet

Your house wallet address: `CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy`

**Option 1: Solana Faucet (Recommended)**
1. Go to: https://faucet.solana.com/
2. Enter your wallet address: `CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy`
3. Select **Devnet** (not Mainnet!)
4. Click "Airdrop 2 SOL"
5. You can request multiple times if needed

**Option 2: SolFaucet**
1. Go to: https://solfaucet.com/
2. Select **Devnet**
3. Enter your wallet address
4. Request test SOL

**Option 3: Command Line (if you have Solana CLI)**
```bash
solana airdrop 2 CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy --url devnet
```

### Step 3: Get Test SOL for Your Player Wallet

1. Connect your Phantom wallet to the site
2. Make sure Phantom is set to **Devnet**:
   - Open Phantom wallet
   - Go to Settings → Developer Mode
   - Enable "Testnet Mode" or switch network to Devnet
3. Get test SOL for your player wallet:
   - Go to https://faucet.solana.com/
   - Enter your player wallet address (from Phantom)
   - Select **Devnet**
   - Request airdrop

### Step 4: Test the Flow

1. **Deploy your code** (if you haven't already)
2. **Open your site** in browser
3. **Switch to Solana mode** (top left)
4. **Connect Phantom wallet** (make sure it's on Devnet!)
5. **Place a small test bet** (e.g., 0.01 SOL)
6. **Roll the dice**
7. **Check if payout works**

### Step 5: Verify Transactions

Check your transactions on Solana Explorer:
- **Devnet Explorer**: https://explorer.solana.com/?cluster=devnet
- Search for your wallet address: `CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy`
- You should see:
  - Bet transactions (SOL going TO your house wallet)
  - Payout transactions (SOL going FROM your house wallet to players)

## Important Notes

⚠️ **Devnet vs Mainnet:**
- **Devnet**: Free test SOL, no real money, for testing only
- **Mainnet**: Real SOL, real money, for production

⚠️ **Phantom Wallet Settings:**
- Make sure Phantom is on **Devnet** when testing
- Settings → Developer Mode → Testnet Mode ON
- Or switch network manually to Devnet

⚠️ **Environment Variables:**
- `SOLANA_NETWORK=devnet` for testing
- `SOLANA_NETWORK=mainnet-beta` for production
- **Always redeploy after changing environment variables!**

## Switching Back to Mainnet

When you're ready for production:

1. Change `SOLANA_NETWORK` to `mainnet-beta` in Vercel
2. Update `wallet.js` line 40: change `'devnet'` to `'mainnet-beta'`
3. Make sure your house wallet has **real SOL** (not test SOL)
4. Redeploy

## Troubleshooting

**"Insufficient balance" error:**
- Make sure you got test SOL from the faucet
- Check that you're on devnet (not mainnet)
- Verify balance on Solana Explorer

**"Wallet not connecting":**
- Make sure Phantom is installed
- Check that Phantom is on Devnet network
- Try refreshing the page

**"Transaction failed":**
- Check that both wallets have test SOL
- Verify network settings match (all devnet)
- Check browser console for errors

## Quick Checklist

- [ ] Set `SOLANA_NETWORK=devnet` in Vercel
- [ ] Get test SOL for house wallet (`CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy`)
- [ ] Set Phantom to Devnet
- [ ] Get test SOL for player wallet
- [ ] Deploy code
- [ ] Test a small bet
- [ ] Verify transactions on explorer

