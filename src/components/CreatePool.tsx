
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
import { FACTORY_ADDRESS } from "@/constants/addresses";
import FACTORY_ABI from "@/constants/abis/factory.json";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenA: "",
      tokenB: "",
    },
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

      const tx = await factory.createPair(values.tokenA, values.tokenB);
      toast.info("Creating liquidity pool...");
      
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        toast.success("Liquidity pool created successfully!");
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="tokenA"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token A Address</FormLabel>
              <FormControl>
                <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" />
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
                <Input placeholder="0x..." {...field} className="bg-gray-700 border-gray-600" />
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
  );
}
