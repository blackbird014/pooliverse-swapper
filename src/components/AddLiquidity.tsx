import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Pool {
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  reserves: [string, string];
  liquidity: number; // For sorting
}

interface TokenBalance {
  address: string;
  symbol: string;
  balance: string;
}

const formSchema = z.object({
  tokenA: z.string().min(42, {
    message: "Token A address must be a valid Ethereum address",
  }),
  tokenB: z.string().min(42, {
    message: "Token B address must be a valid Ethereum address",
  }),
  amountA: z.string().min(1, {
    message: "Amount A is required",
  }),
  amountB: z.string().min(1, {
    message: "Amount B is required",
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

export function AddLiquidity() {
  const { provider, signer, account } = useWeb3Provider();
  const [isAdding, setIsAdding] = useState(false);
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [filterTerm, setFilterTerm] = useState("");
  const [tokenABalance, setTokenABalance] = useState<TokenBalance | null>(null);
  const [tokenBBalance, setTokenBBalance] = useState<TokenBalance | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenA: "",
      tokenB: "",
      amountA: "",
      amountB: "",
    },
  });

  const watchTokenA = form.watch("tokenA");
  const watchTokenB = form.watch("tokenB");

  // Load existing pools
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

  // Update token balances when tokens change
  useEffect(() => {
    const updateTokenBalances = async () => {
      if (!provider || !account) return;
      
      // Update token A balance
      if (watchTokenA) {
        try {
          const tokenContract = new ethers.Contract(
            watchTokenA,
            ERC20_ABI,
            provider
          );
          
          const symbol = await tokenContract.symbol();
          const balanceBN = await tokenContract.balanceOf(account);
          const balance = ethers.utils.formatUnits(balanceBN, 18);
          
          setTokenABalance({
            address: watchTokenA,
            symbol,
            balance
          });
        } catch (error) {
          console.error("Error getting token A balance:", error);
          setTokenABalance(null);
        }
      } else {
        setTokenABalance(null);
      }
      
      // Update token B balance
      if (watchTokenB) {
        try {
          const tokenContract = new ethers.Contract(
            watchTokenB,
            ERC20_ABI,
            provider
          );
          
          const symbol = await tokenContract.symbol();
          const balanceBN = await tokenContract.balanceOf(account);
          const balance = ethers.utils.formatUnits(balanceBN, 18);
          
          setTokenBBalance({
            address: watchTokenB,
            symbol,
            balance
          });
        } catch (error) {
          console.error("Error getting token B balance:", error);
          setTokenBBalance(null);
        }
      } else {
        setTokenBBalance(null);
      }
    };
    
    updateTokenBalances();
  }, [watchTokenA, watchTokenB, provider, account]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsAdding(true);
      
      // First approve tokens
      const tokenA = new ethers.Contract(
        values.tokenA,
        ERC20_ABI,
        signer
      );

      const tokenB = new ethers.Contract(
        values.tokenB,
        ERC20_ABI,
        signer
      );

      const amountA = ethers.utils.parseUnits(values.amountA, 18); // Assuming 18 decimals
      const amountB = ethers.utils.parseUnits(values.amountB, 18); // Assuming 18 decimals

      // Get token symbols for better UX
      let tokenASymbol = "Token A";
      let tokenBSymbol = "Token B";
      
      if (tokenABalance) tokenASymbol = tokenABalance.symbol;
      if (tokenBBalance) tokenBSymbol = tokenBBalance.symbol;

      toast.info(`Approving ${tokenASymbol}...`);
      const approvalA = await tokenA.approve(ROUTER_ADDRESS, amountA);
      await approvalA.wait();
      
      toast.info(`Approving ${tokenBSymbol}...`);
      const approvalB = await tokenB.approve(ROUTER_ADDRESS, amountB);
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
        values.tokenA,
        values.tokenB,
        amountA,
        amountB,
        0, // amountAMin (0 for simplicity)
        0, // amountBMin (0 for simplicity)
        account,
        deadline
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success(`${tokenASymbol}/${tokenBSymbol} liquidity added successfully!`);
        form.reset();
      } else {
        toast.error("Failed to add liquidity");
      }
    } catch (error: any) {
      console.error("Error adding liquidity:", error);
      toast.error(error.message || "Failed to add liquidity");
    } finally {
      setIsAdding(false);
    }
  }

  const handlePoolSelect = (value: string) => {
    setSelectedPool(value);
    const [tokenA, tokenB] = value.split('-');
    form.setValue('tokenA', tokenA);
    form.setValue('tokenB', tokenB);
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

  // Set maximum available amounts
  const setMaxAmount = (token: 'A' | 'B') => {
    if (token === 'A' && tokenABalance) {
      form.setValue('amountA', tokenABalance.balance);
    } else if (token === 'B' && tokenBBalance) {
      form.setValue('amountB', tokenBBalance.balance);
    }
  };

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
              name="tokenA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>Token A Address</span>
                    {tokenABalance && (
                      <span className="text-sm text-gray-400">
                        Balance: {formatNumber(tokenABalance.balance, 4)} {tokenABalance.symbol}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <div className="relative flex-grow">
                        <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" title={field.value} />
                        {tokenABalance && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                            {tokenABalance.symbol}
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenB"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex justify-between">
                    <span>Token B Address</span>
                    {tokenBBalance && (
                      <span className="text-sm text-gray-400">
                        Balance: {formatNumber(tokenBBalance.balance, 4)} {tokenBBalance.symbol}
                      </span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <div className="flex space-x-2">
                      <div className="relative flex-grow">
                        <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" title={field.value} />
                        {tokenBBalance && (
                          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                            {tokenBBalance.symbol}
                          </div>
                        )}
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amountA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount A {tokenABalance && `(${tokenABalance.symbol})`}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        {...field} 
                        className="bg-gray-700 border-gray-600 pr-16" 
                      />
                      {tokenABalance && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 text-xs bg-gray-600"
                          onClick={() => setMaxAmount('A')}
                        >
                          MAX
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amountB"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount B {tokenBBalance && `(${tokenBBalance.symbol})`}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="0.0" 
                        {...field} 
                        className="bg-gray-700 border-gray-600 pr-16" 
                      />
                      {tokenBBalance && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 text-xs bg-gray-600"
                          onClick={() => setMaxAmount('B')}
                        >
                          MAX
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isAdding || !account}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding Liquidity...
                </>
              ) : (
                "Add Liquidity"
              )}
            </Button>
          </form>
        </Form>
      </div>
      
      <div className="md:col-span-2 bg-gray-800 rounded-md p-4">
        <h3 className="text-md font-semibold text-purple-300 mb-3">Your Liquidity Summary</h3>
        
        {tokenABalance && tokenBBalance ? (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">{tokenABalance.symbol}</div>
                <div>
                  {formatNumber(tokenABalance.balance, 2)}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 rounded-md p-3">
              <div className="flex justify-between items-center">
                <div className="font-medium">{tokenBBalance.symbol}</div>
                <div>
                  {formatNumber(tokenBBalance.balance, 2)}
                </div>
              </div>
            </div>
            
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
    </div>
  );
}
