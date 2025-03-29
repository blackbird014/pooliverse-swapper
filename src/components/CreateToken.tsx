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
import { TOKEN_FACTORY_ADDRESS } from "@/constants/addresses";
import TOKEN_FACTORY_ABI from "@/constants/abis/token-factory.json";
import ERC20_ABI from "@/constants/abis/erc20.json";

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
  const [deployedTokens, setDeployedTokens] = useState<Array<{address: string, name: string, symbol: string}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      symbol: "",
      decimals: "18",
      initialSupply: "1000000",
    },
  });

  // Load deployed tokens when component mounts
  useEffect(() => {
    async function loadDeployedTokens() {
      if (!provider) return;
      
      try {
        setIsLoading(true);
        const tokenFactory = new ethers.Contract(
          TOKEN_FACTORY_ADDRESS,
          TOKEN_FACTORY_ABI,
          provider
        );
        
        // Get all deployed token addresses
        const tokenAddresses = await tokenFactory.getDeployedTokens();
        console.log("Deployed token addresses:", tokenAddresses);
        
        // Get token metadata for each address
        const tokens = await Promise.all(
          tokenAddresses.map(async (address: string) => {
            try {
              const tokenContract = new ethers.Contract(address, ERC20_ABI, provider);
              const name = await tokenContract.name();
              const symbol = await tokenContract.symbol();
              
              return {
                address,
                name,
                symbol
              };
            } catch (error) {
              console.error(`Error fetching token info for ${address}:`, error);
              return {
                address,
                name: 'Unknown Token',
                symbol: '???'
              };
            }
          })
        );
        
        setDeployedTokens(tokens);
      } catch (error) {
        console.error("Error loading deployed tokens:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDeployedTokens();
  }, [provider, createdTokenAddress]);  // Reload when a new token is created

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!signer) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsCreating(true);
      
      console.log("Starting token creation with values:", values);
      console.log("Using TokenFactory address:", TOKEN_FACTORY_ADDRESS);
      console.log("Connected wallet address:", account);
      
      const tokenFactory = new ethers.Contract(
        TOKEN_FACTORY_ADDRESS,
        TOKEN_FACTORY_ABI,
        signer
      );

      console.log("TokenFactory contract instance created");
      
      // Convert initialSupply to a proper BigNumber
      const decimalsValue = parseInt(values.decimals);
      const initialSupplyValue = ethers.utils.parseUnits(
        values.initialSupply, 
        decimalsValue
      );
      
      console.log("Calling createToken with parameters:", {
        name: values.name,
        symbol: values.symbol,
        decimals: decimalsValue,
        initialSupply: initialSupplyValue.toString()
      });
      
      // Create transaction options with higher gas limit to ensure execution
      const options = {
        gasLimit: 3000000,  // Specify a higher gas limit
      };
      
      const tx = await tokenFactory.createToken(
        values.name,
        values.symbol,
        decimalsValue,
        initialSupplyValue,
        options
      );
      
      console.log("Transaction sent:", tx.hash);
      toast.info("Creating token...");
      
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      // Extract the token address from the event logs
      const tokenCreatedEvent = receipt.events?.find((event: any) => event.event === 'TokenCreated');
      console.log("TokenCreated event:", tokenCreatedEvent);
      
      // If TokenCreated event is not found, try to extract from logs
      let tokenAddress;
      if (tokenCreatedEvent && tokenCreatedEvent.args) {
        tokenAddress = tokenCreatedEvent.args.tokenAddress;
      } else {
        console.log("TokenCreated event not found, trying to extract from logs");
        // Look through all logs to find something that might be our event
        if (receipt.logs && receipt.logs.length > 0) {
          console.log("Transaction logs:", receipt.logs);
          // The token address might be in the logs somewhere
          // In some cases, the event name isn't properly decoded
        }
      }
      
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
      } else if (receipt.status === 1) {
        // Transaction succeeded but we couldn't find the token address
        console.log("Transaction succeeded but couldn't extract token address");
        toast.success("Token created successfully, but couldn't extract the address");
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
      
      {/* Display list of deployed tokens */}
      {deployedTokens.length > 0 && (
        <div className="mt-6 bg-gray-700 rounded-md p-4">
          <h3 className="text-md font-semibold text-purple-300 mb-2">Your Tokens</h3>
          <div className="space-y-3">
            {deployedTokens.map((token, index) => {
              return (
                <div key={index} className="bg-gray-800 p-3 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-green-400">{token.symbol}</span>
                      <span className="text-gray-400 ml-2">({token.name})</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-xs h-7 bg-gray-700 border-gray-600"
                      onClick={() => {
                        navigator.clipboard.writeText(token.address);
                        toast.success("Address copied to clipboard");
                      }}
                    >
                      Copy Address
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-gray-400 break-all">{token.address}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
