
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { usePools } from "@/hooks/usePools";
import { PoolListItem } from "@/components/pool/PoolListItem";

export function PoolList() {
  const { provider } = useWeb3Provider();
  const { pools, isLoading, error } = usePools(provider);
  const [filterToken, setFilterToken] = useState("");

  // Filter pools by token address or symbol
  const filteredPools = pools.filter(pool => {
    if (!filterToken) return true;
    const searchTerm = filterToken.toLowerCase();
    return pool.token0Address.toLowerCase().includes(searchTerm) ||
           pool.token1Address.toLowerCase().includes(searchTerm) ||
           pool.token0Symbol.toLowerCase().includes(searchTerm) ||
           pool.token1Symbol.toLowerCase().includes(searchTerm);
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Liquidity Pools</h2>
        <Input
          placeholder="Filter by token symbol or address"
          value={filterToken}
          onChange={(e) => setFilterToken(e.target.value)}
          className="bg-gray-700 border-gray-600 max-w-xs"
        />
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : pools.length === 0 ? (
        <div className="text-center py-8 bg-gray-800 rounded-md">
          <p className="text-lg text-gray-400">No liquidity pools found</p>
          <p className="text-sm text-gray-500 mt-2">Try creating a new pool first</p>
        </div>
      ) : (
        <div className="max-h-[500px] overflow-auto bg-gray-800 rounded-md">
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
                <PoolListItem
                  key={pool.pairAddress}
                  pairAddress={pool.pairAddress}
                  token0Address={pool.token0Address}
                  token1Address={pool.token1Address}
                  token0Symbol={pool.token0Symbol}
                  token1Symbol={pool.token1Symbol}
                  reserves={pool.reserves}
                  index={index}
                />
              ))}
            </TableBody>
          </Table>
          
          {filteredPools.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-400">No pools match your filter criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
