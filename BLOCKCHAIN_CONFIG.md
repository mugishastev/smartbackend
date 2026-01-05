# Blockchain Configuration Guide

## Current Status

The blockchain integration is **implemented** but **not fully configured** for production use.

## Implementation Status

✅ **Completed:**
- Blockchain service (`src/services/blockchain.service.ts`) is implemented
- Uses ethers.js v6.15.0 for Ethereum blockchain interaction
- Integrated with transaction service for logging transaction hashes
- Integrated with approval service for logging approvals
- Integrated with report service for logging reports
- Database schema includes `blockchainHash` field in Transaction model
- Simulation mode works when blockchain is not configured

## Configuration Required

To enable blockchain integration, you need to set the following environment variables in your `.env` file:

```env
# Blockchain Configuration
BLOCKCHAIN_ENABLED=true
BLOCKCHAIN_RPC_URL=https://your-ethereum-rpc-url
BLOCKCHAIN_PRIVATE_KEY=your-private-key-without-0x-prefix
BLOCKCHAIN_CONTRACT_ADDRESS=0xYourSmartContractAddress
```

### Environment Variables Explained

1. **BLOCKCHAIN_ENABLED**: Set to `true` to enable blockchain integration
2. **BLOCKCHAIN_RPC_URL**: Your Ethereum RPC endpoint (e.g., Infura, Alchemy, or local node)
   - Example: `https://mainnet.infura.io/v3/YOUR_PROJECT_ID`
   - Or testnet: `https://sepolia.infura.io/v3/YOUR_PROJECT_ID`
3. **BLOCKCHAIN_PRIVATE_KEY**: Private key of the wallet that will sign transactions
   - **⚠️ WARNING**: Never commit this to version control!
   - Should be a wallet with ETH for gas fees
4. **BLOCKCHAIN_CONTRACT_ADDRESS**: Address of your deployed smart contract
   - The contract should have these functions:
     - `logTransaction(bytes32 hash) external returns (uint256)`
     - `verifyTransaction(bytes32 hash) external view returns (bool, uint256, address)`

## Current Mode

**Simulation Mode** (Default):
- When blockchain is not configured, the system runs in simulation mode
- Transaction hashes are still generated (SHA-256)
- Blockchain logging is simulated with mock block numbers and transaction hashes
- This allows development and testing without a real blockchain connection

## API Endpoints

New endpoints have been created to check blockchain status:

1. **GET /api/blockchain/status** - Get blockchain configuration and status
   - Shows if blockchain is enabled/configured
   - Shows network information (if configured)
   - Shows statistics (total transactions, blockchain transactions)
   - Shows configuration status

2. **GET /api/blockchain/verify/:hash** - Verify a transaction hash on blockchain

3. **GET /api/blockchain/network** - Get blockchain network information

## How It Works

1. **Transaction Creation**: When a transaction is created, a blockchain hash is generated
2. **Hash Generation**: Uses SHA-256 to create a tamper-proof hash of transaction data
3. **Blockchain Logging**: If configured, the hash is logged to the smart contract
4. **Verification**: Hashes can be verified on the blockchain for transparency

## Testing

To test blockchain integration:

1. Set up environment variables
2. Deploy a smart contract with the required functions
3. Fund the wallet with ETH for gas fees
4. Create a transaction and check if it gets logged to blockchain
5. Use `/api/blockchain/status` to verify configuration

## Security Notes

- ⚠️ **Never commit private keys to version control**
- ⚠️ **Use environment variables for all sensitive data**
- ⚠️ **Use a dedicated wallet for blockchain operations**
- ⚠️ **Keep private keys secure and backed up**

