
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/MiniDexFactory.sol";
import "../src/MiniDexPair.sol";
import "../src/Router.sol";
import "../src/interfaces/IERC20.sol";
import "./mocks/ERC20Mock.sol";

contract MiniDexTest is Test {
    MiniDexFactory public factory;
    Router public router;
    ERC20Mock public tokenA;
    ERC20Mock public tokenB;
    address public pair;
    
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    function setUp() public {
        // Deploy contracts
        factory = new MiniDexFactory();
        router = new Router(address(factory));
        
        // Deploy mock tokens
        tokenA = new ERC20Mock("Token A", "TKA", 18);
        tokenB = new ERC20Mock("Token B", "TKB", 18);
        
        // Mint tokens to users
        tokenA.mint(alice, 10000 ether);
        tokenB.mint(alice, 10000 ether);
        tokenA.mint(bob, 10000 ether);
        tokenB.mint(bob, 10000 ether);
        
        // Approve router to spend tokens
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }
    
    function testCreatePair() public {
        factory.createPair(address(tokenA), address(tokenB));
        pair = factory.getPair(address(tokenA), address(tokenB));
        
        assertEq(factory.allPairsLength(), 1);
        assertEq(MiniDexPair(pair).token0(), address(tokenA) < address(tokenB) ? address(tokenA) : address(tokenB));
        assertEq(MiniDexPair(pair).token1(), address(tokenA) < address(tokenB) ? address(tokenB) : address(tokenA));
    }
    
    function testAddLiquidity() public {
        vm.startPrank(alice);
        
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        
        pair = factory.getPair(address(tokenA), address(tokenB));
        
        assertEq(amountA, 1000 ether);
        assertEq(amountB, 1000 ether);
        assertGt(liquidity, 0);
        assertEq(IERC20(pair).balanceOf(alice), liquidity);
        
        vm.stopPrank();
    }
    
    function testRemoveLiquidity() public {
        // First add liquidity
        vm.startPrank(alice);
        
        (uint amountA, uint amountB, uint liquidity) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        
        pair = factory.getPair(address(tokenA), address(tokenB));
        
        // Approve pair to spend LP tokens
        IERC20(pair).approve(address(router), liquidity);
        
        uint aliceTokenABalanceBefore = tokenA.balanceOf(alice);
        uint aliceTokenBBalanceBefore = tokenB.balanceOf(alice);
        
        // Remove liquidity
        (uint amountARemoved, uint amountBRemoved) = router.removeLiquidity(
            address(tokenA),
            address(tokenB),
            liquidity,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        
        uint aliceTokenABalanceAfter = tokenA.balanceOf(alice);
        uint aliceTokenBBalanceAfter = tokenB.balanceOf(alice);
        
        assertEq(amountARemoved, aliceTokenABalanceAfter - aliceTokenABalanceBefore);
        assertEq(amountBRemoved, aliceTokenBBalanceAfter - aliceTokenBBalanceBefore);
        assertEq(IERC20(pair).balanceOf(alice), 0);
        
        vm.stopPrank();
    }
    
    function testSwap() public {
        // Add liquidity with Alice
        vm.startPrank(alice);
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        vm.stopPrank();
        
        // Bob swaps tokens
        vm.startPrank(bob);
        
        uint bobTokenBBalanceBefore = tokenB.balanceOf(bob);
        
        address[] memory path = new address[](2);
        path[0] = address(tokenA);
        path[1] = address(tokenB);
        
        router.swapExactTokensForTokens(
            10 ether,
            0,
            path,
            bob,
            block.timestamp + 1
        );
        
        uint bobTokenBBalanceAfter = tokenB.balanceOf(bob);
        
        // Verify Bob received tokenB and spent tokenA
        assertGt(bobTokenBBalanceAfter, bobTokenBBalanceBefore);
        assertEq(tokenA.balanceOf(bob), 10000 ether - 10 ether);
        
        vm.stopPrank();
    }
    
    function testMultiplePoolsAndArbitrage() public {
        // Create another token for a third pool
        ERC20Mock tokenC = new ERC20Mock("Token C", "TKC", 18);
        tokenC.mint(alice, 10000 ether);
        tokenC.mint(bob, 10000 ether);
        
        vm.startPrank(alice);
        tokenC.approve(address(router), type(uint256).max);
        
        // Create Pool A-B with 1:1 ratio
        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            1000 ether,
            1000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        
        // Create Pool B-C with 1:2 ratio
        router.addLiquidity(
            address(tokenB),
            address(tokenC),
            1000 ether,
            2000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        
        // Create Pool A-C with 1:3 ratio (mispriced, creating arbitrage opportunity)
        router.addLiquidity(
            address(tokenA),
            address(tokenC),
            1000 ether,
            3000 ether,
            0,
            0,
            alice,
            block.timestamp + 1
        );
        vm.stopPrank();
        
        // Bob performs arbitrage
        vm.startPrank(bob);
        tokenC.approve(address(router), type(uint256).max);
        
        uint bobTokenABalanceBefore = tokenA.balanceOf(bob);
        
        // Step 1: Swap A for C
        {
            address[] memory path = new address[](2);
            path[0] = address(tokenA);
            path[1] = address(tokenC);
            
            router.swapExactTokensForTokens(
                100 ether, // 100 A
                0,
                path,
                bob,
                block.timestamp + 1
            );
        }
        
        // Step 2: Swap C for B
        {
            address[] memory path = new address[](2);
            path[0] = address(tokenC);
            path[1] = address(tokenB);
            
            uint cBalance = tokenC.balanceOf(bob);
            
            router.swapExactTokensForTokens(
                cBalance,
                0,
                path,
                bob,
                block.timestamp + 1
            );
        }
        
        // Step 3: Swap B for A (completing the arbitrage)
        {
            address[] memory path = new address[](2);
            path[0] = address(tokenB);
            path[1] = address(tokenA);
            
            uint bBalance = tokenB.balanceOf(bob);
            
            router.swapExactTokensForTokens(
                bBalance,
                0,
                path,
                bob,
                block.timestamp + 1
            );
        }
        
        uint bobTokenABalanceAfter = tokenA.balanceOf(bob);
        
        // Verify Bob made a profit in tokenA
        assertGt(bobTokenABalanceAfter, bobTokenABalanceBefore);
        
        vm.stopPrank();
    }
}
