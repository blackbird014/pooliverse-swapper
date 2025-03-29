
import { TokenBalance } from "@/hooks/useTokenBalances";
import { formatNumber } from "@/lib/utils";

interface LiquiditySummaryProps {
  tokenABalance: TokenBalance | null;
  tokenBBalance: TokenBalance | null;
  error: string | null;
}

export function LiquiditySummary({
  tokenABalance,
  tokenBBalance,
  error
}: LiquiditySummaryProps) {
  return (
    <div className="bg-gray-800 rounded-md p-4 h-full">
      <h3 className="text-md font-semibold text-purple-300 mb-3">Your Liquidity Summary</h3>
      
      {tokenABalance && tokenBBalance ? (
        <div className="space-y-4">
          <div className="bg-gray-700 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">{tokenABalance.symbol}</div>
              <div>
                {formatNumber(tokenABalance.balance, 4)}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-md p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">{tokenBBalance.symbol}</div>
              <div>
                {formatNumber(tokenBBalance.balance, 4)}
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-900/40 border border-red-700/40 rounded-md text-red-300 text-sm">
              {error}
            </div>
          )}
          
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="text-sm text-gray-400">
              After adding liquidity, you'll receive LP tokens that represent your share of the pool.
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">
          Select token addresses to see your balances
        </div>
      )}
    </div>
  );
}
