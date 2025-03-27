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

### Building

```bash
forge build
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

## Deployment

To deploy the contracts to a live network:

```bash
forge create --rpc-url <your_rpc_url> --private-key <your_private_key> src/MiniDexFactory.sol:MiniDexFactory
```

After deploying the factory, you can interact with it through the frontend or directly through contract calls.

## Disclaimer

This is a simplified implementation for educational purposes. It has not been audited and should not be used in production without proper security review.
