
import { TokenInfo } from "@/hooks/useTokenInfo";
import { formatNumber } from "@/lib/utils";

interface SwapSummaryProps {
  tokenInInfo: TokenInfo | null;
  tokenOutInfo: TokenInfo | null;
  amountIn: string;
  expectedOutput: string;
  error: string | null;
}

export function SwapSummary({
  tokenInInfo,
  tokenOutInfo,
  amountIn,
  expectedOutput,
  error
}: SwapSummaryProps) {
  return (
    <div className="bg-gray-800 rounded-md p-4">
      <h3 className="text-md font-semibold text-purple-300 mb-3">Swap Summary</h3>
      
      {tokenInInfo && tokenOutInfo ? (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">You pay</div>
              <div>
                {amountIn ? formatNumber(amountIn) : "0"} {tokenInInfo.symbol}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1 overflow-hidden text-ellipsis" title={tokenInInfo.address}>
              Address: {tokenInInfo.address.slice(0, 10)}...{tokenInInfo.address.slice(-8)}
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">You receive</div>
              <div>
                {expectedOutput ? formatNumber(expectedOutput) : "0"} {tokenOutInfo.symbol}
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-1 overflow-hidden text-ellipsis" title={tokenOutInfo.address}>
              Address: {tokenOutInfo.address.slice(0, 10)}...{tokenOutInfo.address.slice(-8)}
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900/40 text-red-300 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="text-sm text-gray-400">
              Swap tokens directly through the protocol's liquidity pools.
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">
          Select tokens to see swap details
        </div>
      )}
    </div>
  );
}
