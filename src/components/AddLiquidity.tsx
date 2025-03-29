
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";

import { useLiquidityPools } from "@/hooks/useLiquidityPools";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useAddLiquidity } from "@/hooks/useAddLiquidity";
import { PoolList } from "@/components/liquidity/PoolList";
import { TokenInputField } from "@/components/liquidity/TokenInputField";
import { LiquiditySummary } from "@/components/liquidity/LiquiditySummary";

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

  const watchTokenA = form.watch("tokenA");
  const watchTokenB = form.watch("tokenB");

  // Custom hooks
  const { 
    pools, 
    isLoading: poolsLoading, 
    error: poolsError,
    filterTerm,
    setFilterTerm 
  } = useLiquidityPools(provider);
  
  const { 
    tokenBalances, 
    isLoading: balancesLoading 
  } = useTokenBalances(
    [watchTokenA, watchTokenB].filter(Boolean), 
    provider, 
    account
  );
  
  const { 
    addLiquidity, 
    isAdding, 
    error: addLiquidityError 
  } = useAddLiquidity();
  
  const tokenABalance = watchTokenA ? tokenBalances[watchTokenA] : null;
  const tokenBBalance = watchTokenB ? tokenBalances[watchTokenB] : null;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const success = await addLiquidity({
      tokenA: values.tokenA,
      tokenB: values.tokenB,
      amountA: values.amountA,
      amountB: values.amountB,
      tokenASymbol: tokenABalance?.symbol || "Token A",
      tokenBSymbol: tokenBBalance?.symbol || "Token B",
      provider,
      signer,
      account
    });
    
    if (success) {
      form.reset();
      setSelectedPool(null);
    }
  }

  const handlePoolSelect = (tokenA: string, tokenB: string) => {
    setSelectedPool(`${tokenA}-${tokenB}`);
    form.setValue('tokenA', tokenA);
    form.setValue('tokenB', tokenB);
  };

  // Set maximum available amounts
  const setMaxAmountA = () => {
    if (tokenABalance) {
      form.setValue('amountA', tokenABalance.balance);
    }
  };
  
  const setMaxAmountB = () => {
    if (tokenBBalance) {
      form.setValue('amountB', tokenBBalance.balance);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="md:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <PoolList 
              pools={pools}
              isLoading={poolsLoading}
              error={poolsError}
              filterTerm={filterTerm}
              onFilterChange={setFilterTerm}
              selectedPoolId={selectedPool}
              onSelectPool={handlePoolSelect}
            />
            
            <TokenInputField
              form={form}
              name="tokenA"
              amountName="amountA"
              label="Token A"
              tokenBalance={tokenABalance}
              isLoading={balancesLoading && !!watchTokenA && !tokenABalance}
              onMaxClick={setMaxAmountA}
            />
            
            <TokenInputField
              form={form}
              name="tokenB"
              amountName="amountB"
              label="Token B"
              tokenBalance={tokenBBalance}
              isLoading={balancesLoading && !!watchTokenB && !tokenBBalance}
              onMaxClick={setMaxAmountB}
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
      
      <div className="md:col-span-2">
        <LiquiditySummary
          tokenABalance={tokenABalance}
          tokenBBalance={tokenBBalance}
          error={addLiquidityError}
        />
      </div>
    </div>
  );
}
