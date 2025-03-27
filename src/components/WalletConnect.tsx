
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";
import { useWeb3Provider } from "@/hooks/useWeb3Provider";

export const WalletConnect = () => {
  const { account, connectWallet, disconnectWallet, isConnecting } = useWeb3Provider();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div>
      {account ? (
        <Button 
          variant="outline" 
          onClick={disconnectWallet}
          className="border-purple-500 text-purple-400 hover:bg-purple-900/20"
        >
          <Wallet className="mr-2 h-4 w-4" />
          {formatAddress(account)}
        </Button>
      ) : (
        <Button 
          onClick={connectWallet} 
          disabled={isConnecting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet
            </>
          )}
        </Button>
      )}
    </div>
  );
};
