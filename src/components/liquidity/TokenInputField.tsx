
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { TokenBalance } from "@/hooks/useTokenBalances";
import { formatNumber } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TokenInputFieldProps {
  form: UseFormReturn<any>;
  name: string;
  amountName: string;
  label: string;
  tokenBalance: TokenBalance | null;
  isLoading: boolean;
  onMaxClick?: () => void;
}

export function TokenInputField({
  form,
  name,
  amountName,
  label,
  tokenBalance,
  isLoading,
  onMaxClick
}: TokenInputFieldProps) {
  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="flex justify-between">
              <span>{label}</span>
              {tokenBalance && (
                <span className="text-sm text-gray-400">
                  Balance: {formatNumber(tokenBalance.balance, 4)} {tokenBalance.symbol}
                </span>
              )}
            </FormLabel>
            <FormControl>
              <div className="relative flex-grow">
                <Input 
                  placeholder="0x..." 
                  {...field} 
                  className="bg-gray-700 border-gray-600" 
                  title={field.value} 
                />
                {isLoading ? (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : tokenBalance ? (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                    {tokenBalance.symbol}
                  </div>
                ) : null}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name={amountName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount {tokenBalance && `(${tokenBalance.symbol})`}</FormLabel>
            <FormControl>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="0.0" 
                  {...field} 
                  className="bg-gray-700 border-gray-600 pr-16" 
                />
                {tokenBalance && onMaxClick && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-7 text-xs bg-gray-600"
                    onClick={onMaxClick}
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
    </div>
  );
}
