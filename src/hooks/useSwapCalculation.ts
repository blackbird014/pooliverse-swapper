
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ROUTER_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

export function useSwapCalculation(
  amountIn: string,
  tokenIn: string,
  tokenOut: string,
  provider: ethers.providers.Web3Provider | null
) {
  const [expectedOutput, setExpectedOutput] = useState<string>("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateOutput = async () => {
      if (!provider || !amountIn || !tokenIn || !tokenOut || 
          !ethers.utils.isAddress(tokenIn) || !ethers.utils.isAddress(tokenOut)) {
        setExpectedOutput("");
        return;
      }

      setIsCalculating(true);
      setError(null);

      try {
        const tokenInContract = new ethers.Contract(
          tokenIn,
          ERC20_ABI,
          provider
        );
        
        const inDecimals = await tokenInContract.decimals();
        
        const router = new ethers.Contract(
          ROUTER_ADDRESS,
          ROUTER_ABI,
          provider
        );

        const amountInWei = ethers.utils.parseUnits(amountIn, inDecimals);
        const path = [tokenIn, tokenOut];
        
        // Get token out decimals
        const tokenOutContract = new ethers.Contract(
          tokenOut,
          ERC20_ABI,
          provider
        );
        
        const outDecimals = await tokenOutContract.decimals();
        
        const amounts = await router.getAmountsOut(amountInWei, path);
        const amountOut = ethers.utils.formatUnits(amounts[1], outDecimals);
        
        setExpectedOutput(amountOut);
      } catch (error) {
        console.error("Error estimating output:", error);
        setError("Failed to estimate output amount");
        setExpectedOutput("");
      } finally {
        setIsCalculating(false);
      }
    };

    calculateOutput();
  }, [amountIn, tokenIn, tokenOut, provider]);

  return { expectedOutput, isCalculating, error };
}
