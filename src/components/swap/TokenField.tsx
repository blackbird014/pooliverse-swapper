
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { TokenInfo } from "@/hooks/useTokenInfo";
import { formatNumber } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TokenFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  tokenInfo: TokenInfo | null;
  isLoading: boolean;
  error: string | null;
  amountName?: string;
  amountValue?: string;
  amountReadOnly?: boolean;
  onAmountChange?: (value: string) => void;
  showMaxButton?: boolean;
  onMaxClick?: () => void;
}

export function TokenField({
  form,
  name,
  label,
  tokenInfo,
  isLoading,
  error,
  amountName,
  amountValue,
  amountReadOnly = false,
  onAmountChange,
  showMaxButton = false,
  onMaxClick
}: TokenFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex justify-between">
            <span>{label}</span>
            {tokenInfo && (
              <span className="text-sm text-gray-400">
                Balance: {formatNumber(tokenInfo.balance)} {tokenInfo.symbol}
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
                  title={field.value} 
                />
                {isLoading ? (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                  </div>
                ) : tokenInfo ? (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gray-800 px-2 py-1 rounded text-xs text-green-400">
                    {tokenInfo.symbol}
                  </div>
                ) : null}
              </div>
              {amountName && (
                <div className="relative w-1/3">
                  <Input
                    type="number"
                    placeholder="Amount"
                    value={amountValue}
                    readOnly={amountReadOnly}
                    onChange={(e) => onAmountChange && onAmountChange(e.target.value)}
                    className={`w-full bg-gray-700 border-gray-600 ${amountReadOnly ? 'opacity-70' : ''}`}
                  />
                  {showMaxButton && tokenInfo && onMaxClick && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-5 text-xs text-purple-400 hover:text-purple-300"
                      onClick={onMaxClick}
                    >
                      MAX
                    </Button>
                  )}
                </div>
              )}
            </div>
          </FormControl>
          {error && <FormMessage>{error}</FormMessage>}
        </FormItem>
      )}
    />
  );
}
