import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  creditSystem,
  CreditTransaction,
  TransactionFilters,
  WalletBalanceSummary,
  WalletTransactionKind,
} from '@/services/credits/credit-system';
import {
  Coins,
  Plus,
  TrendingUp,
  History,
  Loader2,
  ShoppingCart,
  RefreshCw,
  CreditCard,
  Download,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CreditBalanceProps {
  showTransactions?: boolean;
  className?: string;
}

export const CreditBalance = ({ showTransactions = false, className }: CreditBalanceProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [balance, setBalance] = useState<WalletBalanceSummary | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(showTransactions);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transactionKindFilter, setTransactionKindFilter] = useState<
    WalletTransactionKind | 'all'
  >('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const pageSize = 10;
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    setTransactionsLoading(showTransactions);
  }, [showTransactions]);

  const buildFilterParams = useCallback((): TransactionFilters => {
    const filters: TransactionFilters = {};

    if (transactionKindFilter !== 'all') {
      filters.kind = transactionKindFilter;
    }

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00`);
      filters.startDate = start.toISOString();
    }

    if (endDate) {
      const endDateObj = new Date(`${endDate}T23:59:59.999`);
      filters.endDate = endDateObj.toISOString();
    }

    return filters;
  }, [endDate, startDate, transactionKindFilter]);

  const fetchBalance = useCallback(async () => {
    if (!user) return;

    setBalanceLoading(true);
    try {
      const balanceResult = await creditSystem.getBalanceSummary(user.id);
      setBalance(balanceResult);
    } catch (error) {
      console.error('Error fetching balance:', error);
      toast({
        title: 'Error',
        description: 'Failed to load credit balance',
        variant: 'destructive',
      });
    } finally {
      setBalanceLoading(false);
    }
  }, [toast, user]);

  const fetchTransactions = useCallback(async () => {
    if (!user || !showTransactions) return;

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    if (start && end && start > end) {
      toast({
        title: 'Invalid date range',
        description: 'Start date must be earlier than end date.',
        variant: 'destructive',
      });
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    setTransactionsLoading(true);
    try {
      const filters = buildFilterParams();
      const transactionsResult = await creditSystem.getTransactionHistory(user.id, {
        limit: pageSize,
        offset: currentPage * pageSize,
        filters,
      });

      setTransactions(transactionsResult);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setTransactionsLoading(false);
    }
  }, [
    buildFilterParams,
    currentPage,
    endDate,
    pageSize,
    showTransactions,
    startDate,
    toast,
    user,
  ]);

  useEffect(() => {
    if (user) {
      fetchBalance();
      if (showTransactions) {
        fetchTransactions();
      }
    }
  }, [fetchBalance, fetchTransactions, showTransactions, user]);

  useEffect(() => {
    setCurrentPage(0);
  }, [endDate, startDate, transactionKindFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), showTransactions ? fetchTransactions() : Promise.resolve()]);
    setRefreshing(false);
  };

  const handleResetFilters = () => {
    setTransactionKindFilter('all');
    setStartDate('');
    setEndDate('');
  };

  const handleExport = async () => {
    if (!user) return;

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`) : null;

    if (start && end && start > end) {
      toast({
        title: 'Invalid date range',
        description: 'Start date must be earlier than end date.',
        variant: 'destructive',
      });
      return;
    }

    setExporting(true);

    try {
      const filters = buildFilterParams();
      const exportTransactions = await creditSystem.getFilteredTransactions(user.id, filters);

      if (!exportTransactions.length) {
        toast({
          title: 'No transactions to export',
          description: 'Try adjusting your filters to include more transactions.',
        });
        return;
      }

      const csvHeader = ['Date', 'Type', 'Description', 'Amount'];
      const csvRows = exportTransactions.map((transaction) => {
        const date = new Date(transaction.created_at).toLocaleString();
        const description = getTransactionLabel(transaction);
        const amount = transaction.amount_credits.toString();

        return [date, transaction.kind, description, amount]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',');
      });

      const csvContent = [csvHeader.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `credit-transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export started',
        description: 'Your CSV download should begin shortly.',
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: 'Export failed',
        description: 'There was an issue exporting your transactions.',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
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

  const transactionKindOptions = useMemo<
    { value: WalletTransactionKind | 'all'; label: string }[]
  >(
    () => [
      { value: 'all', label: 'All transactions' },
      { value: 'topup', label: 'Credits added' },
      { value: 'spend_purchase', label: 'Purchases' },
      { value: 'spend_tip', label: 'Tips sent' },
      { value: 'spend_battle', label: 'Battles' },
      { value: 'spend_gift', label: 'Gifts sent' },
      { value: 'award_prize', label: 'Prizes awarded' },
      { value: 'earn_gift', label: 'Gifts received' },
      { value: 'convert_cashout', label: 'Cash-outs' },
      { value: 'convert_sub_applied', label: 'Subscription applied' },
    ],
    [],
  );

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
          {balanceLoading || !balance ? (
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
            <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-end md:justify-between">
              <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="transaction-kind">Transaction type</Label>
                  <Select
                    value={transactionKindFilter}
                    onValueChange={(value) =>
                      setTransactionKindFilter(value as WalletTransactionKind | 'all')
                    }
                  >
                    <SelectTrigger id="transaction-kind">
                      <SelectValue placeholder="All transactions" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionKindOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="transaction-start">Start date</Label>
                  <Input
                    id="transaction-start"
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="transaction-end">End date</Label>
                  <Input
                    id="transaction-end"
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleExport} disabled={exporting}>
                  {exporting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Export CSV
                </Button>
              </div>
            </div>
            {transactionsLoading ? (
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
                
                {transactions.length >= pageSize && (
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