import { useState, useEffect } from "react";
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
import { ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";

interface TokenInfo {
  address: string;
  symbol: string;
  balance: string;
}

interface Pool {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  reserves: [string, string];
  liquidity: number; // For sorting
}

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

// Format number function to handle large numbers more elegantly
function formatNumber(num: string | number, decimals: number = 2): string {
  if (typeof num === 'string') {
    num = parseFloat(num);
  }
  
  // Check for NaN
  if (isNaN(num)) return "0";
  
  // For very large numbers, use compact notation
  if (num >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  
  // For small numbers, just use fixed notation
  return num.toFixed(decimals);
}

export function SwapTokens() {
  const { provider, signer, account } = useWeb3Provider();
  const [isSwapping, setIsSwapping] = useState(false);
  const [expectedOutput, setExpectedOutput] = useState<string>("");
  const [tokenInInfo, setTokenInInfo] = useState<TokenInfo | null>(null);
  const [tokenOutInfo, setTokenOutInfo] = useState<TokenInfo | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [filterTerm, setFilterTerm] = useState("");

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

  // Load all liquidity pools
  useEffect(() => {
    const loadPools = async () => {
      if (!provider) return;
      
      try {
        const factory = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );
        
        const pairCount = await factory.allPairsLength();
        const poolList: Pool[] = [];
        
        for (let i = 0; i < pairCount.toNumber(); i++) {
          const pairAddress = await factory.allPairs(i);
          
          const pair = new ethers.Contract(
            pairAddress,
            PAIR_ABI,
            provider
          );
          
          const token0Address = await pair.token0();
          const token1Address = await pair.token1();
          const reserves = await pair.getReserves();
          
          // Get token symbols
          const token0 = new ethers.Contract(
            token0Address,
            ERC20_ABI,
            provider
          );
          
          const token1 = new ethers.Contract(
            token1Address,
            ERC20_ABI,
            provider
          );
          
          const token0Symbol = await token0.symbol();
          const token1Symbol = await token1.symbol();
          
          // Calculate liquidity for sorting
          const reserve0 = parseFloat(ethers.utils.formatUnits(reserves[0], 18));
          const reserve1 = parseFloat(ethers.utils.formatUnits(reserves[1], 18));
          const liquidity = reserve0 + reserve1;
          
          poolList.push({
            pairAddress,
            token0Address,
            token1Address,
            token0Symbol,
            token1Symbol,
            reserves: [
              ethers.utils.formatUnits(reserves[0], 18),
              ethers.utils.formatUnits(reserves[1], 18)
            ],
            liquidity
          });
        }

        // Sort pools by liquidity
        poolList.sort((a, b) => b.liquidity - a.liquidity);
        
        setPools(poolList);
      } catch (error) {
        console.error("Error loading pools:", error);
      }
    };
    
    loadPools();
  }, [provider]);

  // Update token info when tokens change
  useEffect(() => {
    const updateTokenInfo = async () => {
      if (!provider || !account) return;
      
      // Update token in info
      if (watchTokenIn) {
        try {
          const tokenContract = new ethers.Contract(
            watchTokenIn,
            ERC20_ABI,
            provider
          );
          
          const symbol = await tokenContract.symbol();
          const balanceBN = await tokenContract.balanceOf(account);
          const balance = ethers.utils.formatUnits(balanceBN, 18);
          
          setTokenInInfo({
            address: watchTokenIn,
            symbol,
            balance
          });
        } catch (error) {
          console.error("Error getting token in info:", error);
          setTokenInInfo(null);
        }
      } else {
        setTokenInInfo(null);
      }
      
      // Update token out info
      if (watchTokenOut) {
        try {
          const tokenContract = new ethers.Contract(
            watchTokenOut,
            ERC20_ABI,
            provider
          );
          
          const symbol = await tokenContract.symbol();
          const balanceBN = await tokenContract.balanceOf(account);
          const balance = ethers.utils.formatUnits(balanceBN, 18);
          
          setTokenOutInfo({
            address: watchTokenOut,
            symbol,
            balance
          });
        } catch (error) {
          console.error("Error getting token out info:", error);
          setTokenOutInfo(null);
        }
      } else {
        setTokenOutInfo(null);
      }
    };
    
    updateTokenInfo();
  }, [watchTokenIn, watchTokenOut, provider, account]);

  // Estimate output amount when inputs change
  useEffect(() => {
    const updateExpectedOutput = async () => {
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

    updateExpectedOutput();
  }, [watchAmountIn, watchTokenIn, watchTokenOut, provider]);

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
      
      // Get token symbols for better UX
      let tokenInSymbol = "Token";
      let tokenOutSymbol = "Token";
      
      if (tokenInInfo) tokenInSymbol = tokenInInfo.symbol;
      if (tokenOutInfo) tokenOutSymbol = tokenOutInfo.symbol;
      
      toast.info(`Approving ${tokenInSymbol}...`);
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
      
      toast.info(`Swapping ${tokenInSymbol} for ${tokenOutSymbol}...`);
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        0, // amountOutMin (0 for simplicity)
        path,
        account,
        deadline
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success(`Successfully swapped ${tokenInSymbol} for ${tokenOutSymbol}!`);
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

  const handlePoolSelect = (value: string) => {
    setSelectedPool(value);
    const [tokenIn, tokenOut] = value.split('-');
    form.setValue('tokenIn', tokenIn);
    form.setValue('tokenOut', tokenOut);
  };

  // Set maximum available amounts
  const setMaxAmount = () => {
    if (tokenInInfo) {
      form.setValue('amountIn', tokenInInfo.balance);
    }
  };

  // Filter pools by token symbol or address
  const filteredPools = pools.filter(pool => {
    if (!filterTerm) return true;
    const searchLower = filterTerm.toLowerCase();
    return pool.token0Symbol.toLowerCase().includes(searchLower) ||
           pool.token1Symbol.toLowerCase().includes(searchLower) ||
           pool.token0Address.toLowerCase().includes(searchLower) ||
           pool.token1Address.toLowerCase().includes(searchLower);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <div className="bg-gray-800 rounded-md p-2 max-h-[150px] overflow-y-auto">
                {filteredPools.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredPools.map((pool, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded-md cursor-pointer text-sm ${
                          selectedPool === `${pool.token0Address}-${pool.token1Address}` ? 
                          'bg-purple-900 border border-purple-500' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                        onClick={() => handlePoolSelect(`${pool.token0Address}-${pool.token1Address}`)}
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
            
            <FormField
              control={form.control}
              name="tokenIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>From</span>
                    {tokenInInfo && (
                      <span className="text-sm text-gray-400">
                        Balance: {formatNumber(tokenInInfo.balance, 4)} {tokenInInfo.symbol}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <div className="relative flex-grow">
                        <Input 
                          placeholder="Token Address (0x...)" 
                          {...field} 
                          className="flex-grow bg-gray-700 border-gray-600" 
                          title={field.value} // Shows full address on hover
                        />
                        {tokenInInfo && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                            {tokenInInfo.symbol}
                          </div>
                        )}
                      </div>
                      <div className="relative w-1/3">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={watchAmountIn}
                          onChange={(e) => form.setValue("amountIn", e.target.value)}
                          className="w-full bg-gray-700 border-gray-600"
                        />
                        {tokenInInfo && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 text-xs text-purple-400 hover:text-purple-300"
                            onClick={setMaxAmount}
                          >
                            MAX
                          </Button>
                        )}
                      </div>
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
                  <FormLabel className="flex justify-between">
                    <span>To</span>
                    {tokenOutInfo && (
                      <span className="text-sm text-gray-400">
                        Balance: {formatNumber(tokenOutInfo.balance, 4)} {tokenOutInfo.symbol}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <div className="relative flex-grow">
                        <Input 
                          placeholder="Token Address (0x...)" 
                          {...field} 
                          className="flex-grow bg-gray-700 border-gray-600" 
                          title={field.value} // Shows full address on hover
                        />
                        {tokenOutInfo && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                            {tokenOutInfo.symbol}
                          </div>
                        )}
                      </div>
                      <Input
                        type="text"
                        placeholder="Expected output"
                        value={expectedOutput ? formatNumber(expectedOutput, 4) : ""}
                        disabled
                        className="w-1/3 bg-gray-700 border-gray-600"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isSwapping || !account}
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
      
      <div className="md:col-span-2 bg-gray-800 rounded-md p-4">
        <h3 className="text-md font-semibold text-purple-300 mb-3">Swap Summary</h3>
        
        {tokenInInfo && tokenOutInfo ? (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">You pay</div>
                <div>
                  {watchAmountIn ? formatNumber(watchAmountIn, 2) : "0"} {tokenInInfo.symbol}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1 overflow-hidden text-ellipsis" title={watchTokenIn}>
                Address: {watchTokenIn.slice(0, 10)}...{watchTokenIn.slice(-8)}
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">You receive</div>
                <div>
                  {expectedOutput ? formatNumber(expectedOutput, 2) : "0"} {tokenOutInfo.symbol}
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1 overflow-hidden text-ellipsis" title={watchTokenOut}>
                Address: {watchTokenOut.slice(0, 10)}...{watchTokenOut.slice(-8)}
              </div>
            </div>
            
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
    </div>
  );
}
