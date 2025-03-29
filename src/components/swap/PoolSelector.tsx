
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Pool } from "@/hooks/usePools";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

interface PoolSelectorProps {
  pools: Pool[];
  isLoading: boolean;
  error: string | null;
  onSelectPool: (tokenIn: string, tokenOut: string) => void;
  selectedTokenIn?: string;
  selectedTokenOut?: string;
}

export function PoolSelector({
  pools,
  isLoading,
  error,
  onSelectPool,
  selectedTokenIn,
  selectedTokenOut
}: PoolSelectorProps) {
  const [filterTerm, setFilterTerm] = useState("");

  // Filter pools by token symbol or address
  const filteredPools = pools.filter(pool => {
    if (!filterTerm) return true;
    const searchLower = filterTerm.toLowerCase();
    return pool.token0Symbol.toLowerCase().includes(searchLower) ||
           pool.token1Symbol.toLowerCase().includes(searchLower) ||
           pool.token0Address.toLowerCase().includes(searchLower) ||
           pool.token1Address.toLowerCase().includes(searchLower);
  });

  const isPoolSelected = (pool: Pool) => {
    return (pool.token0Address === selectedTokenIn && pool.token1Address === selectedTokenOut) ||
           (pool.token1Address === selectedTokenIn && pool.token0Address === selectedTokenOut);
  };

  return (
    <div className="mb-4">
      <div className="flex items-center mb-2 justify-between">
        <h3 className="text-md font-medium">Select Existing Pool</h3>
        <Input
          placeholder="Filter by symbol"
          value={filterTerm}
          onChange={(e) => setFilterTerm(e.target.value)}
          className="max-w-[200px] h-8 bg-gray-700 border-gray-600 text-sm"
        />
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-gray-800 rounded-md p-2 max-h-[150px] overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredPools.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {filteredPools.map((pool, index) => (
              <div 
                key={index} 
                className={`p-2 rounded-md cursor-pointer text-sm ${
                  isPoolSelected(pool) ? 
                  'bg-purple-900 border border-purple-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => onSelectPool(pool.token0Address, pool.token1Address)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-400">
                    {pool.token0Symbol}/{pool.token1Symbol}
                  </span>
                  {index < 5 && <span className="text-xs bg-green-900 px-1.5 py-0.5 rounded-full">Top</span>}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate" title={`${pool.token0Address} - ${pool.token1Address}`}>
                  {pool.token0Address.slice(0, 6)}...{pool.token0Address.slice(-4)} - {pool.token1Address.slice(0, 6)}...{pool.token1Address.slice(-4)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-4">
            {filterTerm ? "No matching pools found" : "No pools available"}
          </div>
        )}
      </div>
    </div>
  );
}
