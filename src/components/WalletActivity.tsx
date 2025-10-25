import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWallet } from "@/hooks/useWallet";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDate, formatCurrency, formatCredits } from "@/lib/formatting";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter } from "lucide-react";

export const WalletActivity = () => {
  const { ledger, loading, refreshLedger } = useWallet();
  const { t, locale, timezone } = useTranslation();
  const [filteredLedger, setFilteredLedger] = useState(ledger);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKind, setFilterKind] = useState("all");

  useEffect(() => {
    let filtered = ledger;

    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.kind.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.ref_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.amount_credits.toString().includes(searchTerm)
      );
    }

    if (filterKind !== "all") {
      filtered = filtered.filter(entry => entry.kind === filterKind);
    }

    setFilteredLedger(filtered);
  }, [ledger, searchTerm, filterKind]);

  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'topup':
      case 'award_prize':
        return <ArrowUpCircle className="h-4 w-4 text-green-600" />;
      case 'spend_tip':
      case 'spend_purchase':
      case 'spend_battle':
      case 'convert_cashout':
      case 'convert_sub_applied':
        return <ArrowDownCircle className="h-4 w-4 text-red-600" />;
      default:
        return <ArrowUpCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityLabel = (kind: string) => {
    switch (kind) {
      case 'topup':
        return t('wallet:actions.topUp');
      case 'spend_tip':
        return t('wallet:actions.tipSent');
      case 'spend_purchase':
        return t('wallet:actions.purchase');
      case 'spend_battle':
        return t('wallet:actions.battleEntry');
      case 'award_prize':
        return t('wallet:actions.prizeAwarded');
      case 'convert_cashout':
        return t('wallet:actions.cashOut');
      case 'convert_sub_applied':
        return t('wallet:actions.creditsApplied');
      default:
        return t('wallet:activity.labels.unknown', { kind });
    }
  };

  const getActivityDescription = (entry: any) => {
    switch (entry.kind) {
      case 'spend_tip':
        return t('wallet:activity.descriptions.tipSent');
      case 'spend_purchase':
        return entry.ref_type
          ? t('wallet:activity.descriptions.purchase', { refType: entry.ref_type })
          : t('wallet:actions.purchase');
      case 'spend_battle':
        return t('wallet:activity.descriptions.battleEntry');
      case 'award_prize':
        return entry.ref_type
          ? t('wallet:activity.descriptions.prizeAwarded', { refType: entry.ref_type })
          : t('wallet:actions.prizeAwarded');
      default:
        return entry.ref_type || t('wallet:activity.labels.genericTransaction');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('wallet:activity.filter.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('wallet:activity.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={t('wallet:activity.filter.placeholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('wallet:activity.filter.all')}</SelectItem>
                <SelectItem value="topup">{t('wallet:actions.topUp')}</SelectItem>
                <SelectItem value="spend_tip">{t('wallet:actions.tipSent')}</SelectItem>
                <SelectItem value="spend_purchase">{t('wallet:actions.purchase')}</SelectItem>
                <SelectItem value="spend_battle">{t('wallet:actions.battleEntry')}</SelectItem>
                <SelectItem value="award_prize">{t('wallet:actions.prizeAwarded')}</SelectItem>
                <SelectItem value="convert_cashout">{t('wallet:actions.cashOut')}</SelectItem>
                <SelectItem value="convert_sub_applied">{t('wallet:actions.creditsApplied')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>{t('wallet:activity.history.title')}</CardTitle>
          <CardDescription>{t('wallet:activity.history.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLedger.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('wallet:activity.history.empty')}</p>
              {searchTerm || filterKind !== "all" ? (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterKind("all");
                  }}
                >
                  {t('wallet:activity.history.clear')}
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLedger.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getActivityIcon(entry.kind)}
                    <div>
                      <p className="font-medium">{getActivityLabel(entry.kind)}</p>
                      <p className="text-sm text-muted-foreground">
                        {getActivityDescription(entry)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(new Date(entry.created_at), {
                          locale,
                          timezone,
                          includeTime: true,
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`font-medium ${
                      entry.amount_credits > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {entry.amount_credits > 0 ? '+' : ''}{formatCredits(Math.abs(entry.amount_credits), { locale })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(Math.abs(entry.amount_credits / 100), { locale })}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredLedger.length >= 50 && (
                <div className="text-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => refreshLedger()}
                    disabled={loading}
                  >
                    {t('wallet:activity.history.refresh')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};