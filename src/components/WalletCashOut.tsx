import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet, formatCredits, creditsToGBP } from "@/hooks/useWallet";
import { useAuth } from "@/hooks/useAuth";
import { Download, AlertTriangle, CheckCircle } from "lucide-react";

export const WalletCashOut = () => {
  const { balance, cashOutCredits } = useWallet();
  const { user } = useAuth();
  const [cashOutAmount, setCashOutAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCashOut = async () => {
    if (!cashOutAmount || parseInt(cashOutAmount) < 1000) return;
    
    setLoading(true);
    try {
      const result = await cashOutCredits(parseInt(cashOutAmount));
      if (result.success) {
        setCashOutAmount("");
      }
    } finally {
      setLoading(false);
    }
  };

  const minimumCashOut = 1000; // £10 minimum
  const isEligible = balance.available_credits >= minimumCashOut;
  const enteredAmount = parseInt(cashOutAmount) || 0;
  
  // Calculate commission (example: 15% for free tier, 10% for creator, 5% for pro)
  const commissionRate = 0.15; // This should come from user tier
  const grossAmount = creditsToGBP(enteredAmount);
  const commissionAmount = grossAmount * commissionRate;
  const netAmount = grossAmount - commissionAmount;

  return (
    <div className="space-y-6">
      {/* Eligibility Check */}
      {!isEligible && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need at least {formatCredits(minimumCashOut)} credits (£{minimumCashOut / 100}) to cash out. 
            Your current available balance is {formatCredits(balance.available_credits)} credits.
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <p className="font-medium text-green-800">Stripe Connect Account</p>
                <p className="text-sm text-green-600">Connected and verified</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            
            <p className="text-sm text-muted-foreground">
              Cash-outs are processed within 3-5 business days to your connected bank account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cash Out Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Cash Out Credits
          </CardTitle>
          <CardDescription>
            Convert your credits to GBP and transfer to your bank account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Amount to cash out</label>
            <Input
              type="number"
              placeholder={`Minimum ${formatCredits(minimumCashOut)} credits`}
              value={cashOutAmount}
              onChange={(e) => setCashOutAmount(e.target.value)}
              min={minimumCashOut}
              max={balance.available_credits}
              disabled={!isEligible}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Available: {formatCredits(balance.available_credits)} credits
            </p>
          </div>

          {enteredAmount >= minimumCashOut && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-medium">Cash-out Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Credits to convert:</span>
                  <span>{formatCredits(enteredAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gross amount:</span>
                  <span>£{grossAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Platform commission ({(commissionRate * 100).toFixed(0)}%):</span>
                  <span>-£{commissionAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-1">
                  <span>Net amount:</span>
                  <span>£{netAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCashOut}
            disabled={loading || !isEligible || enteredAmount < minimumCashOut || enteredAmount > balance.available_credits}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            {loading ? "Processing..." : `Cash Out £${netAmount.toFixed(2)}`}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Minimum cash-out: £{minimumCashOut / 100}</p>
            <p>• Processing time: 3-5 business days</p>
            <p>• Commission rates vary by subscription tier</p>
            <p>• You'll receive an email confirmation once processed</p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Cash-outs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cash-outs</CardTitle>
          <CardDescription>
            Your cash-out history and status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Cash-out</p>
                <p className="text-sm text-muted-foreground">Completed • Dec 15, 2024</p>
              </div>
              <div className="text-right">
                <p className="font-medium">£47.50</p>
                <p className="text-sm text-green-600">Paid</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Cash-out</p>
                <p className="text-sm text-muted-foreground">Processing • Dec 18, 2024</p>
              </div>
              <div className="text-right">
                <p className="font-medium">£95.00</p>
                <p className="text-sm text-yellow-600">Pending</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};