
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { FACTORY_ADDRESS } from "@/constants/addresses";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";
import ERC20_ABI from "@/constants/abis/erc20.json";
import { formatNumber } from "@/lib/utils";

interface Pool {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  reserves: [string, string];
  liquidityUSD: number; // Estimated USD value for sorting
}

export function PoolList() {
  const { provider } = useWeb3Provider();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterToken, setFilterToken] = useState("");

  useEffect(() => {
    if (!provider) return;
    
    const loadPools = async () => {
      try {
        setLoading(true);
        
        const factory = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );

        const pairCount = await factory.allPairsLength();
        const poolsData: Pool[] = [];

        for (let i = 0; i < pairCount.toNumber(); i++) {
          const pairAddress = await factory.allPairs(i);
          
          const pair = new ethers.Contract(
            pairAddress,
            PAIR_ABI,
            provider
          );
          
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();
          const reserves = await pair.getReserves();
          
          // Get token symbols and decimals
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
          
          const token0Symbol = await token0.symbol();
          const token1Symbol = await token1.symbol();
          const token0Decimals = await token0.decimals();
          const token1Decimals = await token1.decimals();
          
          // Calculate a rough liquidity value (just for sorting purposes)
          // In a real app, you'd use price feeds to get token prices
          const reserve0 = ethers.utils.formatUnits(reserves[0], token0Decimals);
          const reserve1 = ethers.utils.formatUnits(reserves[1], token1Decimals);
          const liquidityUSD = parseFloat(reserve0) * 1 + parseFloat(reserve1) * 1; // Simple estimation
          
          poolsData.push({
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
            liquidityUSD,
          });
        }
        
        // Sort pools by liquidity value (highest first)
        poolsData.sort((a, b) => b.liquidityUSD - a.liquidityUSD);
        
        setPools(poolsData);
      } catch (error) {
        console.error("Error loading pools:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, [provider]);

  // Filter pools by token address or symbol
  const filteredPools = pools.filter(pool => {
    if (!filterToken) return true;
    return pool.token0Address.toLowerCase().includes(filterToken.toLowerCase()) ||
           pool.token1Address.toLowerCase().includes(filterToken.toLowerCase()) ||
           pool.token0Symbol.toLowerCase().includes(filterToken.toLowerCase()) ||
           pool.token1Symbol.toLowerCase().includes(filterToken.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <Input
        placeholder="Filter by token symbol or address"
        value={filterToken}
        onChange={(e) => setFilterToken(e.target.value)}
        className="bg-gray-700 border-gray-600"
      />
      
      {loading ? (
        <div className="text-center py-4">Loading pools...</div>
      ) : pools.length === 0 ? (
        <div className="text-center py-4">No liquidity pools found</div>
      ) : (
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Liquidity</TableHead>
                <TableHead>Addresses</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPools.map((pool, index) => (
                <TableRow key={index} className={index < 5 ? "bg-gradient-to-r from-transparent to-green-950" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-white">{pool.token0Symbol}/{pool.token1Symbol}</span>
                      {index < 5 && <span className="text-xs text-green-500">Top Liquidity</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{pool.token0Symbol}</span>
                        <span>
                          {formatNumber(pool.reserves[0])}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-gray-700 px-2 py-1 rounded">{pool.token1Symbol}</span>
                        <span>
                          {formatNumber(pool.reserves[1])}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="space-y-1">
                      <div>
                        <span className="text-gray-400">{pool.token0Symbol}: </span>
                        <span className="font-mono text-green-400" title={pool.token0Address}>{pool.token0Address.slice(0, 6)}...{pool.token0Address.slice(-4)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">{pool.token1Symbol}: </span>
                        <span className="font-mono text-green-400" title={pool.token1Address}>{pool.token1Address.slice(0, 6)}...{pool.token1Address.slice(-4)}</span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
