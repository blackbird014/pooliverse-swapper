
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

## Disclaimer

This is a simplified implementation for educational purposes. It has not been audited and should not be used in production without proper security review.
