
import { Table, TableCell, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

interface PoolItemProps {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  reserves: [string, string];
  index: number;
}

export function PoolListItem({
  pairAddress,
  token0Address,
  token1Address,
  token0Symbol,
  token1Symbol,
  reserves,
  index
}: PoolItemProps) {
  const isTopPool = index < 5;

  return (
    <TableRow className={isTopPool ? "bg-gradient-to-r from-transparent to-green-950" : ""}>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-white">{token0Symbol}/{token1Symbol}</span>
          {isTopPool && <span className="text-xs text-green-500">Top Liquidity</span>}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">{token0Symbol}</span>
            <span>
              {formatNumber(reserves[0])}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">{token1Symbol}</span>
            <span>
              {formatNumber(reserves[1])}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-xs">
        <div className="space-y-1">
          <div>
            <span className="text-gray-400">{token0Symbol}: </span>
            <span className="font-mono text-green-400" title={token0Address}>{token0Address.slice(0, 6)}...{token0Address.slice(-4)}</span>
          </div>
          <div>
            <span className="text-gray-400">{token1Symbol}: </span>
            <span className="font-mono text-green-400" title={token1Address}>{token1Address.slice(0, 6)}...{token1Address.slice(-4)}</span>
          </div>
          <div className="mt-1 text-gray-500">
            <span className="text-gray-400">Pool: </span>
            <span className="font-mono" title={pairAddress}>{pairAddress.slice(0, 6)}...{pairAddress.slice(-4)}</span>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
