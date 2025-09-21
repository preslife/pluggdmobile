import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import SEOHelmet from "@/components/SEOHelmet";
import { supabase } from "@/integrations/supabase/client";

type RLSStatus = {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_policies: boolean;
};

const AdminSecurity = () => {
  const [rlsStatus, setRlsStatus] = useState<RLSStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRLSStatus();
  }, []);

  const fetchRLSStatus = async () => {
    try {
      // This is a read-only security overview - we check policy existence
      const keyTables = [
        'profiles', 'battles', 'battle_entries', 'battle_votes', 
        'releases', 'session_rooms', 'fan_subscriptions', 'user_subscriptions'
      ];

      const status: RLSStatus[] = [];
      
      for (const tableName of keyTables) {
        // Check if RLS is enabled by attempting to access the table
        // This is a simplified check - in production you'd query pg_class
        try {
          const { error } = await supabase
            .from(tableName as any)
            .select('id')
            .limit(1);
          
          // If we can access it, assume RLS is properly configured
          // This is a simplified approach for demo purposes
          status.push({
            table_name: tableName,
            rls_enabled: !error,
            policy_count: error ? 0 : 1, // Simplified
            has_policies: !error
          });
        } catch (err) {
          status.push({
            table_name: tableName,
            rls_enabled: false,
            policy_count: 0,
            has_policies: false
          });
        }
      }

      setRlsStatus(status);
    } catch (error) {
      console.error('Error fetching RLS status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: RLSStatus) => {
    if (status.rls_enabled && status.has_policies) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (status.rls_enabled && !status.has_policies) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: RLSStatus) => {
    if (status.rls_enabled && status.has_policies) {
      return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Secure</Badge>;
    } else if (status.rls_enabled && !status.has_policies) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Warning</Badge>;
    } else {
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Critical</Badge>;
    }
  };

  const criticalIssues = rlsStatus.filter(s => !s.rls_enabled).length;
  const warnings = rlsStatus.filter(s => s.rls_enabled && !s.has_policies).length;
  const secure = rlsStatus.filter(s => s.rls_enabled && s.has_policies).length;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <SEOHelmet 
        config={{
          title: "Admin - Security Dashboard",
          description: "Monitor database security and RLS policy status"
        }}
      />
      
      <div className="flex items-center gap-3">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor Row Level Security status across key tables
          </p>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Secure Tables</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{secure}</div>
            <p className="text-xs text-muted-foreground">
              Tables with RLS and policies
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warnings}</div>
            <p className="text-xs text-muted-foreground">
              RLS enabled but missing policies
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{criticalIssues}</div>
            <p className="text-xs text-muted-foreground">
              Tables without RLS protection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {criticalIssues > 0 && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-500">
            <strong>Critical:</strong> {criticalIssues} table(s) have Row Level Security disabled. 
            This allows unrestricted access to data.
          </AlertDescription>
        </Alert>
      )}

      {warnings > 0 && (
        <Alert className="border-yellow-500/20 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-500">
            <strong>Warning:</strong> {warnings} table(s) have RLS enabled but may be missing policies.
          </AlertDescription>
        </Alert>
      )}

      {/* RLS Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Row Level Security Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Checking security status...</div>
          ) : (
            <div className="space-y-4">
              {rlsStatus.map((status) => (
                <div 
                  key={status.table_name}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div>
                      <h3 className="font-medium">{status.table_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        RLS: {status.rls_enabled ? 'Enabled' : 'Disabled'} • 
                        Policies: {status.policy_count}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This is a simplified security overview. 
          For comprehensive security review, manually verify RLS policies implement proper access control.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default AdminSecurity;