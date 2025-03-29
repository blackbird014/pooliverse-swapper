import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";
import { FACTORY_ADDRESS } from "@/constants/addresses";
import FACTORY_ABI from "@/constants/abis/factory.json";
import PAIR_ABI from "@/constants/abis/pair.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

interface TopPool {
  token0Symbol: string;
  token1Symbol: string;
  token0Address: string;
  token1Address: string;
  liquidity: number;
}

const formSchema = z.object({
  tokenA: z.string().min(42, {
    message: "Token A address must be a valid Ethereum address",
  }),
  tokenB: z.string().min(42, {
    message: "Token B address must be a valid Ethereum address",
  }),
});

export function CreatePool() {
  const { provider, signer, account } = useWeb3Provider();
  const [isCreating, setIsCreating] = useState(false);
  const [topPools, setTopPools] = useState<TopPool[]>([]);
  const [loadingPools, setLoadingPools] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenA: "",
      tokenB: "",
    },
  });

  // Load top pools by liquidity
  useEffect(() => {
    const fetchTopPools = async () => {
      if (!provider) return;
      
      try {
        setLoadingPools(true);
        
        const factory = new ethers.Contract(
          FACTORY_ADDRESS,
          FACTORY_ABI,
          provider
        );

        const pairCount = await factory.allPairsLength();
        const poolsData: TopPool[] = [];

        for (let i = 0; i < Math.min(pairCount.toNumber(), 20); i++) {
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
          
          // Calculate liquidity value for sorting
          const reserve0 = parseFloat(ethers.utils.formatUnits(reserves[0], 18));
          const reserve1 = parseFloat(ethers.utils.formatUnits(reserves[1], 18));
          
          poolsData.push({
            token0Symbol,
            token1Symbol,
            token0Address,
            token1Address,
            liquidity: reserve0 + reserve1,
          });
        }
        
        // Sort by liquidity
        poolsData.sort((a, b) => b.liquidity - a.liquidity);
        setTopPools(poolsData);
      } catch (error) {
        console.error("Error loading top pools:", error);
      } finally {
        setLoadingPools(false);
      }
    };

    fetchTopPools();
  }, [provider]);

  // Function to select a token for pool creation
  const selectToken = (address: string, field: 'tokenA' | 'tokenB') => {
    form.setValue(field, address);
  };

  // Filter pools by token symbol or address
  const filteredPools = topPools.filter(pool => {
    if (!filterTerm) return true;
    const searchLower = filterTerm.toLowerCase();
    return pool.token0Symbol.toLowerCase().includes(searchLower) ||
           pool.token1Symbol.toLowerCase().includes(searchLower) ||
           pool.token0Address.toLowerCase().includes(searchLower) ||
           pool.token1Address.toLowerCase().includes(searchLower);
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsCreating(true);
      
      const factory = new ethers.Contract(
        FACTORY_ADDRESS,
        FACTORY_ABI,
        signer
      );

      // Get token symbols for better feedback
      const tokenA = new ethers.Contract(values.tokenA, ERC20_ABI, provider);
      const tokenB = new ethers.Contract(values.tokenB, ERC20_ABI, provider);
      
      let tokenASymbol = "Token A";
      let tokenBSymbol = "Token B";
      
      try {
        tokenASymbol = await tokenA.symbol();
        tokenBSymbol = await tokenB.symbol();
      } catch (error) {
        console.error("Error getting token symbols:", error);
      }

      toast.info(`Creating ${tokenASymbol}/${tokenBSymbol} liquidity pool...`);
      const tx = await factory.createPair(values.tokenA, values.tokenB);
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success(`${tokenASymbol}/${tokenBSymbol} liquidity pool created successfully!`);
        form.reset();
      } else {
        toast.error("Failed to create liquidity pool");
      }
    } catch (error: any) {
      console.error("Error creating pool:", error);
      toast.error(error.message || "Failed to create liquidity pool");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="tokenA"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token A Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" title={field.value} />
                  </FormControl>
                  <FormDescription className="text-gray-400">
                    Enter the contract address of the first token
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="tokenB"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token B Address</FormLabel>
                  <FormControl>
                    <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" title={field.value} />
                  </FormControl>
                  <FormDescription className="text-gray-400">
                    Enter the contract address of the second token
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isCreating || !account}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Pool...
                </>
              ) : (
                "Create Liquidity Pool"
              )}
            </Button>
          </form>
        </Form>
      </div>
      
      <div className="md:col-span-2 bg-gray-800 rounded-md p-4">
        <div className="flex items-center mb-2 justify-between">
          <h3 className="text-md font-semibold text-purple-300">Liquidity Pools</h3>
          <Input
            placeholder="Filter by symbol"
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
            className="max-w-[200px] h-8 bg-gray-700 border-gray-600 text-sm"
          />
        </div>
        
        {loadingPools ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-300" />
          </div>
        ) : (
          <div className="max-h-[250px] overflow-y-auto space-y-3">
            {filteredPools.length > 0 ? (
              filteredPools.map((pool, index) => (
                <div key={index} className="bg-gray-700 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      <span className="text-green-400">{pool.token0Symbol}</span>
                      <span className="text-gray-400"> / </span>
                      <span className="text-green-400">{pool.token1Symbol}</span>
                    </span>
                    {index < 5 && <span className="text-xs bg-green-900 px-1.5 py-0.5 rounded-full">Top</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 truncate" title={`${pool.token0Address} - ${pool.token1Address}`}>
                    {pool.token0Address.slice(0, 6)}...{pool.token0Address.slice(-4)} - {pool.token1Address.slice(0, 6)}...{pool.token1Address.slice(-4)}
                  </div>
                  <div className="mt-2 flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs bg-gray-600 hover:bg-gray-500 border-gray-500 flex-1"
                      onClick={() => {
                        selectToken(pool.token0Address, 'tokenA');
                        selectToken(pool.token1Address, 'tokenB');
                      }}
                    >
                      Use Pair
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                {filterTerm ? "No matching pools found" : "No pools available"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
