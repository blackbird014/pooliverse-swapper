
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WalletConnect } from "@/components/WalletConnect";
import { CreatePool } from "@/components/CreatePool";
import { AddLiquidity } from "@/components/AddLiquidity";
import { PoolList } from "@/components/PoolList";
import { SwapTokens } from "@/components/SwapTokens";
import { CreateToken } from "@/components/CreateToken";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";

const Index = () => {
  const { account, chainId } = useWeb3Provider();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <header className="border-b border-gray-700 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple-400">MiniDex</h1>
          <WalletConnect />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            {!account ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle>Welcome to MiniDex</CardTitle>
                  <CardDescription className="text-gray-400">
                    Connect your wallet to get started with the decentralized exchange
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 mb-4">
                    MiniDex is a minimalist decentralized exchange that allows you to create liquidity pools,
                    add liquidity, and swap tokens with minimal slippage.
                  </p>
                  <div className="flex justify-center">
                    <WalletConnect />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="swap" className="w-full">
                <TabsList className="grid grid-cols-4 mb-8">
                  <TabsTrigger value="swap">Swap</TabsTrigger>
                  <TabsTrigger value="pool">Add Liquidity</TabsTrigger>
                  <TabsTrigger value="create">Create Pool</TabsTrigger>
                  <TabsTrigger value="token">Create Token</TabsTrigger>
                </TabsList>
                
                <TabsContent value="swap">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Swap Tokens</CardTitle>
                      <CardDescription className="text-gray-400">
                        Swap between any two tokens with minimal slippage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <SwapTokens />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="pool">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Add Liquidity</CardTitle>
                      <CardDescription className="text-gray-400">
                        Add liquidity to an existing pool and receive LP tokens
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AddLiquidity />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="create">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Create Liquidity Pool</CardTitle>
                      <CardDescription className="text-gray-400">
                        Create a new liquidity pool for any ERC20 token pair
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CreatePool />
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="token">
                  <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle>Create ERC20 Token</CardTitle>
                      <CardDescription className="text-gray-400">
                        Create your own ERC20 token for testing with the DEX
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CreateToken />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
          
          <div>
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle>Liquidity Pools</CardTitle>
                <CardDescription className="text-gray-400">
                  View existing liquidity pools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PoolList />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
