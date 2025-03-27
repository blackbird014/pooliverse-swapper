
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { FACTORY_ADDRESS } from "@/constants/addresses";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

interface Pool {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  reserves: [string, string];
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

        for (let i = 0; i < Math.min(pairCount.toNumber(), 10); i++) { // Limit to 10 for performance
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
          
          const token0Symbol = await token0.symbol();
          const token1Symbol = await token1.symbol();
          
          poolsData.push({
            pairAddress,
            token0Address,
            token1Address,
            token0Symbol,
            token1Symbol,
            reserves: [
              ethers.utils.formatUnits(reserves[0], 18), // Assuming 18 decimals
              ethers.utils.formatUnits(reserves[1], 18), // Assuming 18 decimals
            ],
          });
        }
        
        setPools(poolsData);
      } catch (error) {
        console.error("Error loading pools:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPools();
  }, [provider]);

  // Filter pools by token address
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
        placeholder="Filter by token address or symbol"
        value={filterToken}
        onChange={(e) => setFilterToken(e.target.value)}
        className="bg-gray-700 border-gray-600"
      />
      
      {loading ? (
        <div className="text-center py-4">Loading pools...</div>
      ) : pools.length === 0 ? (
        <div className="text-center py-4">No liquidity pools found</div>
      ) : (
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pair</TableHead>
                <TableHead>Liquidity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPools.map((pool, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {pool.token0Symbol}/{pool.token1Symbol}
                  </TableCell>
                  <TableCell>
                    {pool.reserves[0]} {pool.token0Symbol} <br />
                    {pool.reserves[1]} {pool.token1Symbol}
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
