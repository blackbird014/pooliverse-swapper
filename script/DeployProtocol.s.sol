// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/MiniDexFactory.sol";
import "../src/Router.sol";
import "../src/TokenFactory.sol";

contract DeployProtocol is Script {
    function run() public {
        // Get the private key from environment variable
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MiniDexFactory
        MiniDexFactory factory = new MiniDexFactory();
        console.log("MiniDexFactory deployed at:", address(factory));

        // Deploy Router with factory address
        Router router = new Router(address(factory));
        console.log("Router deployed at:", address(router));

        // Deploy TokenFactory
        TokenFactory tokenFactory = new TokenFactory();
        console.log("TokenFactory deployed at:", address(tokenFactory));

        vm.stopBroadcast();
    }
} 