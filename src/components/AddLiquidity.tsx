
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
import { ROUTER_ADDRESS, FACTORY_ADDRESS } from "@/constants/addresses";
import ROUTER_ABI from "@/constants/abis/router.json";
import ERC20_ABI from "@/constants/abis/erc20.json";
import FACTORY_ABI from "@/constants/abis/factory.json";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export function AddLiquidity() {
  const { provider, signer, account } = useWeb3Provider();
  const [isAdding, setIsAdding] = useState(false);
  const [pools, setPools] = useState<{token0: string, token1: string}[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenA: "",
      tokenB: "",
      amountA: "",
      amountB: "",
    },
  });

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
        const poolList = [];

        for (let i = 0; i < pairCount.toNumber(); i++) {
          const pairAddress = await factory.allPairs(i);
          const token0 = await factory.getPair(pairAddress, 0);
          const token1 = await factory.getPair(pairAddress, 1);
          
          poolList.push({
            token0,
            token1,
            pairAddress
          });
        }

        setPools(poolList);
      } catch (error) {
        console.error("Error loading pools:", error);
      }
    };

    loadPools();
  }, [provider]);

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

      toast.info("Approving Token A...");
      const approvalA = await tokenA.approve(ROUTER_ADDRESS, amountA);
      await approvalA.wait();
      
      toast.info("Approving Token B...");
      const approvalB = await tokenB.approve(ROUTER_ADDRESS, amountB);
      await approvalB.wait();

      // Now add liquidity
      const router = new ethers.Contract(
        ROUTER_ADDRESS,
        ROUTER_ABI,
        signer
      );

      toast.info("Adding liquidity...");
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
        toast.success("Liquidity added successfully!");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {pools.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Existing Pool</label>
            <Select onValueChange={handlePoolSelect}>
              <SelectTrigger className="bg-gray-700 border-gray-600">
                <SelectValue placeholder="Select a pool" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {pools.map((pool, index) => (
                  <SelectItem key={index} value={`${pool.token0}-${pool.token1}`}>
                    {`${pool.token0.slice(0, 6)}...${pool.token0.slice(-4)} / ${pool.token1.slice(0, 6)}...${pool.token1.slice(-4)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <FormField
          control={form.control}
          name="tokenA"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token A Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" />
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
              <FormLabel>Token B Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" />
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
              <FormLabel>Amount A</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0.0" 
                  {...field} 
                  className="bg-gray-700 border-gray-600" 
                />
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
              <FormLabel>Amount B</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="0.0" 
                  {...field} 
                  className="bg-gray-700 border-gray-600" 
                />
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
  );
}
