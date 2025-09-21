import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWallet, formatCredits } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Wallet, Plus } from "lucide-react";
import { Link } from "react-router-dom";

export const HeaderWalletBalance = () => {
  const { balance, loading } = useWallet();
  const { user } = useAuth();

  if (!user || loading) {
    return null;
  }

  return (
    <Link to="/dashboard/wallet" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <Wallet className="h-4 w-4 text-muted-foreground" />
      <Badge variant="secondary" className="font-medium">
        {formatCredits(balance.balance_credits)} Credits
      </Badge>
    </Link>
  );
};