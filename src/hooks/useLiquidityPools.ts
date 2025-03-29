
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { FACTORY_ADDRESS } from "@/constants/addresses";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

export interface Pool {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  reserves: [string, string];
  liquidity: number; // For sorting
}

export function useLiquidityPools(provider: ethers.providers.Web3Provider | null) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterTerm, setFilterTerm] = useState("");

  useEffect(() => {
    const loadPools = async () => {
      if (!provider) return;

      try {
        setIsLoading(true);
        setError(null);
        
        const factory = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );
        
        const pairCount = await factory.allPairsLength();
        const poolList: Pool[] = [];
        
        for (let i = 0; i < pairCount.toNumber(); i++) {
          try {
            const pairAddress = await factory.allPairs(i);
            
            const pair = new ethers.Contract(
              pairAddress,
              PAIR_ABI,
              provider
            );
            
            const token0Address = await pair.token0();
            const token1Address = await pair.token1();
            const reserves = await pair.getReserves();
            
            // Get token symbols
            const token0 = new ethers.Contract(
              token0Address,
              ERC20_ABI,
              provider
            );
            
            const token1 = new ethers.Contract(
              token1Address,
              ERC20_ABI,
              provider
            );
            
            const [token0Symbol, token1Symbol, token0Decimals, token1Decimals] = await Promise.all([
              token0.symbol(),
              token1.symbol(),
              token0.decimals(),
              token1.decimals()
            ]);
            
            // Calculate liquidity for sorting
            const reserve0 = parseFloat(ethers.utils.formatUnits(reserves[0], token0Decimals));
            const reserve1 = parseFloat(ethers.utils.formatUnits(reserves[1], token1Decimals));
            const liquidity = reserve0 + reserve1;
            
            poolList.push({
              pairAddress,
              token0Address,
              token1Address,
              token0Symbol,
              token1Symbol,
              token0Decimals,
              token1Decimals,
              reserves: [
                ethers.utils.formatUnits(reserves[0], token0Decimals),
                ethers.utils.formatUnits(reserves[1], token1Decimals)
              ],
              liquidity
            });
          } catch (pairError) {
            console.error(`Error processing pair at index ${i}:`, pairError);
            // Continue with next pair instead of failing the entire operation
          }
        }

        // Sort pools by liquidity
        poolList.sort((a, b) => b.liquidity - a.liquidity);
        
        setPools(poolList);
      } catch (error) {
        console.error("Error loading pools:", error);
        setError("Failed to load liquidity pools");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPools();
  }, [provider]);

  // Filter pools by token symbol or address
  const filteredPools = pools.filter(pool => {
    if (!filterTerm) return true;
    const searchLower = filterTerm.toLowerCase();
    return pool.token0Symbol.toLowerCase().includes(searchLower) ||
           pool.token1Symbol.toLowerCase().includes(searchLower) ||
           pool.token0Address.toLowerCase().includes(searchLower) ||
           pool.token1Address.toLowerCase().includes(searchLower);
  });

  return { 
    pools: filteredPools, 
    isLoading, 
    error, 
    filterTerm, 
    setFilterTerm 
  };
}
