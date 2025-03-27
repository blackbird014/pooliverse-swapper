
import { useState } from "react";
import { ethers } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { ROUTER_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

const formSchema = z.object({
  tokenIn: z.string().min(42, {
    message: "Token address must be a valid Ethereum address",
  }),
  tokenOut: z.string().min(42, {
    message: "Token address must be a valid Ethereum address",
  }),
  amountIn: z.string().min(1, {
    message: "Amount is required",
  }),
});

export function SwapTokens() {
  const { provider, signer, account } = useWeb3Provider();
  const [isSwapping, setIsSwapping] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenIn: "",
      tokenOut: "",
      amountIn: "",
    },
  });

  const watchAmountIn = form.watch("amountIn");
  const watchTokenIn = form.watch("tokenIn");
  const watchTokenOut = form.watch("tokenOut");

  // Estimate output amount when inputs change
  const estimateOutput = async () => {
    if (!provider || !watchAmountIn || !watchTokenIn || !watchTokenOut) {
      setExpectedOutput("");
      return;
    }

    try {
      const router = new ethers.Contract(
        ROUTER_ADDRESS,
        ROUTER_ABI,
        provider
      );

      const amountIn = ethers.utils.parseUnits(watchAmountIn, 18); // Assuming 18 decimals
      const path = [watchTokenIn, watchTokenOut];
      
      const amounts = await router.getAmountsOut(amountIn, path);
      const amountOut = ethers.utils.formatUnits(amounts[1], 18); // Assuming 18 decimals
      
      setExpectedOutput(amountOut);
    } catch (error) {
      console.error("Error estimating output:", error);
      setExpectedOutput("");
    }
  };

  // Swap button handler
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsSwapping(true);
      
      // First approve token
      const tokenContract = new ethers.Contract(
        values.tokenIn,
        ERC20_ABI,
        signer
      );

      const amountIn = ethers.utils.parseUnits(values.amountIn, 18); // Assuming 18 decimals
      
      toast.info("Approving token...");
      const approval = await tokenContract.approve(ROUTER_ADDRESS, amountIn);
      await approval.wait();
      
      // Now swap
      const router = new ethers.Contract(
        ROUTER_ADDRESS,
        ROUTER_ABI,
        signer
      );

      const path = [values.tokenIn, values.tokenOut];
      const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
      
      toast.info("Swapping tokens...");
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0, // amountOutMin (0 for simplicity)
        path,
        account,
        deadline
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success("Swap completed successfully!");
        form.reset();
        setExpectedOutput("");
      } else {
        toast.error("Failed to swap tokens");
      }
    } catch (error: any) {
      console.error("Error swapping tokens:", error);
      toast.error(error.message || "Failed to swap tokens");
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
    form.setValue("amountIn", "");
    setExpectedOutput("");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tokenIn"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From</FormLabel>
              <FormControl>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Token Address (0x...)" 
                    {...field} 
                    className="flex-grow bg-gray-700 border-gray-600" 
                  />
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={watchAmountIn}
                    onChange={(e) => form.setValue("amountIn", e.target.value)}
                    className="w-1/3 bg-gray-700 border-gray-600"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
        
        <FormField
          control={form.control}
          name="tokenOut"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <FormControl>
                <div className="flex space-x-2">
                  <Input 
                    placeholder="Token Address (0x...)" 
                    {...field} 
                    className="flex-grow bg-gray-700 border-gray-600" 
                  />
                  <Input
                    type="text"
                    placeholder="Expected output"
                    value={expectedOutput}
                    disabled
                    className="w-1/3 bg-gray-700 border-gray-600"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={estimateOutput}
            disabled={!watchAmountIn || !watchTokenIn || !watchTokenOut}
            className="flex-1 border-gray-600 bg-gray-700 hover:bg-gray-600"
          >
            Get Quote
          </Button>
          
          <Button 
            type="submit" 
            disabled={isSwapping || !account}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
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
        </div>
      </form>
    </Form>
  );
}
