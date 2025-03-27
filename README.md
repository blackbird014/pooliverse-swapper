
# MiniDex - Minimalist Decentralized Exchange

A simple yet powerful Automated Market Maker (AMM) decentralized exchange built with Solidity and Foundry.

## Features

- Constant product AMM (x * y = k) similar to Uniswap V2
- Create liquidity pools for any ERC20 token pair
- Add and remove liquidity from pools
- Swap tokens with minimal slippage
- LP tokens to represent liquidity shares
- Factory contract to deploy multiple pools
- Support for multi-pool arbitrage

## Getting Started

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- [MetaMask](https://metamask.io/) or another web3 wallet

### Building and Running Contracts

```bash
# Build the contracts
forge build

# Run a local blockchain (in a separate terminal)
anvil

# Deploy the contracts to the local network
forge script script/DeployProtocol.s.sol --fork-url http://localhost:8545 --broadcast
```

### Testing

```bash
forge test -vv
```

## Frontend Application

The project includes a React-based frontend for interacting with the MiniDex protocol.

### Setting Up the Frontend

1. Install project dependencies:
```bash
npm install
```
This will install all required packages defined in package.json, including React, UI components, and development tools.

2. Start the development server:
```bash
npm run dev
```
This will start the Vite development server on http://localhost:8080 with hot module replacement and other development features enabled.

3. Access the application at `http://localhost:8080`

### Frontend Features

- Connect your Ethereum wallet
- Create new liquidity pools
- Add and remove liquidity
- Swap between tokens
- View pool statistics and your positions
- Real-time price updates

### Interacting with MiniDex via MetaMask

1. **Install MetaMask**: Download and set up the [MetaMask extension](https://metamask.io/) for your browser.

2. **Connect to a Local Network**:
   - Open MetaMask and click on the network dropdown at the top
   - Select "Add Network" or "Custom RPC"
   - Enter the following details:
     - Network Name: `Anvil Local`
     - RPC URL: `http://localhost:8545`
     - Chain ID: `31337`
     - Currency Symbol: `ETH`

3. **Import Test Accounts**:
   - When you run Anvil, it creates 10 test accounts with 10000 ETH each
   - In MetaMask, click on your account icon > Import Account
   - Paste the private key of one of the test accounts

4. **Connect to MiniDex**:
   - Open the MiniDex frontend
   - Click "Connect Wallet" and approve the MetaMask connection

5. **Creating a Test Token**:
   - For testing purposes, you can deploy test ERC20 tokens using Foundry
   - Run: `forge create test/mocks/ERC20Mock.sol:ERC20Mock --constructor-args "Test Token" "TEST" 18 1000000000000000000000000 --private-key <YOUR_PRIVATE_KEY> --rpc-url http://localhost:8545`
   - Note the deployed address

6. **Creating Liquidity Pools**:
   - Use the deployed test token addresses to create new liquidity pools
   - Approve token spending when prompted by MetaMask
   - Create the pool and add initial liquidity

7. **Swapping Tokens**:
   - Select tokens from existing pools
   - Enter the amount to swap
   - Approve the transaction in MetaMask

## Contract Architecture

- `MiniDexFactory.sol`: Creates new liquidity pairs and manages pair registry
- `MiniDexPair.sol`: Handles pool reserves, swaps, and liquidity operations
- `MiniDexERC20.sol`: LP token implementation for pool shares
- `Router.sol`: User-facing contract for liquidity and swap operations
- `Math.sol`: Math utilities for the protocol

## Usage Examples

### Creating a Pair

```solidity
// Create a new trading pair
factory.createPair(address(tokenA), address(tokenB));
```

### Adding Liquidity

```solidity
// Approve router to spend tokens
tokenA.approve(address(router), amountA);
tokenB.approve(address(router), amountB);

// Add liquidity
router.addLiquidity(
    address(tokenA),
    address(tokenB),
    amountA,
    amountB,
    amountAMin,
    amountBMin,
    to,
    deadline
);
```

### Swapping Tokens

```solidity
// Create the path for swapping
address[] memory path = new address[](2);
path[0] = address(tokenA);
path[1] = address(tokenB);

// Execute the swap
router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    to,
    deadline
);
```

## Extending the Protocol

The protocol is designed to be easily extendable:

1. Create new token pairs through the factory
2. Build arbitrage strategies across multiple pools
3. Add new router contracts for specialized swap types

## Deployment to a Public Testnet

To deploy the contracts to a public testnet:

1. Create a `.env` file with your API keys and private key
2. Update the network configuration in the Foundry config
3. Run the deployment script with the testnet flag

```bash
forge script script/DeployProtocol.s.sol --rpc-url <testnet_rpc_url> --private-key <your_private_key> --broadcast
```

After deployment, update the contract addresses in the frontend configuration to interact with the deployed contracts.

## Disclaimer

This is a simplified implementation for educational purposes. It has not been audited and should not be used in production without proper security review.

