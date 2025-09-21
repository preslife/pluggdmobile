import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Calendar, PieChart as PieChartIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EarningsData {
  date: string;
  earnings: number;
  sales: number;
  cumulativeEarnings: number;
}

interface LicenseBreakdown {
  name: string;
  value: number;
  percentage: number;
}

interface MonthlyStats {
  month: string;
  earnings: number;
  sales: number;
  avgPerSale: number;
}

const EarningsChart = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [earningsData, setEarningsData] = useState<EarningsData[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [licenseBreakdown, setLicenseBreakdown] = useState<LicenseBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    if (user?.id) {
      fetchEarningsData();
    }
  }, [user?.id, timeRange]);

  const fetchEarningsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '30days':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '3months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        case '2years':
          startDate.setFullYear(endDate.getFullYear() - 2);
          break;
      }

      // Fetch beat sales data
      const { data: salesData, error } = await supabase
        .from('beat_sales')
        .select('*')
        .eq('producer_id', user?.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data for charts
      processEarningsData(salesData || []);
      processMonthlyStats(salesData || []);
      processLicenseBreakdown(salesData || []);

    } catch (error) {
      console.error('Error fetching earnings data:', error);
      toast({
        title: "Error",
        description: "Failed to load earnings data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processEarningsData = (sales: any[]) => {
    const dailyData: { [key: string]: { earnings: number; sales: number } } = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { earnings: 0, sales: 0 };
      }
      dailyData[date].earnings += sale.producer_earnings || 0;
      dailyData[date].sales += 1;
    });

    let cumulativeEarnings = 0;
    const chartData = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        cumulativeEarnings += data.earnings;
        return {
          date: new Date(date).toLocaleDateString('en-GB', { 
            month: 'short', 
            day: 'numeric' 
          }),
          earnings: data.earnings,
          sales: data.sales,
          cumulativeEarnings
        };
      });

    setEarningsData(chartData);
  };

  const processMonthlyStats = (sales: any[]) => {
    const monthlyData: { [key: string]: { earnings: number; sales: number } } = {};
    
    sales.forEach(sale => {
      const date = new Date(sale.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { earnings: 0, sales: 0 };
      }
      monthlyData[monthKey].earnings += sale.producer_earnings || 0;
      monthlyData[monthKey].sales += 1;
    });

    const chartData = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-GB', { 
          month: 'short', 
          year: 'numeric' 
        }),
        earnings: data.earnings,
        sales: data.sales,
        avgPerSale: data.sales > 0 ? data.earnings / data.sales : 0
      }));

    setMonthlyStats(chartData);
  };

  const processLicenseBreakdown = (sales: any[]) => {
    const licenseData: { [key: string]: number } = {};
    
    sales.forEach(sale => {
      const license = sale.license_type || 'Unknown';
      licenseData[license] = (licenseData[license] || 0) + (sale.producer_earnings || 0);
    });

    const total = Object.values(licenseData).reduce((sum, value) => sum + value, 0);
    const chartData = Object.entries(licenseData)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0
      }))
      .sort((a, b) => b.value - a.value);

    setLicenseBreakdown(chartData);
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Earnings Analytics</CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="2years">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="earnings">Daily Earnings</TabsTrigger>
          <TabsTrigger value="cumulative">Cumulative</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Stats</TabsTrigger>
          <TabsTrigger value="breakdown">License Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Daily Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `£${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'earnings' ? `£${value.toFixed(2)}` : value,
                        name === 'earnings' ? 'Earnings' : 'Sales'
                      ]}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="earnings" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary) / 0.2)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No earnings data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cumulative">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Cumulative Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {earningsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={earningsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => `£${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: any) => [`£${value.toFixed(2)}`, 'Total Earnings']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeEarnings" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No earnings data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Monthly Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `£${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value: any, name: string) => {
                        if (name === 'earnings' || name === 'avgPerSale') {
                          return [`£${value.toFixed(2)}`, name === 'earnings' ? 'Earnings' : 'Avg per Sale'];
                        }
                        return [value, 'Sales'];
                      }}
                    />
                    <Bar dataKey="earnings" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No monthly data available for this period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Earnings by License Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              {licenseBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={licenseBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {licenseBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`£${value.toFixed(2)}`, 'Earnings']} />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  <div className="space-y-3">
                    {licenseBreakdown.map((license, index) => (
                      <div key={license.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{license.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">£{license.value.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{license.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <PieChartIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No license breakdown data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EarningsChart;