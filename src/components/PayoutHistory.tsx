import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Calendar, Download, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PayoutRecord {
  id: string;
  beat_id: string;
  sale_price: number;
  producer_earnings: number;
  platform_fee: number;
  payout_status: string;
  payout_date?: string;
  created_at: string;
  license_type: string;
  beats?: {
    title: string;
  };
}

interface PayoutFilters {
  status: string;
  dateRange: string;
  searchTerm: string;
}

const PayoutHistory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [filteredPayouts, setFilteredPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<PayoutFilters>({
    status: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchPayoutHistory();
    }
  }, [user?.id]);

  useEffect(() => {
    applyFilters();
  }, [payouts, filters]);

  const fetchPayoutHistory = async () => {
    try {
      setLoading(true);
      
      const { data: salesData, error } = await supabase
        .from('beat_sales')
        .select(`
          *,
          beats:beat_id (
            title
          )
        `)
        .eq('producer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPayouts(salesData || []);
    } catch (error) {
      console.error('Error fetching payout history:', error);
      toast({
        title: "Error",
        description: "Failed to load payout history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...payouts];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(payout => payout.payout_status === filters.status);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (filters.dateRange) {
        case '7days':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case '1year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(payout => new Date(payout.created_at) >= cutoffDate);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(payout => 
        payout.beats?.title?.toLowerCase().includes(searchLower) ||
        payout.license_type.toLowerCase().includes(searchLower) ||
        payout.payout_status.toLowerCase().includes(searchLower)
      );
    }

    setFilteredPayouts(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="outline">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Beat Title', 'License', 'Sale Price', 'Your Earnings', 'Platform Fee', 'Status', 'Payout Date'];
    const csvData = filteredPayouts.map(payout => [
      new Date(payout.created_at).toLocaleDateString(),
      payout.beats?.title || 'Unknown Beat',
      payout.license_type,
      `£${payout.sale_price.toFixed(2)}`,
      `£${payout.producer_earnings.toFixed(2)}`,
      `£${payout.platform_fee.toFixed(2)}`,
      payout.payout_status,
      payout.payout_date ? new Date(payout.payout_date).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payout-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Payout history has been exported to CSV",
    });
  };

  const totalEarnings = filteredPayouts.reduce((sum, payout) => sum + payout.producer_earnings, 0);
  const pendingEarnings = filteredPayouts
    .filter(payout => payout.payout_status === 'pending')
    .reduce((sum, payout) => sum + payout.producer_earnings, 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">£{totalEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Total in Period</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">£{pendingEarnings.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Pending Payouts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{filteredPayouts.length}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>Payout History</CardTitle>
            <div className="flex gap-2">
              <Button 
                onClick={fetchPayoutHistory} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search beats, licenses..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={filters.status} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => setFilters({ status: 'all', dateRange: 'all', searchTerm: '' })}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Results Table */}
          {filteredPayouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No payouts found</p>
              <p>Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beat Title</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Your Earnings</TableHead>
                    <TableHead>Platform Fee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Payout Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-medium">
                        {payout.beats?.title || 'Unknown Beat'}
                      </TableCell>
                      <TableCell>{payout.license_type}</TableCell>
                      <TableCell>£{payout.sale_price.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        £{payout.producer_earnings.toFixed(2)}
                      </TableCell>
                      <TableCell>£{payout.platform_fee.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(payout.payout_status)}</TableCell>
                      <TableCell>
                        {new Date(payout.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {payout.payout_date 
                          ? new Date(payout.payout_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PayoutHistory;