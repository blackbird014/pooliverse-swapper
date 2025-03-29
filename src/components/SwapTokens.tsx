
import { useState } from "react";
import { ethers } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { ROUTER_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

import { useTokenInfo } from "@/hooks/useTokenInfo";
import { usePools } from "@/hooks/usePools";
import { useSwapCalculation } from "@/hooks/useSwapCalculation";
import { PoolSelector } from "@/components/swap/PoolSelector";
import { TokenField } from "@/components/swap/TokenField";
import { SwapSummary } from "@/components/swap/SwapSummary";

const formSchema = z.object({
  tokenIn: z.string().min(42, {
    message: "Token address must be a valid Ethereum address",
  }),
  tokenOut: z.string().min(42, {
    message: "Token address must be a valid Ethereum address",
  }),
});

export function SwapTokens() {
  const { provider, signer, account } = useWeb3Provider();
  const [isSwapping, setIsSwapping] = useState(false);
  const [amountIn, setAmountIn] = useState("");
  const [swapError, setSwapError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
    },
  });

  const watchTokenIn = form.watch("tokenIn");
  const watchTokenOut = form.watch("tokenOut");

  // Custom hooks
  const { pools, isLoading: poolsLoading, error: poolsError } = usePools(provider);
  
  const { 
    tokenInfo: tokenInInfo, 
    isLoading: tokenInLoading, 
    error: tokenInError 
  } = useTokenInfo(watchTokenIn, provider, account);
  
  const { 
    tokenInfo: tokenOutInfo, 
    isLoading: tokenOutLoading, 
    error: tokenOutError 
  } = useTokenInfo(watchTokenOut, provider, account);
  
  const { 
    expectedOutput, 
    isCalculating, 
    error: calculationError 
  } = useSwapCalculation(amountIn, watchTokenIn, watchTokenOut, provider);

  // Swap button handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!amountIn || parseFloat(amountIn) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSwapError(null);
    
    try {
      setIsSwapping(true);
      
      // First get token decimals
      const tokenInContract = new ethers.Contract(
        values.tokenIn,
        ERC20_ABI,
        signer
      );
      
      const decimals = await tokenInContract.decimals();
      
      // Check if amount is valid
      if (isNaN(parseFloat(amountIn))) {
        throw new Error("Invalid amount");
      }
      
      const amountInWei = ethers.utils.parseUnits(amountIn, decimals);
      
      // Check if user has enough balance
      if (tokenInInfo) {
        const balanceWei = ethers.utils.parseUnits(tokenInInfo.balance, tokenInInfo.decimals);
        if (balanceWei.lt(amountInWei)) {
          throw new Error(`Insufficient ${tokenInInfo.symbol} balance`);
        }
      }
      
      // Get token symbols for better UX
      let tokenInSymbol = "Token";
      let tokenOutSymbol = "Token";
      
      if (tokenInInfo) tokenInSymbol = tokenInInfo.symbol;
      if (tokenOutInfo) tokenOutSymbol = tokenOutInfo.symbol;
      
      toast.info(`Approving ${tokenInSymbol}...`);
      
      try {
        const approval = await tokenInContract.approve(ROUTER_ADDRESS, amountInWei);
        await approval.wait();
      } catch (approvalError: any) {
        console.error("Approval error:", approvalError);
        throw new Error(`Failed to approve ${tokenInSymbol}: ${approvalError.message || "Transaction rejected"}`);
      }
      
      // Now swap
      const router = new ethers.Contract(
        ROUTER_ADDRESS,
        ROUTER_ABI,
        signer
      );

      const path = [values.tokenIn, values.tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      toast.info(`Swapping ${tokenInSymbol} for ${tokenOutSymbol}...`);
      
      try {
        // Calculate minimum output amount with 1% slippage
        let amountOutMin = 0;
        if (expectedOutput) {
          const outDecimals = tokenOutInfo?.decimals || 18;
          const expectedOutputWei = ethers.utils.parseUnits(expectedOutput, outDecimals);
          amountOutMin = expectedOutputWei.mul(99).div(100).toNumber(); // 1% slippage
        }
        
        const tx = await router.swapExactTokensForTokens(
          amountInWei,
          amountOutMin,
          path,
          account,
          deadline
        );
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
          toast.success(`Successfully swapped ${tokenInSymbol} for ${tokenOutSymbol}!`);
          form.reset();
          setAmountIn("");
        } else {
          throw new Error("Transaction failed");
        }
      } catch (swapError: any) {
        console.error("Swap error:", swapError);
        throw new Error(`Failed to swap tokens: ${swapError.message || "Transaction failed"}`);
      }
    } catch (error: any) {
      console.error("Error swapping tokens:", error);
      toast.error(error.message || "Failed to swap tokens");
      setSwapError(error.message || "Unknown error occurred during swap");
    } finally {
      setIsSwapping(false);
    }
  }

  // Flip tokens
  const flipTokens = () => {
    const tokenIn = form.getValues("tokenIn");
    const tokenOut = form.getValues("tokenOut");
    
    form.setValue("tokenIn", tokenOut);
    form.setValue("tokenOut", tokenIn);
    setAmountIn("");
  };

  // Handle pool selection
  const handlePoolSelect = (tokenInAddress: string, tokenOutAddress: string) => {
    form.setValue('tokenIn', tokenInAddress);
    form.setValue('tokenOut', tokenOutAddress);
  };

  // Set maximum available amounts
  const setMaxAmount = () => {
    if (tokenInInfo) {
      setAmountIn(tokenInInfo.balance);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PoolSelector 
              pools={pools}
              isLoading={poolsLoading}
              error={poolsError}
              onSelectPool={handlePoolSelect}
              selectedTokenIn={watchTokenIn}
              selectedTokenOut={watchTokenOut}
            />
            
            <TokenField 
              form={form}
              name="tokenIn"
              label="From"
              tokenInfo={tokenInInfo}
              isLoading={tokenInLoading}
              error={tokenInError}
              amountName="amountIn"
              amountValue={amountIn}
              onAmountChange={setAmountIn}
              showMaxButton={true}
              onMaxClick={setMaxAmount}
            />
            
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={flipTokens}
                className="rounded-full border-gray-600 bg-gray-700 hover:bg-gray-600"
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            
            <TokenField 
              form={form}
              name="tokenOut"
              label="To"
              tokenInfo={tokenOutInfo}
              isLoading={tokenOutLoading}
              error={tokenOutError}
              amountName="amountOut"
              amountValue={expectedOutput}
              amountReadOnly={true}
            />
            
            <Button 
              type="submit" 
              disabled={isSwapping || !account || isCalculating}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isSwapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Swapping...
                </>
              ) : (
                "Swap"
              )}
            </Button>
          </form>
        </Form>
      </div>
      
      <div className="md:col-span-2">
        <SwapSummary
          tokenInInfo={tokenInInfo}
          tokenOutInfo={tokenOutInfo}
          amountIn={amountIn}
          expectedOutput={expectedOutput}
          error={swapError || calculationError}
        />
      </div>
    </div>
  );
}
