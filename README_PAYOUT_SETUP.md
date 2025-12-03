# Payout API Setup Guide

## Overview
The payout API (`/api/payout.js`) handles sending SOL winnings from the house wallet to players after a winning bet.

## Environment Variables Required

You need to set these environment variables in your Vercel project settings:

### 1. `HOUSE_WALLET_PRIVATE_KEY`
Your house wallet's private key. This is used to sign and send payout transactions.

**Format Options:**
- **Base58 string** (recommended): A base58-encoded private key
- **JSON array**: `[123,45,67,...]` (array of 64 numbers)
- **Comma-separated**: `123,45,67,...` (comma-separated numbers)

**How to get your private key:**
1. If using Phantom wallet, export the private key (Settings → Security & Privacy → Export Private Key)
2. Convert to the format needed (see below)

**Security Warning:** Never commit this to git! Always use environment variables.

### 2. `SOLANA_NETWORK` (Optional)
- `mainnet-beta` (default) - Production network
- `devnet` - Testing network

## Setting Up in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:
   - `HOUSE_WALLET_PRIVATE_KEY`: Your house wallet private key
   - `SOLANA_NETWORK`: `mainnet-beta` or `devnet` (optional, defaults to mainnet)

## Private Key Format Conversion

### From Phantom Wallet (Base58)
If you exported from Phantom, it's already in base58 format. Just paste it directly.

### From Array Format
If you have an array like `[123,45,67,...]`, you can:
- Use it as JSON string: `"[123,45,67,...]"`
- Or convert to base58 (recommended for security)

### Converting to Base58 (Recommended)
```javascript
// In Node.js or browser console
const bs58 = require('bs58'); // npm install bs58
const privateKeyArray = [123, 45, 67, ...]; // Your 64-number array
const base58Key = bs58.encode(Buffer.from(privateKeyArray));
console.log(base58Key); // Use this in environment variable
```

## Testing

### Test on Devnet First
1. Set `SOLANA_NETWORK=devnet` in Vercel
2. Use devnet SOL (get from faucet)
3. Test the payout flow
4. Once verified, switch to `mainnet-beta`

### Verify House Wallet Balance
Make sure your house wallet (`CLaREi6vTQPrPVBx2oJ7Lf3aLoZLeLnWTwPW9rv8NURy`) has sufficient SOL:
- For mainnet: Real SOL
- For devnet: Test SOL from faucet

## How It Works

1. **Player wins**: Frontend calculates winnings and calls `/api/payout`
2. **Verification**: Backend recalculates payout to verify it matches
3. **Transaction**: Backend creates and signs a Solana transaction
4. **Payout**: SOL is sent from house wallet to player wallet
5. **Confirmation**: Transaction signature is returned to frontend

## Security Notes

- ✅ Private key is stored in environment variables (never in code)
- ✅ Payout amounts are verified server-side
- ✅ Transactions are signed server-side
- ⚠️ Make sure your house wallet has sufficient balance
- ⚠️ Monitor for unusual payout requests
- ⚠️ Consider rate limiting for production

## Troubleshooting

### "House wallet private key not configured"
- Check that `HOUSE_WALLET_PRIVATE_KEY` is set in Vercel environment variables
- Redeploy after adding environment variables

### "Invalid house wallet configuration"
- Check private key format
- Ensure it's a valid 64-byte array or base58 string

### "Insufficient house balance"
- Add more SOL to your house wallet
- Check network (mainnet vs devnet)

### "Failed to load Solana library"
- The API will try to load from CDN first
- If that fails, it tries npm package
- Make sure `@solana/web3.js` is in package.json (already added)

## Next Steps

1. Set environment variables in Vercel
2. Deploy the updated code
3. Test with a small bet on devnet
4. Verify payout transaction on Solana explorer
5. Switch to mainnet when ready