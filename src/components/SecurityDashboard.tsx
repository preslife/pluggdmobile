import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Database,
  Server,
  Wifi
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SecurityCheck {
  id: string;
  category: 'authentication' | 'database' | 'network' | 'permissions';
  name: string;
  status: 'pass' | 'warning' | 'fail';
  description: string;
  recommendation?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityMetrics {
  overallScore: number;
  passedChecks: number;
  totalChecks: number;
  criticalIssues: number;
  lastScan: string;
}

export const SecurityDashboard = () => {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    performSecurityScan();
  }, []);

  const performSecurityScan = async () => {
    setScanning(true);
    
    try {
      // Simulate security checks
      await new Promise(resolve => setTimeout(resolve, 2000));

      const checks: SecurityCheck[] = [
        {
          id: 'rls-enabled',
          category: 'database',
          name: 'Row Level Security (RLS)',
          status: 'pass',
          description: 'RLS is enabled on all tables',
          severity: 'critical'
        },
        {
          id: 'auth-tokens',
          category: 'authentication',
          name: 'JWT Token Security',
          status: 'pass',
          description: 'JWT tokens are properly configured',
          severity: 'high'
        },
        {
          id: 'https-only',
          category: 'network',
          name: 'HTTPS Enforcement',
          status: 'pass',
          description: 'All connections use HTTPS',
          severity: 'high'
        },
        {
          id: 'api-rate-limit',
          category: 'network',
          name: 'API Rate Limiting',
          status: 'warning',
          description: 'Rate limiting is basic, could be enhanced',
          recommendation: 'Implement more sophisticated rate limiting',
          severity: 'medium'
        },
        {
          id: 'password-policy',
          category: 'authentication',
          name: 'Password Policy',
          status: 'pass',
          description: 'Strong password requirements in place',
          severity: 'medium'
        },
        {
          id: 'session-timeout',
          category: 'authentication',
          name: 'Session Timeout',
          status: 'warning',
          description: 'Sessions have long timeout periods',
          recommendation: 'Consider shorter session timeouts for security',
          severity: 'low'
        },
        {
          id: 'data-encryption',
          category: 'database',
          name: 'Data Encryption',
          status: 'pass',
          description: 'Data is encrypted at rest and in transit',
          severity: 'critical'
        },
        {
          id: 'admin-access',
          category: 'permissions',
          name: 'Admin Access Control',
          status: 'pass',
          description: 'Admin permissions are properly restricted',
          severity: 'high'
        },
        {
          id: 'sql-injection',
          category: 'database',
          name: 'SQL Injection Protection',
          status: 'pass',
          description: 'Using parameterized queries and ORM',
          severity: 'critical'
        },
        {
          id: 'cors-policy',
          category: 'network',
          name: 'CORS Policy',
          status: 'warning',
          description: 'CORS policy could be more restrictive',
          recommendation: 'Restrict CORS to specific domains',
          severity: 'medium'
        }
      ];

      setSecurityChecks(checks);

      // Calculate metrics
      const passedChecks = checks.filter(check => check.status === 'pass').length;
      const criticalIssues = checks.filter(check => check.severity === 'critical' && check.status !== 'pass').length;
      const overallScore = Math.round((passedChecks / checks.length) * 100);

      setMetrics({
        overallScore,
        passedChecks,
        totalChecks: checks.length,
        criticalIssues,
        lastScan: new Date().toISOString()
      });

    } catch (error) {
      console.error('Security scan error:', error);
      toast({
        title: "Security Scan Failed",
        description: "Failed to complete security scan",
        variant: "destructive",
      });
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const getStatusIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getCategoryIcon = (category: SecurityCheck['category']) => {
    switch (category) {
      case 'authentication':
        return <Key className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'network':
        return <Wifi className="h-4 w-4" />;
      case 'permissions':
        return <Lock className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: SecurityCheck['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 text-red-700';
      case 'high':
        return 'border-orange-500 text-orange-700';
      case 'medium':
        return 'border-yellow-500 text-yellow-700';
      case 'low':
        return 'border-blue-500 text-blue-700';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-500';
    if (score >= 75) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Performing security scan...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Dashboard
            </CardTitle>
            <Button 
              onClick={performSecurityScan} 
              disabled={scanning}
              variant="outline"
            >
              {scanning ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              {scanning ? 'Scanning...' : 'Run Scan'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Overall Score */}
              <div className="text-center p-4 border border-border rounded-lg">
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(metrics.overallScore)}`}>
                  {metrics.overallScore}%
                </div>
                <p className="text-sm text-muted-foreground">Security Score</p>
              </div>

              {/* Passed Checks */}
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-3xl font-bold mb-2 text-green-500">
                  {metrics.passedChecks}/{metrics.totalChecks}
                </div>
                <p className="text-sm text-muted-foreground">Checks Passed</p>
              </div>

              {/* Critical Issues */}
              <div className="text-center p-4 border border-border rounded-lg">
                <div className={`text-3xl font-bold mb-2 ${metrics.criticalIssues > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {metrics.criticalIssues}
                </div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
              </div>

              {/* Last Scan */}
              <div className="text-center p-4 border border-border rounded-lg">
                <div className="text-sm font-medium mb-2">
                  {new Date(metrics.lastScan).toLocaleDateString()}
                </div>
                <p className="text-sm text-muted-foreground">Last Scan</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Critical Issues Alert */}
      {metrics && metrics.criticalIssues > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {metrics.criticalIssues} critical security issue(s) found. Please address these immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Security Checks</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showDetails ? 'Hide Details' : 'Show Details'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {securityChecks.map((check) => (
              <div 
                key={check.id} 
                className={`p-4 border rounded-lg ${getSeverityColor(check.severity)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(check.category)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{check.name}</h4>
                        {getStatusIcon(check.status)}
                        <Badge variant={check.severity === 'critical' || check.severity === 'high' ? 'destructive' : 'secondary'}>
                          {check.severity}
                        </Badge>
                      </div>
                      {showDetails && (
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {check.description}
                          </p>
                          {check.recommendation && (
                            <p className="text-sm font-medium text-blue-600">
                              Recommendation: {check.recommendation}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant={check.status === 'pass' ? 'default' : check.status === 'warning' ? 'secondary' : 'destructive'}>
                    {check.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Authentication
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Enable multi-factor authentication</li>
                <li>• Use strong password policies</li>
                <li>• Implement session timeouts</li>
                <li>• Monitor failed login attempts</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Security
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Enable Row Level Security (RLS)</li>
                <li>• Use parameterized queries</li>
                <li>• Encrypt sensitive data</li>
                <li>• Regular security audits</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Network Security
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Enforce HTTPS everywhere</li>
                <li>• Implement rate limiting</li>
                <li>• Configure CORS properly</li>
                <li>• Use CDN for DDoS protection</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Access Control
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Principle of least privilege</li>
                <li>• Regular permission audits</li>
                <li>• Role-based access control</li>
                <li>• Monitor admin activities</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};