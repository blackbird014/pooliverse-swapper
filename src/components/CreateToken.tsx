
import { useState } from "react";
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

// This is a placeholder address that should be replaced with the actual deployed contract address
const TOKEN_FACTORY_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
import TOKEN_FACTORY_ABI from "@/constants/abis/token-factory.json";

const formSchema = z.object({
  name: z.string().min(1, {
    message: "Token name is required",
  }),
  symbol: z.string().min(1, {
    message: "Token symbol is required",
  }),
  decimals: z.string().regex(/^\d+$/, {
    message: "Decimals must be a number",
  }),
  initialSupply: z.string().regex(/^\d+$/, {
    message: "Initial supply must be a number",
  }),
});

export function CreateToken() {
  const { provider, signer, account } = useWeb3Provider();
  const [isCreating, setIsCreating] = useState(false);
  const [createdTokenAddress, setCreatedTokenAddress] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: "18",
      initialSupply: "1000000",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsCreating(true);
      
      const tokenFactory = new ethers.Contract(
        TOKEN_FACTORY_ADDRESS,
        TOKEN_FACTORY_ABI,
        signer
      );

      const tx = await tokenFactory.createToken(
        values.name,
        values.symbol,
        parseInt(values.decimals),
        parseInt(values.initialSupply)
      );
      
      toast.info("Creating token...");
      
      const receipt = await tx.wait();
      
      // Extract the token address from the event logs
      const tokenCreatedEvent = receipt.events?.find((event: any) => event.event === 'TokenCreated');
      const tokenAddress = tokenCreatedEvent?.args?.tokenAddress;
      
      if (receipt.status === 1 && tokenAddress) {
        setCreatedTokenAddress(tokenAddress);
        toast.success(`Token created successfully! Address: ${tokenAddress}`);
        
        // Clear form except for decimals which stays at 18
        form.reset({ 
          name: "", 
          symbol: "", 
          decimals: "18", 
          initialSupply: "1000000" 
        });
      } else {
        toast.error("Failed to create token");
      }
    } catch (error: any) {
      console.error("Error creating token:", error);
      toast.error(error.message || "Failed to create token");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token Name</FormLabel>
                <FormControl>
                  <Input placeholder="My Token" {...field} className="bg-gray-700 border-gray-600" />
                </FormControl>
                <FormDescription className="text-gray-400">
                  The full name of your token (e.g., "Ethereum")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Token Symbol</FormLabel>
                <FormControl>
                  <Input placeholder="MTK" {...field} className="bg-gray-700 border-gray-600" />
                </FormControl>
                <FormDescription className="text-gray-400">
                  The symbol of your token (e.g., "ETH")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="decimals"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Decimals</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-gray-700 border-gray-600" />
                </FormControl>
                <FormDescription className="text-gray-400">
                  Number of decimal places (usually 18 for ERC20 tokens)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="initialSupply"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Initial Supply</FormLabel>
                <FormControl>
                  <Input {...field} className="bg-gray-700 border-gray-600" />
                </FormControl>
                <FormDescription className="text-gray-400">
                  The initial amount of tokens to create
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            disabled={isCreating || !account}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Token...
              </>
            ) : (
              "Create Token"
            )}
          </Button>
        </form>
      </Form>

      {createdTokenAddress && (
        <div className="mt-6 p-4 bg-gray-700 rounded-md">
          <h3 className="text-md font-semibold text-purple-300 mb-2">Token Created</h3>
          <p className="text-sm mb-2">Use this address for creating liquidity pools:</p>
          <div className="p-2 bg-gray-800 rounded overflow-x-auto">
            <code className="text-green-400 text-xs break-all">{createdTokenAddress}</code>
          </div>
        </div>
      )}
    </div>
  );
}
