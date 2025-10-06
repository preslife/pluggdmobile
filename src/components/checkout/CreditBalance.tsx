import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { creditSystem, CreditTransaction, WalletBalanceSummary } from '@/services/credits/credit-system';
import {
  Coins,
  Plus,
  TrendingUp,
  History,
  Loader2,
  ShoppingCart,
  RefreshCw,
  CreditCard
} from 'lucide-react';

interface CreditBalanceProps {
  showTransactions?: boolean;
  className?: string;
}

export const CreditBalance = ({ showTransactions = false, className }: CreditBalanceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<WalletBalanceSummary | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [balanceResult, transactionsResult] = await Promise.all([
        creditSystem.getBalanceSummary(user.id),
        showTransactions ? creditSystem.getTransactionHistory(user.id, 10) : Promise.resolve([])
      ]);

      setBalance(balanceResult);
      setTransactions(transactionsResult as CreditTransaction[]);
    } catch (error) {
      console.error('Error fetching credit data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getTransactionIcon = (kind: CreditTransaction['kind']) => {
    switch (kind) {
      case 'topup':
        return <Plus className="h-4 w-4 text-green-500" />;
      case 'spend_purchase':
      case 'spend_tip':
      case 'spend_battle':
      case 'spend_gift':
        return <ShoppingCart className="h-4 w-4 text-blue-500" />;
      case 'award_prize':
      case 'earn_gift':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'convert_cashout':
      case 'convert_sub_applied':
        return <CreditCard className="h-4 w-4 text-purple-500" />;
      default:
        return <Coins className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getTransactionLabel = (transaction: CreditTransaction) => {
    if (transaction.meta?.description) {
      return transaction.meta.description;
    }

    switch (transaction.kind) {
      case 'topup':
        return 'Credits added';
      case 'spend_purchase':
        return transaction.meta?.product_title || 'Purchase';
      case 'spend_tip':
        return 'Tip sent';
      case 'spend_battle':
        return 'Battle entry';
      case 'award_prize':
        return 'Prize awarded';
      case 'convert_cashout':
        return 'Cash-out';
      case 'convert_sub_applied':
        return 'Subscription credits applied';
      case 'spend_gift':
        return 'Gift sent';
      case 'earn_gift':
        return 'Gift received';
      default:
        return 'Wallet transaction';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Credit Balance
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button size="sm" asChild>
              <a href="/credits/purchase">
                <Plus className="h-4 w-4 mr-1" />
                Buy Credits
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading || !balance ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-1">
                  {balance.available_credits}
                </div>
                <div className="text-sm text-muted-foreground">
                  Available Credits
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-green-600">+{balance.total_earned}</div>
                  <div className="text-muted-foreground">Earned</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded-lg">
                  <div className="font-semibold text-blue-600">-{balance.total_spent}</div>
                  <div className="text-muted-foreground">Spent</div>
                </div>
              </div>

              {balance.available_credits < 10 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
                    <CreditCard className="h-4 w-4" />
                    Low Credit Balance
                  </div>
                  <p className="text-amber-700">
                    Consider purchasing more credits to continue enjoying premium content.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showTransactions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Recent Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-12 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(transaction.kind)}
                      <div>
                        <div className="font-medium text-sm">
                          {getTransactionLabel(transaction)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                          {transaction.meta?.product_type && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {transaction.meta.product_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className={`font-semibold ${getTransactionColor(transaction.amount_credits)}`}>
                      {transaction.amount_credits >= 0 ? '+' : '-'}
                      {Math.abs(transaction.amount_credits)}
                    </div>
                  </div>
                ))}
                
                {transactions.length >= 10 && (
                  <Button variant="ghost" className="w-full mt-2" asChild>
                    <a href="/credits/history">
                      View All Transactions
                    </a>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};