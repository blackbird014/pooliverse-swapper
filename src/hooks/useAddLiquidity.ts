
import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import { ROUTER_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

interface AddLiquidityParams {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  tokenASymbol: string;
  tokenBSymbol: string;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  account: string | null;
}

export function useAddLiquidity() {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const addLiquidity = async ({
    tokenA,
    tokenB,
    amountA,
    amountB,
    tokenASymbol,
    tokenBSymbol,
    provider,
    signer,
    account
  }: AddLiquidityParams) => {
    if (!signer || !account) {
      toast.error("Please connect your wallet first");
      return false;
    }

    try {
      setIsAdding(true);
      setError(null);
      
      // First approve tokens
      const tokenAContract = new ethers.Contract(
        tokenA,
        ERC20_ABI,
        signer
      );

      const tokenBContract = new ethers.Contract(
        tokenB,
        ERC20_ABI,
        signer
      );

      // Get decimals
      const [decimalsA, decimalsB] = await Promise.all([
        tokenAContract.decimals(),
        tokenBContract.decimals()
      ]);

      const amountAWei = ethers.utils.parseUnits(amountA, decimalsA);
      const amountBWei = ethers.utils.parseUnits(amountB, decimalsB);

      // Check balances
      const [balanceA, balanceB] = await Promise.all([
        tokenAContract.balanceOf(account),
        tokenBContract.balanceOf(account)
      ]);

      if (balanceA.lt(amountAWei)) {
        throw new Error(`Insufficient ${tokenASymbol} balance`);
      }

      if (balanceB.lt(amountBWei)) {
        throw new Error(`Insufficient ${tokenBSymbol} balance`);
      }

      toast.info(`Approving ${tokenASymbol}...`);
      const approvalA = await tokenAContract.approve(ROUTER_ADDRESS, amountAWei);
      await approvalA.wait();
      
      toast.info(`Approving ${tokenBSymbol}...`);
      const approvalB = await tokenBContract.approve(ROUTER_ADDRESS, amountBWei);
      await approvalB.wait();

      // Now add liquidity
      const router = new ethers.Contract(
        ROUTER_ADDRESS,
        ROUTER_ABI,
        signer
      );

      toast.info(`Adding ${tokenASymbol}/${tokenBSymbol} liquidity...`);
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      const tx = await router.addLiquidity(
        tokenA,
        tokenB,
        amountAWei,
        amountBWei,
        0, // amountAMin (0 for simplicity)
        0, // amountBMin (0 for simplicity)
        account,
        deadline
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success(`${tokenASymbol}/${tokenBSymbol} liquidity added successfully!`);
        return true;
      } else {
        throw new Error("Failed to add liquidity");
      }
    } catch (error: any) {
      console.error("Error adding liquidity:", error);
      const errorMessage = error.message || "Failed to add liquidity";
      toast.error(errorMessage);
      setError(errorMessage);
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  return { addLiquidity, isAdding, error };
}
