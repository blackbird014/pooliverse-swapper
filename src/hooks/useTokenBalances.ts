
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "@/constants/abis/erc20.json";

export interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export function useTokenBalances(
  tokenAddresses: string[],
  provider: ethers.providers.Web3Provider | null,
  account: string | null
) {
  const [tokenBalances, setTokenBalances] = useState<Record<string, TokenBalance | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateTokenBalances = async () => {
      if (!provider || !account || tokenAddresses.some(addr => !addr || !ethers.utils.isAddress(addr))) {
        return;
      }

      setIsLoading(true);
      setError(null);

      const balances: Record<string, TokenBalance | null> = {};

      for (const address of tokenAddresses) {
        if (!address) continue;
        
        try {
          const tokenContract = new ethers.Contract(
            address,
            ERC20_ABI,
            provider
          );
          
          const [symbol, decimals, balanceBN] = await Promise.all([
            tokenContract.symbol(),
            tokenContract.decimals(),
            tokenContract.balanceOf(account)
          ]);
          
          const balance = ethers.utils.formatUnits(balanceBN, decimals);
          
          balances[address] = {
            address,
            symbol,
            balance,
            decimals
          };
        } catch (error) {
          console.error(`Error getting token balance for ${address}:`, error);
          balances[address] = null;
        }
      }
      
      setTokenBalances(balances);
      setIsLoading(false);
    };

    updateTokenBalances();
  }, [tokenAddresses, provider, account]);

  return { tokenBalances, isLoading, error };
}
