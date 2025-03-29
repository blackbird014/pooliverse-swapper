
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import ERC20_ABI from "@/constants/abis/erc20.json";

export interface TokenInfo {
  address: string;
  symbol: string;
  balance: string;
  decimals: number;
}

export function useTokenInfo(
  tokenAddress: string | undefined,
  provider: ethers.providers.Web3Provider | null,
  account: string | null
) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      if (!provider || !account || !tokenAddress || !ethers.utils.isAddress(tokenAddress)) {
        setTokenInfo(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider
        );
        
        const [symbol, decimals, balanceBN] = await Promise.all([
          tokenContract.symbol(),
          tokenContract.decimals(),
          tokenContract.balanceOf(account)
        ]);
        
        const balance = ethers.utils.formatUnits(balanceBN, decimals);
        
        setTokenInfo({
          address: tokenAddress,
          symbol,
          balance,
          decimals
        });
      } catch (error) {
        console.error("Error getting token info:", error);
        setError("Failed to load token information");
        setTokenInfo(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTokenInfo();
  }, [tokenAddress, provider, account]);

  return { tokenInfo, isLoading, error };
}
